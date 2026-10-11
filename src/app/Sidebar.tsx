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
    <nav className="flex flex-col gap-5 p-3" aria-label="Main navigation">
      {sections.map((section, index) => (
        <div key={section.title ?? `section-${index}`}>
          {section.title && (
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-gold-500/15 text-gold-200 border border-gold-500/25"
                        : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`
                  }
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
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
