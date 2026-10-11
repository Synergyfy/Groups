import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import TipIcon from "../ui/TipIcon";
import { ROLES } from "../../domain/constants";
import { INITIAL_FILTERS, type CircleFilterState } from "./filterState";

interface CircleFiltersProps {
  members: CircleFilterOptionSource[];
  state: CircleFilterState;
  onChange: (next: CircleFilterState) => void;
  resultCount: number;
  totalCount: number;
}

type CircleFilterOptionSource = { category: string; location: string };

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const selectClass =
  "h-10 w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-slate-200 transition-colors hover:border-white/20 focus-visible:border-gold-500 focus-visible:outline-none";
const labelClass = "mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500";

export default function CircleFilters({
  members,
  state,
  onChange,
  resultCount,
  totalCount,
}: CircleFiltersProps) {
  const [open, setOpen] = useState(false);
  const categories = uniqueSorted(members.map((m) => m.category));
  const locations = uniqueSorted(members.map((m) => m.location));
  const hasFilters =
    state.category !== "all" || state.location !== "all" || state.activity !== "all" || state.role !== "all";
  const activeCount = [
    state.category !== "all",
    state.location !== "all",
    state.activity !== "all",
    state.role !== "all",
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="circle-filters-body"
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <SlidersHorizontal className="size-3.5 text-gold-400" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-gold-300">
              {activeCount} active
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            <span className="font-semibold text-slate-200">{resultCount}</span> / {totalCount} members
          </span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div id="circle-filters-body" className="mt-3">
          {hasFilters && (
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => onChange(INITIAL_FILTERS)}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/20"
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="filter-category">
              Category{" "}
              <TipIcon
                className="align-middle"
                text="Show only members whose business category matches this choice."
              />
            </label>
            <select
              id="filter-category"
              className={selectClass}
              value={state.category}
              onChange={(e) => onChange({ ...state, category: e.target.value })}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="filter-location">
              Location{" "}
              <TipIcon
                className="align-middle"
                text="Show only members based in this location on their profile."
              />
            </label>
            <select
              id="filter-location"
              className={selectClass}
              value={state.location}
              onChange={(e) => onChange({ ...state, location: e.target.value })}
            >
              <option value="all">All locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="filter-activity">
              Activity{" "}
              <TipIcon
                className="align-middle"
                text="Filters on each member's active or inactive status."
              />
            </label>
            <select
              id="filter-activity"
              className={selectClass}
              value={state.activity}
              onChange={(e) =>
                onChange({ ...state, activity: e.target.value as CircleFilterState["activity"] })
              }
            >
              <option value="all">All activity</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="filter-role">
              Role{" "}
              <TipIcon
                className="align-middle"
                text="Show only members with this role: core, peripheral, banker or partner."
              />
            </label>
            <select
              id="filter-role"
              className={selectClass}
              value={state.role}
              onChange={(e) => onChange({ ...state, role: e.target.value as CircleFilterState["role"] })}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
