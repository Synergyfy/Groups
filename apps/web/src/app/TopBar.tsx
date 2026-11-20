import { useEffect, useRef, useState } from "react";
import { ChevronDown, Compass, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import PageGuideMenu from "../journey/PageGuideMenu";
import { authApi } from "./api";
import { clearAuthSession, readAuthSession } from "./authSession";

interface TopBarProps {
  sectionLabel: string;
  wide?: boolean;
}

const MENU_ITEM_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white";

export default function TopBar({ sectionLabel, wide = false }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const session = readAuthSession();
  const onAdmin = location.pathname.startsWith("/admin");
  const isAdmin = session?.role === "admin";

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const signOut = async () => {
    closeMenu();
    try {
      await authApi.logout();
    } finally {
      clearAuthSession();
      navigate("/", { replace: true });
    }
  };

  const displayName = session?.name ?? "Account";
  const displaySubtitle = isAdmin
    ? "Platform administrator"
    : session?.businessName ?? "Business account";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur">
      <div
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6 ${
          wide ? "" : "mx-auto max-w-[1440px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#f2c15c" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="16" cy="16" r="3.5" fill="#e6a92b" />
          </svg>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">247 GBS</p>
            <p className="truncate text-[11px] leading-tight text-slate-400">{sectionLabel}</p>
          </div>
        </div>

        <nav
          aria-label="Dashboard"
          className="hidden items-center gap-1 rounded-xl border border-white/10 bg-ink-900 p-1 sm:flex"
        >
          {session?.role === "business" && (
            <NavLink
              to="/business"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              Business
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500/15 text-gold-200"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <ShieldCheck className="size-3.5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2.5">
          {!onAdmin && <PageGuideMenu />}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open account menu"
              className="flex cursor-pointer items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-white/10 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-gold-500"
            >
              <Avatar
                id={session?.accountId ?? ""}
                name={displayName}
                className="size-8 rounded-full text-[10px] font-bold text-white"
              />
              <div className="hidden leading-tight text-left md:block">
                <p className="text-xs font-semibold text-white">{displayName}</p>
                <p className="text-[10px] text-slate-500">{displaySubtitle}</p>
              </div>
              <ChevronDown
                className={`size-3.5 text-slate-500 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl shadow-black/60"
              >
                <div className="border-b border-white/10 px-3 py-2.5">
                  <p className="truncate text-xs font-semibold text-white">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {session?.email ?? displaySubtitle}
                  </p>
                </div>
                {isAdmin ? (
                  <Link
                    role="menuitem"
                    to="/admin/settings-reports"
                    onClick={closeMenu}
                    className={MENU_ITEM_CLASS}
                  >
                    <Settings className="size-3.5" />
                    Admin settings
                  </Link>
                ) : (
                  <>
                    <Link
                      role="menuitem"
                      to="/business/settings"
                      onClick={closeMenu}
                      className={MENU_ITEM_CLASS}
                    >
                      <Settings className="size-3.5" />
                      Account settings
                    </Link>
                    <Link
                      role="menuitem"
                      to="/business/journey"
                      onClick={closeMenu}
                      className={MENU_ITEM_CLASS}
                    >
                      <Compass className="size-3.5" />
                      My journey
                    </Link>
                  </>
                )}
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className={`${MENU_ITEM_CLASS} text-rose-300 hover:text-rose-200`}
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
