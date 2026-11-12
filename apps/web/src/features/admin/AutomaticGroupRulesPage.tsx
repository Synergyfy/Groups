import { DEFAULT_ADMIN_CONFIG } from "../../data/adminData";
import type { GroupThreshold } from "../../domain/types";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import ProgressBar from "../../components/ui/ProgressBar";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import { useAppStore } from "../../store/context";
import { useAppState } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

const THRESHOLDS: GroupThreshold[] = [6, 12, 18, 24];
const METHODS = ["Joining order", "Location first", "Balanced split"];
const SCOPES = ["National network", "City", "Local area"];

export default function AutomaticGroupRulesPage() {
  const state = useAppState();
  const { dispatch } = useAppStore();
  const rule = state.adminConfig.automaticGrouping;

  const networkGroups = state.groups.filter(
    (group) => group.source === "automatic" && group.type === "Network"
  );
  const totalMembers = networkGroups.reduce((sum, group) => sum + memberCountOf(group), 0);

  const patch = (next: Partial<typeof rule>) =>
    dispatch({ type: "admin/update-config", patch: { automaticGrouping: next } });

  const outcomeFor = (threshold: GroupThreshold) => {
    const over = networkGroups.filter((group) => memberCountOf(group) >= threshold).length;
    const seatsShort = networkGroups.reduce(
      (sum, group) => sum + Math.max(threshold - memberCountOf(group), 0),
      0
    );
    return { over, seatsShort };
  };

  const current = outcomeFor(rule.threshold);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="20 — Automatic Group Rules"
        back="/admin/groups"
        tip="Every change saves as you click. This screen only calculates outcomes — it never splits or merges a group itself."
        subtitle="The configuration every automatic group lives by: threshold, method, scope and combination rules, with a live preview of what the current rule would do right now."
        actions={
          <>
            <button
              type="button"
              onClick={() => patch(DEFAULT_ADMIN_CONFIG.automaticGrouping)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/70 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-gold-500/40 hover:text-white"
            >
              Reset to defaults
            </button>
            <TipIcon text="Overwrites every setting below at once — threshold 12, joining order, national scope, combining off." />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Threshold"
          value={rule.threshold}
          hint="Members per automatic group"
          accent="gold"
        />
        <StatCard
          label="Automatic groups"
          value={networkGroups.length.toLocaleString("en-GB")}
          hint="Network groups the rule governs"
          accent="info"
        />
        <StatCard
          label="Members in scope"
          value={totalMembers.toLocaleString("en-GB")}
          hint={rule.scope}
          accent="success"
        />
        <StatCard
          label="Would split now"
          value={current.over.toLocaleString("en-GB")}
          hint="Groups at or above the threshold"
          accent={current.over > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3" data-tour="controls">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CardTitle>Rule configuration</CardTitle>
                <TipIcon text="Every control here saves immediately — there is no save button, and every screen reads these values." />
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-3 text-xs">
              <span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Automatic grouping</span>
                  <TipIcon text="When this is off, groups are only created by hand." />
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Turning this off stops splitting — it never deletes an existing group.
                </span>
                <FieldHint>
                  Only automatic Network groups are affected — user-created groups stay untouched.
                </FieldHint>
              </span>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => patch({ enabled: event.target.checked })}
                className="size-4 shrink-0 cursor-pointer accent-gold-500"
              />
            </label>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-white">
                Threshold{" "}
                <TipIcon
                  className="align-middle"
                  text="Splits any automatic group that reaches this many members."
                />
              </p>
              <div className="flex flex-wrap gap-2">
                {THRESHOLDS.map((threshold) => (
                  <button
                    key={threshold}
                    type="button"
                    onClick={() => patch({ threshold })}
                    className={`h-10 min-w-16 cursor-pointer rounded-xl border px-4 text-sm font-bold transition-colors ${
                      rule.threshold === threshold
                        ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                        : "border-white/10 bg-ink-950/60 text-slate-300 hover:border-gold-500/30"
                    }`}
                  >
                    {threshold}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                The specification allows 6, 12, 18 or 24 — the rule is data, not code, and every
                screen reads it from this configuration.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Method</span>
                  <TipIcon text="Changing it does not move members in groups that already exist — it applies at the next split." />
                </span>
                <FieldHint>Sets how members are assigned when the threshold triggers a split.</FieldHint>
                <select
                  value={rule.method}
                  onChange={(event) => patch({ method: event.target.value })}
                  className="h-10 cursor-pointer rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none"
                >
                  {METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                  {!METHODS.includes(rule.method) && <option value={rule.method}>{rule.method}</option>}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Scope</span>
                  <TipIcon text="Groups outside the selected scope are not affected by this rule at all." />
                </span>
                <FieldHint>
                  Limits splitting to the whole network, a single city, or one local area.
                </FieldHint>
                <select
                  value={rule.scope}
                  onChange={(event) => patch({ scope: event.target.value })}
                  className="h-10 cursor-pointer rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none"
                >
                  {SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                  {!SCOPES.includes(rule.scope) && <option value={rule.scope}>{rule.scope}</option>}
                </select>
              </label>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-3 text-xs">
              <span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Allow combining groups</span>
                  <TipIcon text="Only automatic groups are ever combined, and only while automatic grouping is switched on." />
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Whether two undersized automatic groups may be merged by the system.
                </span>
                <FieldHint>
                  Off means undersized groups are never merged — they grow or split on their own.
                </FieldHint>
              </span>
              <input
                type="checkbox"
                checked={rule.allowCombine}
                onChange={(event) => patch({ allowCombine: event.target.checked })}
                className="size-4 shrink-0 cursor-pointer accent-gold-500"
              />
            </label>
          </CardBody>
        </Card>

        <Card data-tour="preview">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Live outcome preview</CardTitle>
              <TipIcon text="The table recalculates whenever you change the threshold or a group's membership." />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              What the rule would do if it ran against today's demo network:
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-semibold">Threshold</th>
                  <th className="pb-2 text-right font-semibold">Splits</th>
                  <th className="pb-2 text-right font-semibold">Seats short</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {THRESHOLDS.map((threshold) => {
                  const outcome = outcomeFor(threshold);
                  const active = threshold === rule.threshold;
                  return (
                    <tr
                      key={threshold}
                      className={`border-t border-white/10 ${active ? "text-gold-200" : ""}`}
                    >
                      <td className="py-2 font-semibold">
                        {threshold}
                        {active && <span className="ml-1.5 text-[10px]">current</span>}
                      </td>
                      <td className="py-2 text-right">{outcome.over}</td>
                      <td className="py-2 text-right">{outcome.seatsShort}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-auto rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              Splits = groups at or above the threshold today. Seats short = members still needed to
              fill every group to that threshold.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="outcome">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CardTitle>Current groups against the rule</CardTitle>
                <TipIcon text="Only automatic Network groups are listed — groups businesses created are never governed by this rule." />
              </div>
              <span className="text-[11px] text-slate-500">
                {rule.enabled ? "Rule enabled" : "Rule disabled"}
              </span>
            </div>
            {networkGroups.length === 0 ? (
              <p className="text-xs text-slate-400">No automatic network groups exist yet.</p>
            ) : (
              networkGroups.map((group) => {
                const size = memberCountOf(group);
                return (
                  <div key={group.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-white">{group.name}</span>
                      <span className="text-slate-400">
                        {size} / {rule.threshold}
                        {size >= rule.threshold && (
                          <span className="ml-1.5 text-warning-400">split due</span>
                        )}
                      </span>
                    </div>
                    <ProgressBar value={size} max={rule.threshold} />
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>What the rule does not do</CardTitle>
            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                It never edits a user-created group — owner rules stay theirs.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                It never moves a business's city or local area relationship.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                It never changes a group's stage or status — those are separate concepts.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                It reads the threshold from this screen, never a number typed into a page.
              </li>
            </ul>
            <p className="rounded-xl border border-gold-500/30 bg-gold-500/[0.07] p-3 text-[11px] leading-relaxed text-gold-200">
              Change the threshold and walk through the network group again — its "N more members
              needed" moves with it, because both read this configuration.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
