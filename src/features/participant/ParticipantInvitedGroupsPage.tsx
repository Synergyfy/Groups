import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Building2,
  ChevronRight,
  ShieldCheck,
  Mail,
  Lock,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { selectMyGroups, useAppState, useIncomingInvitations } from "../../store/selectors";
import { getParticipantIdentity } from "./participantIdentity";
import ChsBusinessVerificationModal from "../../components/ui/ChsBusinessVerificationModal";

export default function ParticipantInvitedGroupsPage() {
  useEffect(() => {
    document.title = "CHS Groups | Invited Groups";
  }, []);

  const state = useAppState();
  const identity = getParticipantIdentity();
  const invitations = useIncomingInvitations(identity.id);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const pendingInvites = useMemo(() => {
    return invitations.filter((inv) => inv.kind === "invite" && inv.status === "pending");
  }, [invitations]);

  // Groups joined by this participant
  const joinedGroups = useMemo(() => {
    return selectMyGroups(state, identity.id).filter(
      (group) => group.ownerId !== "system" || group.memberIds.includes(identity.id)
    );
  }, [state, identity.id]);

  const filteredGroups = useMemo(() => {
    return joinedGroups.filter((group) => {
      const q = searchQuery.toLowerCase();
      return (
        group.name.toLowerCase().includes(q) ||
        group.purpose.toLowerCase().includes(q) ||
        group.type.toLowerCase().includes(q)
      );
    });
  }, [joinedGroups, searchQuery]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white sm:text-2xl">Invited Groups</h1>
            <Badge variant="warning">Participant Access</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Groups you have been invited to join as an external business participant.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVerifyModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 px-4 py-2 text-xs font-bold text-ink-950 transition-all hover:from-amber-400 hover:to-gold-400 sm:self-auto"
        >
          <Building2 className="size-4" /> Verify Business (£1)
        </button>
      </div>

      {/* Verification Notice Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-xs text-amber-200 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Participant Level Limitations</p>
              <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                You can engage inside your invited groups, but cannot create custom groups or invite others until your business identity is verified.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerifyModalOpen(true)}
            className="shrink-0 font-semibold text-gold-300 hover:text-gold-200 underline text-xs"
          >
            Complete verification &rarr;
          </button>
        </div>
      </div>

      {/* Pending Invites Alert if any */}
      {pendingInvites.length > 0 && (
        <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-gold-400" />
              <p className="text-xs font-semibold text-gold-200">
                You have {pendingInvites.length} pending group invitation{pendingInvites.length === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              to="/participant/invitations"
              className="text-xs font-semibold text-gold-300 hover:text-gold-200"
            >
              Review invites &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter invited groups by name or topic..."
          className="w-full rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-gold-500/50 focus:bg-ink-900"
        />
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <ShieldCheck className="mx-auto size-10 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold text-white">
            {searchQuery ? "No matching invited groups found" : "No invited groups active"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Accept invitations sent to your business email to participate in community groups.
          </p>
          <div className="mt-4">
            <Link
              to="/participant/invitations"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-gold-400"
            >
              View Invitations
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-5 transition-all hover:border-amber-500/30 hover:bg-ink-900/80"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="gold">{group.type}</Badge>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Invited Member
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-white">{group.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Organized by <span className="text-slate-300">{group.ownerName}</span>
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-slate-400 leading-relaxed">
                  {group.purpose}
                </p>

                <div className="mt-3 rounded-lg bg-ink-950/60 p-2.5 text-[11px] text-slate-400">
                  <span className="text-amber-300 font-medium">Participant Permissions:</span> View discussions &bull; Participate in polls &bull; RSVP events
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-slate-400">
                  {group.memberIds.length} members connected
                </span>
                <Link
                  to={`/participant/groups/${group.id}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-amber-400"
                >
                  Enter Group <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      <ChsBusinessVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />
    </div>
  );
}
