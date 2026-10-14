import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  UserCircle,
  LogOut,
  Bell,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { getParticipantIdentity } from "./participantIdentity";
import { useAppState, useIncomingInvitations, selectMyGroups } from "../../store/selectors";
import { readParticipantSession } from "../../app/authSession";
import ChsBusinessVerificationModal from "../../components/ui/ChsBusinessVerificationModal";

export default function ParticipantLayout() {
  const navigate = useNavigate();
  const identity = getParticipantIdentity();
  const state = useAppState();
  const invitations = useIncomingInvitations(identity.id);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const session = readParticipantSession();
  const businessName = session?.businessName || (session?.role === "business-invitee" ? session.name : "Invited Business");

  const pendingInvites = invitations.filter(
    (inv) => inv.kind === "invite" && inv.status === "pending"
  );
  const myGroups = selectMyGroups(state, identity.id).filter(
    (group) => group.ownerId !== "system" || group.memberIds.includes(identity.id)
  );

  const handleSignOut = () => {
    sessionStorage.removeItem("chs-auth-state");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-ink-950 text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink-900/60 backdrop-blur md:flex">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-label="CHS Groups">
            <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#f2c15c" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
          </svg>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">CHS Groups</p>
            <p className="truncate text-[10px] font-medium text-amber-400/90">Invited Business</p>
          </div>
        </div>

        {/* Sidebar Nav - Minimal Participant Experience */}
        <nav className="flex flex-1 flex-col gap-1.5 p-3" aria-label="Desktop participant navigation">
          <NavLink
            to="/participant"
            end
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <LayoutGrid className="size-4" /> Overview
            </span>
          </NavLink>

          <NavLink
            to="/participant/groups"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Users className="size-4" /> Invited Groups
            </span>
            {myGroups.length > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {myGroups.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/participant/onboarding"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Building2 className="size-4" /> Business Onboarding
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
              £1 Verify
            </span>
          </NavLink>

          <NavLink
            to="/participant/account"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <UserCircle className="size-4" /> My Profile
            </span>
          </NavLink>
        </nav>

        {/* Profile Footer */}
        <div className="border-t border-white/10 p-4">
          {/* Business Invitee – Verify CTA */}
          <button
            id="sidebar-btn-verify-business"
            type="button"
            onClick={() => setVerifyModalOpen(true)}
            className="mb-3 flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-gold-500/10 px-3 py-2.5 ring-1 ring-amber-500/30 transition-all hover:from-amber-500/30 hover:to-gold-500/20"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <Building2 className="size-3.5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[11px] font-bold text-amber-200">Verify Business (£1)</p>
              <p className="text-[10px] text-amber-300/60">Unlock Business Dashboard</p>
            </div>
          </button>

          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{businessName}</p>
              <p className="text-[10px] text-slate-500">Invited Business (Participant)</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content container */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-ink-900/70 px-4 py-3 backdrop-blur md:hidden">
          <NavLink to="/participant" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="size-6 shrink-0" aria-label="CHS Groups">
              <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
              <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
            </svg>
            <span className="text-xs font-bold text-white">CHS Groups</span>
          </NavLink>

          <div className="flex items-center gap-3">
            {/* Verify Business chip (mobile) */}
            <button
              id="mobile-btn-verify-business"
              type="button"
              onClick={() => setVerifyModalOpen(true)}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/25 transition-colors hover:bg-amber-500/25"
            >
              <Building2 className="size-3 text-amber-400" />
              <span>Verify £1</span>
            </button>

            {pendingInvites.length > 0 && (
              <NavLink
                to="/participant/invitations"
                className="flex items-center gap-1 rounded-full bg-gold-500/15 px-2.5 py-1 text-[11px] font-semibold text-gold-300"
              >
                <Bell className="size-3 text-gold-400" />
                <span>{pendingInvites.length}</span>
              </NavLink>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="cursor-pointer text-xs text-slate-400 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile bottom navigation (4 destinations: Overview · Groups · Onboarding · Profile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-ink-950/95 backdrop-blur md:hidden"
          aria-label="Mobile participant navigation"
        >
          <NavLink
            to="/participant"
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <LayoutGrid className="size-4" />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/participant/groups"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <div className="relative">
              <Users className="size-4" />
              {myGroups.length > 0 && (
                <span className="absolute -right-2 -top-1 size-1.5 rounded-full bg-amber-400" />
              )}
            </div>
            <span>Groups</span>
          </NavLink>

          <NavLink
            to="/participant/onboarding"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <Building2 className="size-4" />
            <span>Onboarding</span>
          </NavLink>

          <NavLink
            to="/participant/account"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <UserCircle className="size-4" />
            <span>Profile</span>
          </NavLink>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 md:px-7 md:py-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Business Verification Modal – accessible from any participant page */}
      <ChsBusinessVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />
    </div>
  );
}
