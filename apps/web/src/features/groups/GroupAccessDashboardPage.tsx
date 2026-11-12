import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Compass,
  Edit2,
  Inbox,
  Info,
  LogOut,
  MapPin,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import ChsLogo from "../../components/ui/ChsLogo";

import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import { clearAuthSession, readAuthSession, writeAuthSession } from "../../app/authSession";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { memberCountOf } from "./groupUtils";
import {
  evaluateGroupEligibility,
  groupAudienceOf,
  inferCityFromPostcode,
  type UserEligibilityProfile,
} from "./groupEligibility";
import type { Group, Invitation } from "../../domain/types";

export default function GroupAccessDashboardPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Group Access Dashboard";
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationIdParam = searchParams.get("invitationId");

  const state = useAppState();
  const { dispatch } = useAppStore();

  const [session, setSession] = useState(() => readAuthSession());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Selected Invitation for Detail Modal
  const [selectedInvite, setSelectedInvite] = useState<{
    invitation: Invitation;
    group: Group;
  } | null>(null);

  // Selected Group for Detail Modal (from Available Near You)
  const [selectedExploreGroup, setSelectedExploreGroup] = useState<Group | null>(null);

  // Postcode editing inline modal or toggle
  const [editingPostcode, setEditingPostcode] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState(session?.postcode || "");

  // Notification menu toggle
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // If session is missing, default to a realistic consumer session so the prototype works immediately
  const activeUser: UserEligibilityProfile = useMemo(() => {
    if (session?.authenticated) {
      return {
        id: session.accountId || session.email || "demo-user",
        name: session.name || "Member",
        accountType: session.role === "business" ? "business" : "consumer",
        city: session.city || inferCityFromPostcode(session.postcode) || "Birmingham",
        postcode: session.postcode,
        sector: session.sector,
        businessName: session.businessName,
      };
    }
    return {
      id: "demo-user",
      name: "Guest Explorer",
      accountType: "consumer",
      city: "Birmingham",
      postcode: "B1 1AA",
    };
  }, [session]);

  // Read all invitations relevant to user
  const userInvitations = useMemo(() => {
    const list = state.invitations.filter(
      (inv) =>
        inv.inviteeId === activeUser.id ||
        (inv.inviteeEmail && inv.inviteeEmail === session?.email) ||
        (invitationIdParam && inv.id === invitationIdParam)
    );

    // If an invitationId was in URL and isn't yet in list, find it in state.invitations
    if (invitationIdParam && !list.some((i) => i.id === invitationIdParam)) {
      const match = state.invitations.find((i) => i.id === invitationIdParam);
      if (match) list.unshift(match);
      else {
        // Fallback for custom demo invitations (like inv-friends-family)
        list.unshift({
          id: invitationIdParam,
          groupId: "grp-friends-family",
          direction: "incoming",
          kind: "invite",
          inviteeId: activeUser.id,
          inviteeName: activeUser.name,
          invitedById: "biz-smith",
          invitedByName: "Smith Business Ltd",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }
    return list;
  }, [state.invitations, activeUser.id, activeUser.name, session?.email, invitationIdParam]);

  // Joined groups
  const myJoinedGroups = useMemo(() => {
    return state.groups.filter(
      (g) =>
        g.status !== "Closed" &&
        (g.memberIds.includes(activeUser.id) ||
          g.ownerId === activeUser.id ||
          (activeUser.id === "biz-smith" && g.memberIds.includes("biz-smith")))
    );
  }, [state.groups, activeUser.id]);

  // Evaluated eligible groups for "Groups Available Near You"
  const eligibleNearYou = useMemo(() => {
    return state.groups
      .map((g) => evaluateGroupEligibility(g, activeUser, userInvitations))
      .filter((res) => {
        // Exclude if already joined
        if (res.status === "joined") return false;
        // Exclude if suspended or closed
        if (res.status === "unavailable") return false;
        // Must be eligible
        return res.isEligible;
      });
  }, [state.groups, activeUser, userInvitations]);

  // Automatically open invitation if invitationId was in URL
  useEffect(() => {
    if (invitationIdParam) {
      const inv = userInvitations.find((i) => i.id === invitationIdParam);
      const grp = state.groups.find((g) => g.id === inv?.groupId) || {
        id: "grp-friends-family",
        name: "Friends & Family Circle",
        type: "Seasonal" as any,
        source: "user-created" as any,
        purpose: "Community updates, family news and shared local activities.",
        ownerId: "biz-smith",
        ownerName: "Smith Business Ltd",
        memberIds: ["biz-smith"],
        location: { city: "Birmingham" },
        status: "Active" as any,
        accessType: "open" as any,
        createdAt: "2026-09-01",
      };
      if (inv) {
        setSelectedInvite({ invitation: inv, group: grp });
      }
    }
  }, [invitationIdParam, userInvitations, state.groups]);

  // Joining an open group
  const handleJoinOpenGroup = (group: Group, invitation?: Invitation) => {
    dispatch({
      type: "group/join",
      groupId: group.id,
      actor: { id: activeUser.id, name: activeUser.name },
    });

    if (invitation) {
      dispatch({
        type: "invitation/respond",
        invitationId: invitation.id,
        accept: true,
        responder: { id: activeUser.id, name: activeUser.name },
      });
    }

    setFeedback(`Successfully joined "${group.name}"! It is now in My Groups.`);
    setSelectedInvite(null);
    setSelectedExploreGroup(null);
  };

  // Requesting to join an approval-based group
  const handleRequestToJoin = (group: Group) => {
    dispatch({
      type: "group/join",
      groupId: group.id,
      actor: { id: activeUser.id, name: activeUser.name },
    });
    setFeedback(`Request to join "${group.name}" submitted. Awaiting group owner approval.`);
    setSelectedInvite(null);
    setSelectedExploreGroup(null);
  };

  // Save updated postcode
  const handleSavePostcode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = postcodeInput.trim().toUpperCase();
    const city = inferCityFromPostcode(cleaned) || activeUser.city;

    if (session) {
      const updated = { ...session, postcode: cleaned, city };
      writeAuthSession(updated);
      setSession(updated);
    }
    setEditingPostcode(false);
    setFeedback(`Location updated to ${cleaned} (${city}). Group recommendations refreshed.`);
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100 pb-16">
      {/* =========================================================================
          DASHBOARD HEADER
         ========================================================================= */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <ChsLogo size="md" linkTo="/groups/access" />

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-ink-900 text-slate-300 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {userInvitations.filter((i) => i.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-ink-950">
                    {userInvitations.filter((i) => i.status === "pending").length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-white/10 bg-ink-900 p-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <p className="text-xs font-semibold text-white">Notifications</p>
                    <span className="text-[10px] text-gold-300">
                      {userInvitations.filter((i) => i.status === "pending").length} pending
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                    {userInvitations.filter((i) => i.status === "pending").length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-500">No new notifications.</p>
                    ) : (
                      userInvitations
                        .filter((i) => i.status === "pending")
                        .map((inv) => (
                          <div
                            key={inv.id}
                            className="rounded-lg bg-white/5 p-2 text-xs text-slate-300"
                          >
                            <p className="font-semibold text-white truncate">
                              Invitation from {inv.invitedByName}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Ready for your review in Section B
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 px-2.5 py-1.5 text-left hover:border-gold-500/30 transition-colors"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold-500/30 to-amber-600/30 text-xs font-bold text-gold-300">
                  {activeUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                    {activeUser.name}
                  </p>
                  <p className="text-[10px] text-gold-300/80 leading-tight capitalize">
                    {activeUser.accountType === "business" ? "Business Owner" : "Consumer"}
                  </p>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-white/10 bg-ink-900 p-2 shadow-2xl">
                  <div className="border-b border-white/10 px-2 py-1.5 mb-1">
                    <p className="text-xs font-semibold text-white">{activeUser.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{activeUser.accountType} Member</p>
                    <p className="text-[10px] text-slate-500 truncate">{session?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setEditingPostcode(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <MapPin className="size-3.5 text-gold-400" /> Update Postcode
                  </button>
                  <Link
                    to="/groups/central-circle"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <Sparkles className="size-3.5 text-gold-400" /> My Central Circle
                  </Link>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="size-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 sm:px-6">
        {/* Welcome Greeting Banner */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-ink-900 via-ink-900/90 to-amber-950/20 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gold-500/15 border border-gold-500/30 px-2.5 py-0.5 text-[10px] font-bold text-gold-300 uppercase">
                  CHS Group Access
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">
                  {activeUser.accountType === "business" ? "Business Owner Account" : "Consumer Member Account"}
                </span>
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">
                Welcome to CHS, {activeUser.name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-xs text-slate-300">
                Your community and groups — discover local networks, view your invitations, and connect with people near you.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/groups/central-circle"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/40 bg-gold-500/15 px-4 py-2.5 text-xs font-bold text-gold-300 hover:bg-gold-500/25 transition-all shadow-md shadow-gold-500/10"
              >
                <Sparkles className="size-3.5 text-gold-400" /> Open Central Circle
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION A: MY CENTRAL CIRCLE
           ========================================================================= */}
        <section aria-labelledby="central-circle-heading">
          <Card className="border border-gold-500/30 bg-gradient-to-br from-ink-900/95 via-ink-950 to-amber-950/20 shadow-xl overflow-hidden">
            <CardBody className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/10 border border-gold-500/30 text-gold-400 shadow-inner">
                    {/* Concentric orbital rings icon */}
                    <svg viewBox="0 0 32 32" className="size-8">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="#e6a92b" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx="16" cy="16" r="8" fill="none" stroke="#f2c15c" strokeWidth="1.5" />
                      <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="central-circle-heading" className="text-base font-bold text-white sm:text-lg">
                        My Central Circle
                      </h2>
                      <Badge variant="gold">Hub</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
                      Your starting point for discovering and accessing your groups. View your visual network connecting you to joined circles, pending invites, and local neighborhood relationships.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-emerald-400" /> {myJoinedGroups.length} active group{myJoinedGroups.length === 1 ? "" : "s"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-gold-400" /> {userInvitations.filter((i) => i.status === "pending").length} invitation waiting
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-sky-400" /> {eligibleNearYou.length} available near {activeUser.city}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    to="/groups/central-circle"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-xs font-bold text-ink-950 hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
                  >
                    Open Central Circle <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* =========================================================================
            SECTION B: INVITATIONS FOR YOU
           ========================================================================= */}
        <section aria-labelledby="invitations-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400">
                <Inbox className="size-4" />
              </div>
              <h2 id="invitations-heading" className="text-sm font-bold text-white">
                Invitations for You
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {userInvitations.length} total received
            </span>
          </div>

          {userInvitations.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-6 text-center">
              <Inbox className="mx-auto mb-2 size-6 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">No invitations waiting right now.</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                When a business or community organizer invites you, it will appear right here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {userInvitations.map((inv) => {
                const group = state.groups.find((g) => g.id === inv.groupId) || {
                  id: inv.groupId || "grp-custom",
                  name: "Community Group",
                  type: "Seasonal" as any,
                  source: "user-created" as any,
                  purpose: "Community connection and updates.",
                  ownerId: inv.invitedById,
                  ownerName: inv.invitedByName,
                  memberIds: [inv.invitedById],
                  status: "Active" as any,
                  accessType: "open" as any,
                  createdAt: "2026-09-10",
                } as Group;

                const isAlreadyJoined = group.memberIds.includes(activeUser.id);
                const statusBadge =
                  inv.status === "accepted" || isAlreadyJoined ? (
                    <Badge variant="success">Accepted</Badge>
                  ) : inv.status === "declined" ? (
                    <Badge variant="danger">Declined</Badge>
                  ) : inv.status === "cancelled" ? (
                    <Badge variant="muted">Expired</Badge>
                  ) : (
                    <Badge variant="gold">Pending</Badge>
                  );

                return (
                  <div
                    key={inv.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-900/70 p-4 transition-all hover:border-gold-500/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 font-bold text-xs text-gold-300 border border-gold-500/20">
                            {group.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white truncate">{group.name}</h3>
                            <p className="text-[10px] text-slate-400 truncate">
                              From: <strong className="text-slate-300">{inv.invitedByName}</strong>
                            </p>
                          </div>
                        </div>
                        {statusBadge}
                      </div>

                      <p className="mt-2.5 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {group.purpose}
                      </p>

                      <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-500">
                        {group.location?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-2.5 text-gold-400" /> {group.location.city}
                          </span>
                        )}
                        <span>·</span>
                        <span className="capitalize">{group.type}</span>
                        {group.pricing === "paid" && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400 font-semibold">£{group.contribution} fee</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 border-t border-white/5 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Received {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant={inv.status === "pending" && !isAlreadyJoined ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setSelectedInvite({ invitation: inv, group })}
                      >
                        {isAlreadyJoined || inv.status === "accepted" ? "Open Group" : "View Invitation"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION C: GROUPS AVAILABLE NEAR YOU
           ========================================================================= */}
        <section aria-labelledby="available-near-you-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                <Compass className="size-4" />
              </div>
              <div>
                <h2 id="available-near-you-heading" className="text-sm font-bold text-white">
                  Groups Available Near You
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="size-3 text-gold-400" />
              <span>Location: <strong className="text-white">{activeUser.postcode || activeUser.city}</strong></span>
              <button
                type="button"
                onClick={() => setEditingPostcode(true)}
                className="text-[11px] font-semibold text-gold-300 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {eligibleNearYou.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-6 text-center">
              <Compass className="mx-auto mb-2 size-6 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">No active matching groups found in this area.</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Update your postcode or location in Section E to discover groups nearby.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPostcode(true)}
                className="mt-3"
              >
                Update Location Postcode
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {eligibleNearYou.map((res) => {
                const g = res.group;
                return (
                  <div
                    key={g.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-900/70 p-4 transition-all hover:border-sky-500/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                          {g.name.slice(0, 1).toUpperCase()}
                        </div>
                        <Badge variant="info">{res.audienceLabel}</Badge>
                      </div>

                      <h3 className="mt-2 text-xs font-bold text-white truncate">{g.name}</h3>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {g.purpose}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                        {g.location?.city && (
                          <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5">
                            <MapPin className="size-2.5 text-gold-400" /> {g.location.city}
                          </span>
                        )}
                        <span className="rounded bg-white/5 px-1.5 py-0.5">
                          {memberCountOf(g)} members
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 capitalize">
                          {g.accessType}
                        </span>
                      </div>

                      {/* Matching reason tag */}
                      {res.matchReasons[0] && (
                        <p className="mt-2 text-[10px] text-sky-300/80 italic">
                          ✓ {res.matchReasons[0]}
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 border-t border-white/5 pt-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedExploreGroup(g)}
                        className="w-full justify-center text-xs"
                      >
                        {res.status === "can_join" ? "View & Join Group" : "View Group"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION D: MY GROUPS
           ========================================================================= */}
        <section aria-labelledby="my-groups-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users className="size-4" />
              </div>
              <h2 id="my-groups-heading" className="text-sm font-bold text-white">
                My Groups ({myJoinedGroups.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">Active memberships</span>
          </div>

          {myJoinedGroups.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-6 text-center">
              <Users className="mx-auto mb-2 size-6 text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">You haven't joined any groups yet.</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Accept an invitation or explore groups available in your area.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("available-near-you-heading");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-3"
              >
                Explore Groups
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myJoinedGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-900/70 p-4 transition-all hover:border-emerald-500/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300 font-bold text-xs border border-emerald-500/20">
                        {g.name.slice(0, 1).toUpperCase()}
                      </div>
                      <Badge variant="success">Member</Badge>
                    </div>

                    <h3 className="mt-2 text-xs font-bold text-white truncate">{g.name}</h3>
                    <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                      Owner: {g.ownerName}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {g.purpose}
                    </p>
                  </div>

                  <div className="mt-3.5 border-t border-white/5 pt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      {memberCountOf(g)} members
                    </span>
                    <Link
                      to={
                        session?.role === "business"
                          ? `/business/groups/${g.id}`
                          : `/participant/groups/${g.id}`
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      Open Group <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION E: PROFILE & COMMUNITY SETTINGS
           ========================================================================= */}
        <section aria-labelledby="profile-heading">
          <Card className="border border-white/10 bg-ink-900/70">
            <CardBody className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    id={activeUser.id}
                    name={activeUser.name}
                    className="size-12 rounded-xl text-base font-bold text-white ring-2 ring-gold-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="profile-heading" className="text-sm font-bold text-white">
                        {activeUser.name}
                      </h2>
                      <Badge variant={activeUser.accountType === "business" ? "gold" : "info"}>
                        {activeUser.accountType === "business" ? "Business Owner" : "Consumer Member"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {activeUser.accountType === "business" && activeUser.businessName
                        ? `${activeUser.businessName} · ${activeUser.sector || "General"} · `
                        : ""}
                      Location:{" "}
                      <strong className="text-white">
                        {activeUser.postcode ? `${activeUser.postcode} (${activeUser.city})` : activeUser.city}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPostcode(true)}
                  >
                    <Edit2 className="size-3" /> Edit Location / Postcode
                  </Button>
                </div>
              </div>

              {!activeUser.postcode && (
                <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="size-4 text-sky-400 shrink-0" />
                    <p className="text-xs text-sky-200">
                      Add your postcode to discover groups available in your immediate local area.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPostcode(true)}
                    className="text-xs font-bold text-sky-300 hover:underline shrink-0"
                  >
                    Add Postcode
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        </section>
      </main>

      {/* =========================================================================
          MODAL: INVITATION DETAIL & JOIN
         ========================================================================= */}
      {selectedInvite && (
        <Modal
          open={!!selectedInvite}
          title={selectedInvite.group.name}
          onClose={() => setSelectedInvite(null)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="gold">Group Invitation</Badge>
              <Badge variant="info">{selectedInvite.group.type}</Badge>
              {selectedInvite.group.pricing === "paid" && (
                <Badge variant="warning">Contribution: £{selectedInvite.group.contribution}</Badge>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-950 p-3.5 text-xs">
              <p className="text-slate-300 leading-relaxed">{selectedInvite.group.purpose}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-slate-400 border-t border-white/5 pt-2.5">
                <p>
                  Owner: <strong className="text-white">{selectedInvite.group.ownerName}</strong>
                </p>
                <p>
                  Location: <strong className="text-white">{selectedInvite.group.location?.city || "UK-wide"}</strong>
                </p>
                <p>
                  Members: <strong className="text-white">{memberCountOf(selectedInvite.group)}</strong>
                </p>
                <p>
                  Access rule: <strong className="text-white capitalize">{selectedInvite.group.accessType}</strong>
                </p>
              </div>
            </div>

            {selectedInvite.group.memberIds.includes(activeUser.id) ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                <p className="text-xs text-emerald-300 font-semibold">You are already a member of this group!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleJoinOpenGroup(selectedInvite.group, selectedInvite.invitation)}
                  className="w-full justify-center"
                >
                  <CheckCircle2 className="size-4" /> Accept &amp; Join Group
                </Button>
              </div>
            )}

            <div className="flex justify-end border-t border-white/10 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedInvite(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: VIEW & JOIN GROUP FROM EXPLORE
         ========================================================================= */}
      {selectedExploreGroup && (
        <Modal
          open={!!selectedExploreGroup}
          title={selectedExploreGroup.name}
          onClose={() => setSelectedExploreGroup(null)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedExploreGroup.type}</Badge>
              <Badge variant="gold">{groupAudienceOf(selectedExploreGroup)}</Badge>
              {selectedExploreGroup.pricing === "paid" && (
                <Badge variant="warning">£{selectedExploreGroup.contribution}</Badge>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedExploreGroup.purpose}
            </p>

            <div className="rounded-xl border border-white/10 bg-ink-950 p-3 text-xs space-y-1.5 text-slate-400">
              <p className="flex justify-between">
                <span>Organizer / Owner:</span>
                <span className="font-semibold text-white">{selectedExploreGroup.ownerName}</span>
              </p>
              <p className="flex justify-between">
                <span>Location:</span>
                <span className="font-semibold text-white">
                  {selectedExploreGroup.location?.city || "National (UK-wide)"}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Access Type:</span>
                <span className="font-semibold text-white capitalize">{selectedExploreGroup.accessType}</span>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedExploreGroup(null)} className="flex-1">
                Cancel
              </Button>
              {selectedExploreGroup.accessType === "open" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleJoinOpenGroup(selectedExploreGroup)}
                  className="flex-1 justify-center"
                >
                  <Plus className="size-4" /> Join Group
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRequestToJoin(selectedExploreGroup)}
                  className="flex-1 justify-center"
                >
                  Request to Join
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          MODAL: UPDATE POSTCODE
         ========================================================================= */}
      {editingPostcode && (
        <Modal
          open={editingPostcode}
          title="Update Location Postcode"
          onClose={() => setEditingPostcode(false)}
        >
          <form onSubmit={handleSavePostcode} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Your postcode is used to match and recommend relevant local business networks and community circles near you. It is never displayed publicly.
            </p>

            <label className="flex flex-col gap-1 text-left">
              <span className="text-xs font-medium text-slate-300">UK Postcode</span>
              <input
                type="text"
                required
                value={postcodeInput}
                onChange={(e) => setPostcodeInput(e.target.value)}
                placeholder="e.g. B1 1AA or NW1 8AB"
                className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-xs text-white uppercase focus:border-gold-500/50 focus:outline-none"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" size="sm" type="button" onClick={() => setEditingPostcode(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save &amp; Update Groups
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
