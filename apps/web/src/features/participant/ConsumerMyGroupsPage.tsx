import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Search,
  Users,
  ChevronRight,
  MapPin,
  ShieldCheck,
  LogOut,
  MessageSquare,
  Calendar,
  Tag,
  CheckCircle2,
  Mail,
  Check,
  X,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { selectMyGroups, useAppState, useIncomingInvitations } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { getParticipantIdentity } from "./participantIdentity";
import { findDirectoryEntry } from "../../data/businessData";
import type { Group } from "../../domain/types";

export default function ConsumerMyGroupsPage() {
  useEffect(() => {
    document.title = "CHS Groups | My Groups";
  }, []);

  const state = useAppState();
  const { dispatch } = useAppStore();
  const identity = getParticipantIdentity();
  const invitations = useIncomingInvitations(identity.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "local" | "invites">("all");
  const [selectedGroupMembersModal, setSelectedGroupMembersModal] = useState<Group | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Pending invitations
  const pendingInvites = useMemo(() => {
    return invitations.filter((inv) => inv.kind === "invite" && inv.status === "pending");
  }, [invitations]);

  // Groups joined by this participant
  const myGroups = useMemo(() => {
    return selectMyGroups(state, identity.id).filter(
      (group) => group.ownerId !== "system" || group.memberIds.includes(identity.id)
    );
  }, [state, identity.id]);

  // Total members connected across joined groups
  const totalConnectedMembers = useMemo(() => {
    const allMembers = new Set<string>();
    myGroups.forEach((g) => g.memberIds.forEach((id) => allMembers.add(id)));
    return allMembers.size;
  }, [myGroups]);

  const filteredGroups = useMemo(() => {
    return myGroups.filter((group) => {
      const matchesSearch =
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.location?.city && group.location.city.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "local") {
        return !!group.location?.city && !group.location.city.toLowerCase().includes("national");
      }
      return true;
    });
  }, [myGroups, searchQuery, filterType]);

  const handleLeaveGroup = (group: Group) => {
    if (window.confirm(`Are you sure you want to leave "${group.name}"?`)) {
      dispatch({
        type: "group/leave",
        groupId: group.id,
        actor: { id: identity.id, name: identity.name },
      });
      showToast(`You have left ${group.name}.`);
    }
  };

  const handleAcceptInvite = (invitationId: string) => {
    dispatch({
      type: "invitation/respond",
      invitationId,
      accept: true,
      responder: { id: identity.id, name: identity.name },
    });
    showToast("Invitation accepted! Group joined.");
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header and Call to Action */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">My Groups</h1>
          <p className="mt-1 text-xs text-slate-400">
            Groups and community spaces you have joined. Participate in discussions, attend meetups, and claim member benefits.
          </p>
        </div>
        <Link
          to="/participant/discover"
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-500/20 sm:self-auto"
        >
          <Compass className="size-4" /> Discover New Groups
        </Link>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <span className="text-xs font-medium text-slate-400">Joined Groups</span>
          <span className="mt-1 text-xl font-extrabold text-white">{myGroups.length}</span>
          <span className="mt-0.5 text-[10px] text-slate-500">Active memberships</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <span className="text-xs font-medium text-slate-400">Connected Members</span>
          <span className="mt-1 text-xl font-extrabold text-white">{totalConnectedMembers}</span>
          <span className="mt-0.5 text-[10px] text-slate-500">Across all groups</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <span className="text-xs font-medium text-slate-400">Exclusive Perks</span>
          <span className="mt-1 text-xl font-extrabold text-gold-300">6+</span>
          <span className="mt-0.5 text-[10px] text-slate-500">Discounts &amp; passes</span>
        </div>
        <div className="flex flex-col rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <span className="text-xs font-medium text-slate-400">Pending Invites</span>
          <span className={`mt-1 text-xl font-extrabold ${pendingInvites.length > 0 ? "text-gold-300" : "text-white"}`}>
            {pendingInvites.length}
          </span>
          <span className="mt-0.5 text-[10px] text-slate-500">Awaiting response</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search joined groups by name, keyword, or city..."
            className="w-full rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-gold-500/50 focus:bg-ink-900"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            All Groups ({myGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("local")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === "local"
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
            }`}
          >
            Local Groups
          </button>
          {pendingInvites.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterType("invites")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterType === "invites"
                  ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                  : "border border-white/10 bg-ink-900/40 text-slate-400 hover:text-white"
              }`}
            >
              Invites ({pendingInvites.length})
            </button>
          )}
        </div>
      </div>

      {/* Pending Invitations Quick Section (when invites filter or at top if any) */}
      {(filterType === "invites" || (pendingInvites.length > 0 && filterType === "all")) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/[0.07] p-4.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-gold-400" />
              <h2 className="text-sm font-bold text-gold-200">
                Invitations Awaiting Your Action ({pendingInvites.length})
              </h2>
            </div>
            <Link
              to="/participant/invitations"
              className="text-xs font-semibold text-gold-300 hover:text-gold-200"
            >
              Manage all &rarr;
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pendingInvites.map((inv) => {
              const group = inv.groupId ? state.groups.find((g) => g.id === inv.groupId) : null;
              return (
                <div
                  key={inv.id}
                  className="flex flex-col justify-between rounded-xl border border-gold-500/30 bg-ink-900/80 p-3.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="gold">Group Invitation</Badge>
                      <span className="text-[10px] text-slate-400">
                        From {inv.invitedByName}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">
                      {group?.name || "Community Group"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                      {group?.purpose || "You are invited to join this community network."}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(inv.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                    >
                      <Check className="size-3" /> Accept &amp; Join
                    </button>
                    {inv.groupId && (
                      <Link
                        to={`/participant/groups/${inv.groupId}`}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                      >
                        Preview
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Joined Groups Stream */}
      {filterType !== "invites" && (
        <div className="flex flex-col gap-4">
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
              <ShieldCheck className="mx-auto size-10 text-slate-600" />
              <h2 className="mt-4 text-base font-semibold text-white">
                {searchQuery ? "No matching groups found" : "No groups joined in this view"}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                {searchQuery
                  ? `No groups match "${searchQuery}". Try a different keyword.`
                  : "Discover community groups, local clubs, and networks matching your interests."}
              </p>
              <div className="mt-4">
                <Link
                  to="/participant/discover"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-ink-950 hover:bg-gold-400"
                >
                  <Compass className="size-4" /> Explore &amp; Join Groups
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredGroups.map((group) => {
                // First 5 member avatars
                const memberPreview = group.memberIds.slice(0, 5).map((id) => {
                  const entry = findDirectoryEntry(id);
                  const account = state.accounts.find((row) => row.id === id);
                  const name = account?.name ?? entry.name;
                  return { id, name };
                });

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
                            {group.location?.city && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="size-3 text-gold-400" />
                                {group.location.city}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-400" /> Active Member
                            </span>
                          </div>

                          <h2 className="mt-2 text-base font-bold text-white transition-colors hover:text-gold-200">
                            <Link to={`/participant/groups/${group.id}`}>{group.name}</Link>
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Organized by <span className="text-slate-300 font-medium">{group.ownerName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Purpose */}
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {group.purpose}
                      </p>

                      {/* Members Avatar Row in this group */}
                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            {memberPreview.map((m) => (
                              <div
                                key={m.id}
                                title={m.name}
                                className="flex size-7 items-center justify-center rounded-full border-2 border-ink-900 bg-gold-500/20 text-[10px] font-bold text-gold-300"
                              >
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedGroupMembersModal(group)}
                            className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-white"
                          >
                            {group.memberIds.length} members &rarr;
                          </button>
                        </div>

                        <span className="text-[11px] text-slate-500">
                          {group.pricing === "paid" ? `Paid · £${group.contribution}` : "Free to join"}
                        </span>
                      </div>

                      {/* What you can do in this group based on your access */}
                      <div className="mt-3.5 rounded-xl border border-white/5 bg-ink-950/60 p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-gold-300 uppercase tracking-wider">
                            Your Member Access
                          </p>
                          <span className="text-[10px] text-slate-500">Full Participant</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5">
                            <MessageSquare className="size-2.5 text-gold-400" /> Post in Feed
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5">
                            <Calendar className="size-2.5 text-sky-400" /> RSVP Events
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5">
                            <Tag className="size-2.5 text-emerald-400" /> Claim Perks
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5">
                            <Users className="size-2.5 text-amber-400" /> View Members
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        title="Leave group"
                        onClick={() => handleLeaveGroup(group)}
                        className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-rose-400 text-xs flex items-center gap-1"
                      >
                        <LogOut className="size-3.5" /> Leave
                      </button>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/participant/groups/${group.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                        >
                          Open Group <ChevronRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Member Roster Modal */}
      {selectedGroupMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedGroupMembersModal.name} &bull; Members
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedGroupMembersModal.memberIds.length} community members connected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroupMembersModal(null)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-2">
                {selectedGroupMembersModal.memberIds.map((id) => {
                  const entry = findDirectoryEntry(id);
                  const account = state.accounts.find((row) => row.id === id);
                  const name = account?.name ?? entry.name;
                  const isOwner = id === selectedGroupMembersModal.ownerId;
                  const isSelf = id === identity.id;
                  const city = entry.city || selectedGroupMembersModal.location?.city || "United Kingdom";

                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-950/60 p-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/15 text-gold-400 font-bold text-xs">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {name} {isSelf && <span className="text-gold-300 font-normal">(you)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{city}</p>
                        </div>
                      </div>
                      <Badge variant={isOwner ? "gold" : "muted"}>
                        {isOwner ? "Organizer" : "Member"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedGroupMembersModal(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
