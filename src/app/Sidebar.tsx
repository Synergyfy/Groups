import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  onNavigate?: () => void;
}

export default function Sidebar({ sections, onNavigate }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-6 p-4" aria-label="Main navigation">
      {sections.map((section, index) => (
        <div key={section.title ?? `section-${index}`} className="flex flex-col">
          {section.title && (
            <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {section.title}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs lg:text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-gold-500/15 text-gold-200 border border-gold-500/30 shadow-sm shadow-gold-500/10 font-semibold"
                        : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`
                  }
                >
                  {item.icon && (
                    <span className="shrink-0 transition-transform group-hover:scale-105">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
