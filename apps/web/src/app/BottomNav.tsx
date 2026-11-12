import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export interface BottomNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  onMore: () => void;
}

export default function BottomNav({ items, onMore }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => (
          <li key={item.to} className="min-w-0 flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-gold-200" : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <span className="flex size-5 items-center justify-center" aria-hidden="true">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onMore}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 text-[10px] font-medium text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            <span className="flex size-5 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </span>
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
