import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <NavLink to="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <svg
              viewBox="0 0 32 32"
              className="size-8 shrink-0"
              aria-label="Groups & Circles"
            >
              <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
              <circle
                cx="16"
                cy="16"
                r="8"
                fill="none"
                stroke="#f2c15c"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
            </svg>
            <span className="truncate text-sm font-bold text-white">
              Groups &amp; Circles
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 rounded-xl border border-white/10 bg-ink-900 p-1 md:flex"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/sign-in"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              Sign In
            </NavLink>
            <NavLink
              to="/get-started"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              Get Started
            </NavLink>
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-ink-900 text-slate-300 transition-colors hover:border-gold-500/30 hover:text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-white/10 bg-ink-950/95 px-4 pb-4 pt-2 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <NavLink
                to="/"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-500/15 text-gold-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/sign-in"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-500/15 text-gold-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                Sign In
              </NavLink>
              <NavLink
                to="/get-started"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-500/15 text-gold-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                Get Started
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
