import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Compass,
  Mail,
  UserCircle,
  LogOut,
  Bell,
} from "lucide-react";
import { useAppState, useIncomingInvitations, selectMyGroups } from "../../store/selectors";
import { readParticipantSession } from "../../app/authSession";

export default function ConsumerLayout() {
  const navigate = useNavigate();
  const session = readParticipantSession();
  const state = useAppState();

  const consumerId = session?.role === "consumer" ? (session.accountId || "cons-john") : "cons-john";
  const consumerName = session?.role === "consumer" ? session.name : "John Doe";

  const invitations = useIncomingInvitations(consumerId);
  const pendingInvites = invitations.filter(
    (inv) => inv.kind === "invite" && inv.status === "pending"
  );
  const myGroups = selectMyGroups(state, consumerId).filter(
    (group) => group.ownerId !== "system" || group.memberIds.includes(consumerId)
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
            <p className="truncate text-[10px] font-medium text-gold-400/90">Consumer Space</p>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex flex-1 flex-col gap-1.5 p-3" aria-label="Desktop consumer navigation">
          <NavLink
            to="/consumer"
            end
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <LayoutGrid className="size-4" /> Home
            </span>
          </NavLink>

          <NavLink
            to="/consumer/my-groups"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Users className="size-4" /> My Groups
            </span>
            {myGroups.length > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {myGroups.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/consumer/invitations"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Mail className="size-4" /> Invitations
            </span>
            {pendingInvites.length > 0 && (
              <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-gold-300">
                {pendingInvites.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/consumer/discover"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Compass className="size-4" /> Discover Groups
            </span>
          </NavLink>

          <NavLink
            to="/consumer/account"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
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
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{consumerName}</p>
              <p className="text-[10px] text-slate-500">Consumer Member</p>
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
          <NavLink to="/consumer" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="size-6 shrink-0" aria-label="CHS Groups">
              <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
              <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
            </svg>
            <span className="text-xs font-bold text-white">CHS Groups</span>
          </NavLink>

          <div className="flex items-center gap-3">
            {pendingInvites.length > 0 && (
              <NavLink
                to="/consumer/invitations"
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

        {/* Mobile bottom navigation (4 destinations: Home · My Groups · Discover · Profile) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-ink-950/95 backdrop-blur md:hidden"
          aria-label="Mobile consumer navigation"
        >
          <NavLink
            to="/consumer"
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <LayoutGrid className="size-4" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/consumer/my-groups"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <div className="relative">
              <Users className="size-4" />
              {myGroups.length > 0 && (
                <span className="absolute -right-2 -top-1 size-1.5 rounded-full bg-gold-400" />
              )}
            </div>
            <span>My Groups</span>
          </NavLink>

          <NavLink
            to="/consumer/discover"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            <Compass className="size-4" />
            <span>Discover</span>
          </NavLink>

          <NavLink
            to="/consumer/account"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-400 hover:text-slate-200"
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
    </div>
  );
}
