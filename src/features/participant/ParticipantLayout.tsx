import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Mail,
  Settings,
  LogOut,
} from "lucide-react";
import { getParticipantIdentity } from "./participantIdentity";

export default function ParticipantLayout() {
  const navigate = useNavigate();
  const identity = getParticipantIdentity();

  const handleSignOut = () => {
    sessionStorage.removeItem("chs-auth-state");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-ink-950 text-white">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 bg-ink-900/50 md:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
          <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-label="Groups & Circles">
            <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#f2c15c" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
          </svg>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">Groups &amp; Circles</p>
            <p className="text-[10px] text-slate-500">{identity.label}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Participant navigation">
          <NavLink
            to="/participant"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <LayoutGrid className="size-4" /> My Circles
          </NavLink>
          <NavLink
            to="/participant/invitations"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Mail className="size-4" /> Invitations
          </NavLink>
          <NavLink
            to="/participant/account"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gold-500/15 text-gold-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Settings className="size-4" /> Account
          </NavLink>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-white/10 bg-ink-900/50 px-4 py-3 md:hidden">
          <NavLink to="/participant" className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="size-6" aria-label="Groups & Circles">
              <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
              <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
            </svg>
            <span className="text-xs font-bold text-white">{identity.label}</span>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer text-xs text-slate-400 hover:text-white"
          >
            Sign out
          </button>
        </header>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-ink-950/95 backdrop-blur md:hidden"
          aria-label="Mobile participant navigation"
        >
          <NavLink
            to="/participant"
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-500"
              }`
            }
          >
            <LayoutGrid className="size-4" /> My Circles
          </NavLink>
          <NavLink
            to="/participant/invitations"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-500"
              }`
            }
          >
            <Mail className="size-4" /> Invitations
          </NavLink>
          <NavLink
            to="/participant/account"
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-gold-400" : "text-slate-500"
              }`
            }
          >
            <Settings className="size-4" /> Account
          </NavLink>
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-5 pb-20 md:px-6 md:py-6 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
