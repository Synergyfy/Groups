import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Search,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { getParticipantIdentity } from "./participantIdentity";
import {
  evaluateGroupEligibility,
  inferCityFromPostcode,
  type UserEligibilityProfile,
  type EligibilityResult,
} from "../groups/groupEligibility";
import { readParticipantSession, writeAuthSession } from "../../app/authSession";

export default function ConsumerDiscoverGroupsPage() {
  useEffect(() => {
    document.title = "CHS Groups | Discover Groups";
  }, []);

  const state = useAppState();
  const { dispatch } = useAppStore();
  const identity = getParticipantIdentity();

  // Location state (persisted to participant session)
  const initialSession = readParticipantSession();
  const [postcode, setPostcode] = useState(initialSession?.postcode || "B1 1AA");
  const [city, setCity] = useState(
    initialSession?.city || inferCityFromPostcode(initialSession?.postcode || "B1 1AA") || "Birmingham"
  );
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempPostcode, setTempPostcode] = useState(postcode);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "local" | "events" | "national">("all");
  const [justJoinedGroupId, setJustJoinedGroupId] = useState<string | null>(null);
  const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPostcode = tempPostcode.trim().toUpperCase() || "B1 1AA";
    const inferred = inferCityFromPostcode(cleanPostcode) || "Birmingham";
    setPostcode(cleanPostcode);
    setCity(inferred);
    setIsEditingLocation(false);

    // Save to session storage
    if (initialSession) {
      writeAuthSession({
        ...initialSession,
        postcode: cleanPostcode,
        city: inferred,
      });
    }
  };

  const userProfile: UserEligibilityProfile = useMemo(() => {
    return {
      id: identity.id,
      name: identity.name,
      accountType: "consumer",
      city,
      postcode,
    };
  }, [identity.id, identity.name, city, postcode]);

  // Evaluate all groups against consumer eligibility
  const evaluatedGroups = useMemo(() => {
    return state.groups
      .map((group) => evaluateGroupEligibility(group, userProfile, state.invitations))
      .filter((res) => {
        // Exclude suspended / closed groups
        if (res.status === "unavailable") return false;
        // Exclude strictly business-only groups
        if (!res.isEligible && res.audienceLabel === "Business Owners") return false;
        return true;
      });
  }, [state.groups, state.invitations, userProfile]);

  const filteredResults = useMemo(() => {
    return evaluatedGroups.filter((res) => {
      const g = res.group;
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.location?.city && g.location.city.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === "local") {
        return (
          g.location?.city?.toLowerCase() === city.toLowerCase() ||
          res.matchReasons.some((r) => r.toLowerCase().includes("local") || r.toLowerCase().includes("area"))
        );
      }
      if (selectedFilter === "events") {
        return g.type === "Event / Expo" || (g.type as string) === "Seasonal";
      }
      if (selectedFilter === "national") {
        return g.type === "National Community" || !g.location?.city || g.location.city.toLowerCase().includes("uk");
      }
      return true;
    });
  }, [evaluatedGroups, searchQuery, selectedFilter, city]);

  const handleJoinGroup = (result: EligibilityResult) => {
    dispatch({
      type: "group/join",
      groupId: result.group.id,
      actor: { id: identity.id, name: identity.name },
    });
    setJustJoinedGroupId(result.group.id);
  };

  const handleRequestAccess = (result: EligibilityResult) => {
    setRequestedGroupId(result.group.id);
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Discover Groups</h1>
          <p className="mt-1 text-xs text-slate-400">
            Explore consumer-friendly groups, local clubs, and nationwide communities eligible for you.
          </p>
        </div>
      </div>

      {/* Location Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/30 bg-gold-500/[0.07] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400">
            <MapPin className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-white">
                Browsing near <span className="text-gold-300">{city}</span>
              </p>
              <Badge variant="gold">{postcode}</Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Groups matching your local region and national communities
            </p>
          </div>
        </div>

        {isEditingLocation ? (
          <form onSubmit={handleSaveLocation} className="flex items-center gap-2">
            <input
              type="text"
              value={tempPostcode}
              onChange={(e) => setTempPostcode(e.target.value)}
              placeholder="e.g. M1 1AD, SW1A 1AA"
              className="w-36 rounded-lg border border-white/20 bg-ink-950 px-2.5 py-1.5 text-xs text-white uppercase placeholder-slate-500 outline-none focus:border-gold-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-gold-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditingLocation(false)}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempPostcode(postcode);
              setIsEditingLocation(true);
            }}
            className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/20"
          >
            Change Location
          </button>
        )}
      </div>

      {/* Success Banner if just joined */}
      {justJoinedGroupId && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-200">
                You have joined the group!
              </p>
              <p className="text-[11px] text-emerald-300/80">
                You can now view activities, participate, and check updates anytime.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/participant/groups/${justJoinedGroupId}`}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
            >
              Open Group <ArrowRight className="size-3" />
            </Link>
            <button
              type="button"
              onClick={() => setJustJoinedGroupId(null)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search eligible groups by keyword, topic, or area..."
            className="w-full rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-gold-500/50 focus:bg-ink-900"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedFilter === "all"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            All Eligible ({evaluatedGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("local")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedFilter === "local"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            Local ({city})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("events")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedFilter === "events"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            Events &amp; Seasonal
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("national")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedFilter === "national"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            National
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {filteredResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <Compass className="mx-auto size-10 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold text-white">No groups found</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            {searchQuery
              ? `No eligible groups match "${searchQuery}".`
              : "Try switching to 'All Eligible' or changing your postcode location."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedFilter("all");
            }}
            className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredResults.map((result) => {
            const group = result.group;
            const isAlreadyMember = result.status === "joined";
            const isInvited = result.status === "invited";
            const hasRequested = requestedGroupId === group.id || result.status === "pending_request";

            return (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-5 transition-all hover:border-gold-500/30 hover:bg-ink-900/80"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gold">{group.type}</Badge>
                        {group.location?.city && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="size-3 text-gold-400" />
                            {group.location.city}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {result.audienceLabel}
                        </span>
                      </div>
                      <h2 className="mt-2 text-base font-bold text-white">
                        {group.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Host: <span className="text-slate-300">{group.ownerName}</span>
                      </p>
                    </div>

                    {isAlreadyMember && (
                      <Badge variant="success">Joined</Badge>
                    )}
                    {isInvited && (
                      <Badge variant="gold">Invited</Badge>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {group.purpose}
                  </p>

                  {/* Match Reason Pills */}
                  {result.matchReasons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.matchReasons.map((reason, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-gold-300"
                        >
                          <Check className="size-2.5 text-gold-400" />
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-slate-500" />
                        {group.memberIds.length} members
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="size-3.5 text-gold-400" />
                        {group.pricing === "paid" ? "Paid" : "Free"}
                      </span>
                    </div>

                    <div>
                      {isAlreadyMember ? (
                        <Link
                          to={`/participant/groups/${group.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/20"
                        >
                          Open <ExternalLink className="size-3" />
                        </Link>
                      ) : isInvited ? (
                        <Link
                          to="/participant/invitations"
                          className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                        >
                          Respond to Invite <ArrowRight className="size-3" />
                        </Link>
                      ) : hasRequested ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400">
                          Request Pending
                        </span>
                      ) : group.accessType === "request" ? (
                        <button
                          type="button"
                          onClick={() => handleRequestAccess(result)}
                          className="cursor-pointer rounded-xl border border-gold-500/40 bg-gold-500/10 px-3.5 py-1.5 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-500/20"
                        >
                          Request Access
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinGroup(result)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                        >
                          Join Group <ArrowRight className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
