import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Users,
  ChevronRight,
  Inbox,
  Sparkles,
  Compass,
  MapPin,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import {
  selectMyGroups,
  useAppState,
  useCircles,
  useIncomingInvitations,
} from "../../store/selectors";
import { useAppStore } from "../../store/context";
import {
  evaluateGroupEligibility,
  inferCityFromPostcode,
  type UserEligibilityProfile,
} from "../groups/groupEligibility";
import { readParticipantSession } from "../../app/authSession";

export default function ConsumerDashboardPage() {
  useEffect(() => {
    document.title = "CHS Groups | Consumer Home";
  }, []);

  const state = useAppState();
  const { dispatch } = useAppStore();
  const session = readParticipantSession();

  const consumerId = session?.role === "consumer" ? (session.accountId || "cons-john") : "cons-john";
  const consumerName = session?.role === "consumer" ? session.name : "John Doe";
  const postcode = session?.postcode || "B1 2AB";
  const city = session?.city || inferCityFromPostcode(postcode) || "Birmingham";

  const circles = useCircles();
  const invitations = useIncomingInvitations(consumerId);

  const userProfile: UserEligibilityProfile = useMemo(() => {
    return {
      id: consumerId,
      name: consumerName ?? "Consumer",
      accountType: "consumer",
      city,
      postcode,
    };
  }, [consumerId, consumerName, city, postcode]);

  const myCircles = circles.filter((circle) => circle.memberIds.includes(consumerId));
  const myGroups = selectMyGroups(state, consumerId).filter(
    (group) => group.ownerId !== "system" || group.memberIds.includes(consumerId)
  );

  const pendingInvites = invitations.filter((inv) => inv.kind === "invite" && inv.status === "pending");
  const pendingCircles = pendingInvites.filter((inv) => inv.circleId);
  const pendingGroups = pendingInvites.length - pendingCircles.length;

  const recommendedGroups = useMemo(() => {
    return state.groups
      .map((g) => evaluateGroupEligibility(g, userProfile, state.invitations))
      .filter((res) => res.isEligible && res.status !== "joined" && res.status !== "unavailable")
      .slice(0, 3);
  }, [state.groups, state.invitations, userProfile]);

  const handleQuickJoin = (groupId: string) => {
    dispatch({
      type: "group/join",
      groupId,
      actor: { id: consumerId, name: consumerName ?? "Consumer" },
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Welcome & Profile Headline */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-gold-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="gold">Consumer Community</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="size-3.5 text-gold-400" /> {city} ({postcode})
            </span>
          </div>
          <Link
            to="/consumer/account"
            className="text-[11px] font-medium text-slate-400 hover:text-white"
          >
            Edit Profile &rarr;
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Welcome back, {consumerName}
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            Your personal hub to connect with local businesses, discover community groups, and participate in events.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
          <Link
            to="/consumer/my-groups"
            className="flex flex-col rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10"
          >
            <span className="text-base font-bold text-white">{myGroups.length}</span>
            <span className="text-[11px] text-slate-400">Joined Groups</span>
          </Link>
          <Link
            to="/consumer/invitations"
            className="flex flex-col rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10"
          >
            <span className={`text-base font-bold ${pendingInvites.length > 0 ? "text-gold-300" : "text-white"}`}>
              {pendingInvites.length}
            </span>
            <span className="text-[11px] text-slate-400">Pending Invites</span>
          </Link>
          <Link
            to="/consumer/discover"
            className="flex flex-col rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10"
          >
            <span className="text-base font-bold text-white">{recommendedGroups.length}+</span>
            <span className="text-[11px] text-slate-400">Explore Groups</span>
          </Link>
        </div>
      </div>

      {/* Pending Invitations Alert */}
      {pendingInvites.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/[0.08] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-gold-300">
              <Inbox className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gold-200">
                {pendingInvites.length} invitation{pendingInvites.length === 1 ? "" : "s"} waiting for your response
              </p>
              <p className="text-xs text-gold-300/80">
                {pendingCircles.length > 0 && `${pendingCircles.length} circle${pendingCircles.length === 1 ? "" : "s"}`}
                {pendingCircles.length > 0 && pendingGroups > 0 && " · "}
                {pendingGroups > 0 && `${pendingGroups} group${pendingGroups === 1 ? "" : "s"}`} — review and accept to join.
              </p>
            </div>
            <Link
              to="/consumer/invitations"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
            >
              Review <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <ul className="flex flex-col gap-1.5 border-t border-gold-500/20 pt-2.5">
            {pendingInvites.slice(0, 3).map((invitation) => {
              const circle = invitation.circleId
                ? circles.find((entry) => entry.id === invitation.circleId)
                : undefined;
              const group = invitation.groupId
                ? state.groups.find((g) => g.id === invitation.groupId)
                : undefined;
              return (
                <li key={invitation.id}>
                  <Link
                    to="/consumer/invitations"
                    className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <span className="min-w-0 truncate text-xs text-slate-300">
                      {circle?.config.name ?? group?.name ?? "Special Invitation"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={invitation.circleId ? "gold" : "info"}>
                        {invitation.circleId ? "Circle" : "Group"}
                      </Badge>
                      <ChevronRight className="size-3 text-slate-500" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): My Joined Groups */}
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">My Groups</h2>
              <p className="text-xs text-slate-400">
                Groups you belong to as a participating member
              </p>
            </div>
            <Link
              to="/consumer/my-groups"
              className="text-xs font-semibold text-gold-400 hover:text-gold-300"
            >
              View all ({myGroups.length}) &rarr;
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 text-center">
              <Users className="mx-auto size-8 text-slate-500" />
              <p className="mt-2 text-sm font-semibold text-white">No joined groups yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Explore local community and interest groups to get connected.
              </p>
              <Link
                to="/consumer/discover"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gold-500/20 px-3.5 py-2 text-xs font-semibold text-gold-300 hover:bg-gold-500/30"
              >
                Discover Groups <ChevronRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myGroups.slice(0, 4).map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-900/70 p-4 transition-all hover:border-gold-500/30 hover:bg-ink-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="info">{group.type}</Badge>
                      <span className="text-[11px] text-slate-400">
                        {group.memberIds.length} members
                      </span>
                    </div>
                    <Link
                      to={`/consumer/groups/${group.id}`}
                      className="mt-2 block font-semibold text-white hover:text-gold-300"
                    >
                      {group.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {group.purpose}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                    <span className="text-slate-500">
                      {group.location?.city || "National"}
                    </span>
                    <Link
                      to={`/consumer/groups/${group.id}`}
                      className="font-medium text-gold-400 hover:text-gold-300"
                    >
                      Open group &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Groups to Discover */}
          <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-400" />
                <h3 className="text-sm font-bold text-white">Recommended for You</h3>
              </div>
              <Link
                to="/consumer/discover"
                className="text-xs font-medium text-slate-400 hover:text-white"
              >
                See all recommendations &rarr;
              </Link>
            </div>

            {recommendedGroups.length === 0 ? (
              <p className="text-xs text-slate-400">No new recommendations available at the moment.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recommendedGroups.map(({ group, matchReasons }) => (
                  <div
                    key={group.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-white">{group.name}</p>
                        <Badge variant="neutral">{group.type}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">{matchReasons[0]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/consumer/groups/${group.id}`}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleQuickJoin(group.id)}
                        className="cursor-pointer rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column (1 col): Community Circles & Quick Actions */}
        <aside className="flex flex-col gap-4">
          {/* Central Circle & Community Hub Card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gold-500/20 bg-gradient-to-b from-gold-500/[0.08] to-ink-900/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                Central Circle
              </span>
              <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                Connected
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Community Central Circle</p>
              <p className="mt-1 text-xs text-slate-300">
                Your direct connection to updates, announcements, and local activities from businesses in your area.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-gold-500/15 pt-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Active circles</span>
                <span className="font-semibold text-white">{myCircles.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Community Area</span>
                <span className="font-semibold text-white">{city}</span>
              </div>
            </div>
          </div>

          {/* Quick links & Discover card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <h3 className="text-sm font-bold text-white">Explore &amp; Discover</h3>
            <p className="text-xs text-slate-400">
              Browse groups by area, interests, and public community circles.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/consumer/discover"
                className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                <span className="flex items-center gap-2.5">
                  <Compass className="size-4 text-gold-400" /> Discover Local Groups
                </span>
                <ChevronRight className="size-3.5 text-slate-500" />
              </Link>
              <Link
                to="/consumer/invitations"
                className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                <span className="flex items-center gap-2.5">
                  <Inbox className="size-4 text-gold-400" /> Group Invitations
                </span>
                <ChevronRight className="size-3.5 text-slate-500" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
