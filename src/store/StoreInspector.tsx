import { useState } from "react";
import { useAppStore } from "./context";

function isDevBuild(): boolean {
  try {
    return typeof import.meta.env === "object" && import.meta.env.DEV === true;
  } catch {
    return false;
  }
}

export default function StoreInspector() {
  const { state, dispatch } = useAppStore();
  const [open, setOpen] = useState(false);

  if (!isDevBuild()) return null;

  const rows: [string, string | number][] = [
    ["groups", state.groups.length],
    ["my memberships", state.groups.filter((g) => g.memberIds.includes("biz-smith")).length],
    ["invitations", state.invitations.length],
    ["group activities", state.groupActivities.length],
    ["circles", state.circles.length],
    ["circle activity", state.circleActivities.length],
    ["auto threshold", state.adminConfig.automaticGrouping.threshold],
    ["version", state.version],
  ];

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="w-56 rounded-xl border border-white/10 bg-ink-950/95 p-3 text-xs shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wide text-gold-300">
              Store inspector
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-slate-400 hover:text-white"
              aria-label="Close store inspector"
            >
              ✕
            </button>
          </div>
          <dl className="space-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{label}</dt>
                <dd className="font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => dispatch({ type: "store/reset" })}
            className="mt-3 w-full cursor-pointer rounded-lg border border-danger-500/40 bg-danger-500/15 px-3 py-1.5 text-danger-400 hover:bg-danger-500/25"
          >
            Reset demo state
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer rounded-full border border-white/10 bg-ink-900/90 px-3 py-1.5 text-[11px] font-medium text-slate-300 shadow-lg backdrop-blur hover:border-gold-500/40 hover:text-gold-200"
      >
        DEV · store
      </button>
    </div>
  );
}
