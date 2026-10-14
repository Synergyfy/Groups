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
  X,
  ExternalLink,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";
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

  // Location state (persisted to participant session)
  const initialSession = readParticipantSession();
  const consumerId = initialSession?.role === "consumer" ? (initialSession.accountId || "cons-john") : "cons-john";
  const consumerName = (initialSession?.role === "consumer" && initialSession.name) ? initialSession.name : "John Doe";

  const [postcode, setPostcode] = useState(initialSession?.postcode || "B1 2AB");
  const [city, setCity] = useState(
    initialSession?.city || inferCityFromPostcode(initialSession?.postcode || "B1 2AB") || "Birmingham"
  );
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempPostcode, setTempPostcode] = useState(postcode);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "local" | "events" | "national">("all");
  const [justJoinedGroupId, setJustJoinedGroupId] = useState<string | null>(null);
  const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPostcode = tempPostcode.trim().toUpperCase() || "B1 2AB";
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
      id: consumerId,
      name: consumerName,
      accountType: "consumer",
      city,
      postcode,
    };
  }, [consumerId, consumerName, city, postcode]);

  // Evaluate all groups against eligibility
  const evaluatedGroups = useMemo(() => {
    return state.groups.map((group) =>
      evaluateGroupEligibility(group, userProfile, state.invitations)
    );
  }, [state.groups, userProfile, state.invitations]);

  // Filter and search
  const filteredResults = useMemo(() => {
    return evaluatedGroups.filter((res) => {
      // Must be eligible
      if (!res.isEligible) return false;

      // Search match
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        res.group.name.toLowerCase().includes(query) ||
        res.group.purpose.toLowerCase().includes(query) ||
        res.group.type.toLowerCase().includes(query) ||
        (res.group.location?.city && res.group.location.city.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filter tabs
      if (selectedFilter === "local") {
        return Boolean(res.group.location?.city && res.group.location.city.toLowerCase() === city.toLowerCase());
      }
      if (selectedFilter === "events") {
        return (
          res.group.type.toLowerCase().includes("event") ||
          res.group.type.toLowerCase().includes("expo") ||
          res.group.name.toLowerCase().includes("event") ||
          res.group.name.toLowerCase().includes("expo")
        );
      }
      if (selectedFilter === "national") {
        return !res.group.location?.city || res.group.type === "National Community";
      }

      return true;
    });
  }, [evaluatedGroups, searchQuery, selectedFilter, city]);

  const handleJoinGroup = (result: EligibilityResult) => {
    dispatch({
      type: "group/join",
      groupId: result.group.id,
      actor: { id: consumerId, name: consumerName },
    });
    setJustJoinedGroupId(result.group.id);
  };

  const handleRequestAccess = (result: EligibilityResult) => {
    dispatch({
      type: "group/join",
      groupId: result.group.id,
      actor: { id: consumerId, name: consumerName },
    });
    setRequestedGroupId(result.group.id);
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Page Title & Location Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-gold-500/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold">Smart Discovery</Badge>
            <span className="text-xs text-slate-400">&bull; Local &amp; National</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Discover Groups</h1>
          <p className="mt-1 text-xs text-slate-300">
            Groups available for you to join based on your location and community eligibility.
          </p>
        </div>

        {/* Location selector widget */}
        <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-ink-950/70 p-3 sm:min-w-[220px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Your Location</span>
            {!isEditingLocation ? (
              <button
                type="button"
                onClick={() => {
                  setTempPostcode(postcode);
                  setIsEditingLocation(true);
                }}
                className="text-[11px] font-semibold text-gold-400 hover:text-gold-300"
              >
                Change
              </button>
            ) : null}
          </div>

          {!isEditingLocation ? (
            <div className="flex items-center gap-2 pt-0.5">
              <MapPin className="size-4 text-gold-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">{city}</p>
                <p className="text-[10px] text-slate-400">{postcode}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveLocation} className="mt-1 flex flex-col gap-2">
              <input
                type="text"
                value={tempPostcode}
                onChange={(e) => setTempPostcode(e.target.value)}
                placeholder="e.g. B1 1AA, M1 1AE, SW1A 1AA"
                className="rounded-lg border border-gold-500/40 bg-ink-900 px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-gold-500"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gold-500 px-2.5 py-1 text-[10px] font-bold text-ink-950 hover:bg-gold-400"
                >
                  Save Postcode
                </button>
              </div>
            </form>
          )}
        </div>
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
              to={`/consumer/groups/${justJoinedGroupId}`}
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
            All Eligible ({evaluatedGroups.filter((r) => r.isEligible).length})
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
            Local to {city}
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
            Events &amp; Expos
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

      {/* Group Cards Grid */}
      {filteredResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <Compass className="mx-auto size-10 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold text-white">No groups found</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            {searchQuery
              ? `No eligible groups match "${searchQuery}". Try a different keyword.`
              : "Try switching the filter or updating your postcode to explore groups in other areas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredResults.map((result) => {
            const { group, matchReasons, status } = result;
            const isAlreadyMember = group.memberIds.includes(consumerId);
            const isInvited = status === "invited";
            const hasRequested = requestedGroupId === group.id;

            return (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-5 transition-all hover:border-gold-500/30 hover:bg-ink-900/80"
              >
                <div>
                  {/* Top Badges and Location */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gold">{group.type}</Badge>
                        {group.location?.city ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="size-3 text-gold-400" />
                            {group.location.city}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">National</span>
                        )}
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Eligible
                        </span>
                      </div>

                      <h2 className="mt-2 text-base font-bold text-white">
                        {group.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        By <span className="text-slate-300">{group.ownerName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Purpose */}
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {group.purpose}
                  </p>

                  {/* Why eligible notice */}
                  <div className="mt-3 rounded-lg border border-gold-500/20 bg-gold-500/5 px-2.5 py-1.5 text-[11px] text-gold-300">
                    <span className="font-semibold text-gold-200">Why you match:</span> {matchReasons[0] || "Open community group"}
                  </div>
                </div>

                {/* Footer stats & action */}
                <div className="mt-4 border-t border-white/10 pt-3">
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
                          to={`/consumer/groups/${group.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/20"
                        >
                          Open <ExternalLink className="size-3" />
                        </Link>
                      ) : isInvited ? (
                        <Link
                          to="/consumer/invitations"
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
