import { useState } from "react";
import { Plus, X } from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import type { GroupPaymentRules } from "../../domain/types";
import { useAppStore } from "../../store/context";
import { useAppState } from "../../store/selectors";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs">
      <span>
        <span className="font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
      />
    </label>
  );
}

export default function GroupTypeConfigPage() {
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [newStage, setNewStage] = useState("");
  const [newPreset, setNewPreset] = useState("");

  const groupTypes = state.adminConfig.groupTypes;
  const stageLabels = state.adminConfig.stageLabels;
  const paymentRules = state.adminConfig.paymentRules;

  const updateType = (index: number, patch: Partial<(typeof groupTypes)[number]>) => {
    const next = groupTypes.map((entry, position) =>
      position === index ? { ...entry, ...patch } : entry
    );
    dispatch({ type: "admin/update-config", patch: { groupTypes: next } });
  };

  const addStage = () => {
    const label = newStage.trim();
    if (!label || stageLabels.includes(label)) return;
    dispatch({ type: "admin/update-config", patch: { stageLabels: [...stageLabels, label] } });
    setNewStage("");
  };

  const removeStage = (label: string) => {
    if (stageLabels.length <= 1) return;
    dispatch({
      type: "admin/update-config",
      patch: { stageLabels: stageLabels.filter((entry) => entry !== label) },
    });
  };

  const updatePayments = (patch: Partial<GroupPaymentRules>) => {
    dispatch({ type: "admin/update-config", patch: { paymentRules: patch } });
  };

  const setMinAmount = (raw: string) => {
    const next = Math.max(0, Number(raw) || 0);
    updatePayments({ minAmount: next, maxAmount: Math.max(next, paymentRules.maxAmount) });
  };

  const setMaxAmount = (raw: string) => {
    const next = Math.max(0, Number(raw) || 0);
    updatePayments({ maxAmount: next, minAmount: Math.min(next, paymentRules.minAmount) });
  };

  const addPreset = () => {
    const value = Number(newPreset);
    if (!Number.isFinite(value) || value <= 0 || paymentRules.presets.includes(value)) return;
    updatePayments({
      presets: [...paymentRules.presets, value].sort((a, b) => a - b),
    });
    setNewPreset("");
  };

  const removePreset = (value: number) => {
    updatePayments({ presets: paymentRules.presets.filter((entry) => entry !== value) });
  };

  const enabledCount = groupTypes.filter((entry) => entry.enabled).length;
  const creatableCount = groupTypes.filter((entry) => entry.enabled && entry.allowCreate).length;
  const joinableCount = groupTypes.filter((entry) => entry.enabled && entry.allowJoin).length;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="21 — Group Type Configuration"
        back="/admin/groups"
        subtitle="The switchboard behind every group type: whether it exists, whether a business may create one and whether anyone may join one — plus the stage labels used across the app."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Configured types"
          value={groupTypes.length.toLocaleString("en-GB")}
          hint="From admin configuration"
          accent="gold"
        />
        <StatCard
          label="Enabled"
          value={enabledCount.toLocaleString("en-GB")}
          hint="Visible across the platform"
          accent="success"
        />
        <StatCard
          label="Creatable"
          value={creatableCount.toLocaleString("en-GB")}
          hint="Offered in Create Group"
          accent="info"
        />
        <StatCard
          label="Joinable"
          value={joinableCount.toLocaleString("en-GB")}
          hint="Shown in Explore Groups"
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="types">
        {groupTypes.map((entry, index) => (
          <Card key={entry.type}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{entry.type}</CardTitle>
              </div>
              <Toggle
                label="Enabled"
                hint="Off means the type disappears everywhere — wizard, explore, register."
                checked={entry.enabled}
                onChange={(next) => updateType(index, { enabled: next })}
              />
              <Toggle
                label="Allow creation"
                hint="Businesses may create groups of this type in the wizard."
                checked={entry.allowCreate}
                onChange={(next) => updateType(index, { allowCreate: next })}
              />
              <Toggle
                label="Allow joining"
                hint="Members can join or request this type in Explore Groups."
                checked={entry.allowJoin}
                onChange={(next) => updateType(index, { allowJoin: next })}
              />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3" data-tour="stages">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Stage labels</CardTitle>
              <span className="text-[11px] text-slate-500">
                {stageLabels.length} label{stageLabels.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              A stage is a label, never a status. These are the options the Create Group wizard and
              the group register offer.
            </p>
            <div className="flex flex-wrap gap-2">
              {stageLabels.map((label, index) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-xs text-white"
                >
                  <span className="text-slate-500">{index + 1}</span>
                  {label}
                  <button
                    type="button"
                    onClick={() => removeStage(label)}
                    disabled={stageLabels.length <= 1}
                    aria-label={`Remove ${label}`}
                    className="cursor-pointer text-slate-500 transition-colors hover:text-danger-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <FieldHint>Type a label and press Add (or Enter) — duplicate labels are ignored.</FieldHint>
            <div className="flex flex-wrap gap-2">
              <input
                value={newStage}
                onChange={(event) => setNewStage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addStage();
                  }
                }}
                placeholder="New stage label"
                className="h-10 min-w-48 flex-1 rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={addStage}
                disabled={newStage.trim().length === 0}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-4" /> Add stage
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>What these switches change</CardTitle>
            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                Create Group only offers types with enabled + allow create.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                Explore Groups hides types that cannot be joined.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                Existing groups keep their type even when it is switched off — the register shows
                them with a note.
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card data-tour="payments">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Paid groups &amp; contributions</CardTitle>
            <span className="text-[11px] text-slate-500">
              Allowed range: £{paymentRules.minAmount} – £{paymentRules.maxAmount} per member
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Decide whether owners may charge a contribution when they create a group. The Create
            Group wizard only offers a paid group when this is switched on, and the amount owners
            can pick is limited by the range and options configured here.
          </p>
          <Toggle
            label="Allow paid groups"
            hint="Off means every new group is free — the wizard hides the paid option."
            checked={paymentRules.allowPaid}
            onChange={(next) => updatePayments({ allowPaid: next })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <span className="text-[11px] font-medium text-slate-400">Minimum amount (£)</span>
              <FieldHint>
                The smallest contribution the wizard offers; it can never exceed the maximum.
              </FieldHint>
              <input
                type="number"
                min={0}
                value={paymentRules.minAmount}
                onChange={(event) => setMinAmount(event.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none focus:border-gold-500/50"
              />
            </label>
            <label className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              <span className="text-[11px] font-medium text-slate-400">Maximum amount (£)</span>
              <FieldHint>
                The largest contribution the wizard offers; it can never drop below the minimum.
              </FieldHint>
              <input
                type="number"
                min={0}
                value={paymentRules.maxAmount}
                onChange={(event) => setMaxAmount(event.target.value)}
                className="h-8 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none focus:border-gold-500/50"
              />
            </label>
          </div>
          <Toggle
            label="Allow custom amounts"
            hint="Owners can type any amount inside the range instead of picking a preset."
            checked={paymentRules.allowCustom}
            onChange={(next) => updatePayments({ allowCustom: next })}
          />
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-medium text-slate-400">
              Preset amounts owners can select
            </span>
            <div className="flex flex-wrap gap-2">
              {paymentRules.presets.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-xs text-white"
                >
                  £{value}
                  <button
                    type="button"
                    onClick={() => removePreset(value)}
                    aria-label={`Remove £${value} preset`}
                    className="cursor-pointer text-slate-500 transition-colors hover:text-danger-400"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              {paymentRules.presets.length === 0 && (
                <span className="text-[11px] text-slate-500">
                  No presets — owners pick a custom amount (if allowed above).
                </span>
              )}
            </div>
            <FieldHint>Type an amount above £0 and press Add — duplicate presets are ignored.</FieldHint>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min={0}
                value={newPreset}
                onChange={(event) => setNewPreset(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addPreset();
                  }
                }}
                placeholder="Amount in £"
                className="h-10 min-w-40 flex-1 rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={addPreset}
                disabled={newPreset.trim().length === 0}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-4" /> Add preset
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Presets outside £{paymentRules.minAmount}–£{paymentRules.maxAmount} are hidden from
              the wizard. Keep at least one in-range preset or allow custom amounts so owners can
              charge for a group.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
