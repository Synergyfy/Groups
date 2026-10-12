import { useState } from "react";
import { Check, Circle, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { DURATIONS } from "../../domain/constants";
import type { CampaignDuration, CircleTypeConfigEntry, MandatoryCircleRule } from "../../domain/types";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

const ACCENT_PRESETS = [
  "#a78bfa",
  "#fb7185",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#e6a92b",
  "#f472b6",
];

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-gold-500/40";

interface CircleFormState {
  type: string;
  shortLabel: string;
  description: string;
  accent: string;
  mandatory: boolean;
  requiresBanker: boolean;
  minMembers: string;
  maxMembers: string;
  allowedDurations: CampaignDuration[];
}

function emptyForm(): CircleFormState {
  return {
    type: "",
    shortLabel: "",
    description: "",
    accent: ACCENT_PRESETS[0],
    mandatory: false,
    requiresBanker: false,
    minMembers: "1",
    maxMembers: "",
    allowedDurations: [90, 180],
  };
}

function formFromEntry(entry: CircleTypeConfigEntry): CircleFormState {
  return {
    type: entry.type,
    shortLabel: entry.shortLabel,
    description: entry.description,
    accent: entry.accent,
    mandatory: entry.mandatory,
    requiresBanker: entry.requiresBanker,
    minMembers: entry.minMembers === null ? "" : String(entry.minMembers),
    maxMembers: entry.maxMembers === null ? "" : String(entry.maxMembers),
    allowedDurations: [...entry.allowedDurations],
  };
}

function accentSoft(accent: string): string {
  const hex = accent.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

function validate(form: CircleFormState, taken: string[], selfType?: string): string | null {
  if (form.type.trim().length === 0) return "Enter the circle type name.";
  if (form.shortLabel.trim().length === 0) return "Enter a short label.";
  if (form.description.trim().length === 0) return "Write a one-line description businesses will read.";
  const clash = taken.some(
    (name) => name.toLowerCase() === form.type.trim().toLowerCase() && name !== selfType
  );
  if (clash) return "A circle type with that name already exists.";
  if (form.allowedDurations.length === 0) return "Allow at least one duration.";
  if (form.minMembers !== "" && Number(form.minMembers) < 0) return "Minimum members cannot be negative.";
  if (form.maxMembers !== "" && form.minMembers !== "" && Number(form.maxMembers) < Number(form.minMembers)) {
    return "Maximum members cannot be lower than the minimum.";
  }
  return null;
}

function toEntry(form: CircleFormState, id: string): CircleTypeConfigEntry {
  return {
    id,
    type: form.type.trim(),
    shortLabel: form.shortLabel.trim(),
    description: form.description.trim(),
    accent: form.accent,
    accentSoft: accentSoft(form.accent),
    enabled: true,
    mandatory: form.mandatory,
    minMembers: form.minMembers === "" ? null : Number(form.minMembers),
    maxMembers: form.maxMembers === "" ? null : Number(form.maxMembers),
    requiresBanker: form.requiresBanker,
    allowedDurations: [...form.allowedDurations],
  };
}

export default function AdminCircleConfigPage() {
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CircleFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CircleFormState | null>(null);

  const circleTypes = state.adminConfig.circleTypes;
  const mandatoryCircles = state.adminConfig.mandatoryCircles;
  const typeNames = circleTypes.map((entry) => entry.type);

  const enabledCount = circleTypes.filter((c) => c.enabled).length;
  const mandatoryCount = circleTypes.filter((c) => c.mandatory).length;

  const create = () => {
    const error = validate(createForm, typeNames);
    if (error) {
      setFormError(error);
      return;
    }
    const entry = toEntry(createForm, `ct-${Date.now().toString(36)}`);
    dispatch({ type: "admin/circle-type-create", entry, actor: ADMIN_ACTOR });
    setCreateForm(emptyForm());
    setFormError(null);
    setFeedback(`“${entry.type}” created — businesses now see it when building a circle`);
  };

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    const existing = circleTypes.find((entry) => entry.id === editingId);
    if (!existing) return;
    const error = validate(editForm, typeNames, existing.type);
    if (error) {
      setFormError(error);
      return;
    }
    const next = toEntry(editForm, editingId);
    dispatch({
      type: "admin/circle-type-update",
      id: editingId,
      patch: { ...next, enabled: existing.enabled },
      actor: ADMIN_ACTOR,
    });
    setEditingId(null);
    setEditForm(null);
    setFormError(null);
    setFeedback(`“${next.type}” updated`);
  };

  const remove = (entry: CircleTypeConfigEntry) => {
    if (state.circles.some((circle) => circle.type === entry.type)) {
      setFeedback(`“${entry.type}” is in use by an existing circle — disable it instead of deleting.`);
      return;
    }
    dispatch({ type: "admin/circle-type-delete", id: entry.id, actor: ADMIN_ACTOR });
    if (editingId === entry.id) {
      setEditingId(null);
      setEditForm(null);
    }
    setFeedback(`“${entry.type}” deleted`);
  };

  const toggleEnabled = (entry: CircleTypeConfigEntry, enabled: boolean) => {
    dispatch({ type: "admin/circle-type-update", id: entry.id, patch: { enabled }, actor: ADMIN_ACTOR });
    setFeedback(`“${entry.type}” ${enabled ? "enabled" : "disabled"}`);
  };

  const startEdit = (entry: CircleTypeConfigEntry) => {
    setEditingId(entry.id);
    setEditForm(formFromEntry(entry));
    setFormError(null);
  };

  const updateMandatory = (index: number, value: Partial<MandatoryCircleRule>) => {
    const next = mandatoryCircles.map((entry, i) => (i === index ? { ...entry, ...value } : entry));
    dispatch({ type: "admin/update-config", patch: { mandatoryCircles: next } });
    setFeedback("Mandatory circle rule updated");
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Circle Type Configuration"
        tip="Everything a business can choose when building a circle is defined here. Create the type, set its rules, then enable it — it appears immediately in every business dashboard."
        subtitle="Circle types are authored by you, not built into the product. Each type carries its own name, description, colour, member limits, banker requirement and allowed durations."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Circle types" value={String(circleTypes.length)} hint="Defined by you" accent="gold" />
        <StatCard label="Enabled" value={String(enabledCount)} hint="Visible to businesses" accent="success" />
        <StatCard label="Mandatory" value={String(mandatoryCount)} hint="Must be maintained" accent="warning" />
        <StatCard
          label="Banker required"
          value={String(circleTypes.filter((c) => c.requiresBanker).length)}
          hint="Rotational payout types"
          accent="info"
        />
      </div>

      {/* Create */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <CardTitle>Create a circle type</CardTitle>
                <TipIcon text="This is a definition, not a circle. Creating it makes the type selectable — the actual circle is built later by a business." />
              </div>
              <FieldHint>
                The name is what businesses see, so write it the way they would say it — for example
                “Renewable Energy Circle”.
              </FieldHint>
            </div>
            <Badge variant="gold">Admin authored</Badge>
          </div>

          <CircleTypeFields form={createForm} onChange={(next) => setCreateForm(next)} />

          {formError && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <Button variant="primary" size="md" onClick={create}>
              <Plus className="size-4" /> Create circle type
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Existing types */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-white">Configured circle types</h2>
          <TipIcon text="Disable a type to hide it from businesses without deleting it. Disabled types stay attached to any circle already using them." />
        </div>

        {circleTypes.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-xs text-slate-400">
                No circle types yet. Create one above and it will appear in every business dashboard.
              </p>
            </CardBody>
          </Card>
        )}

        {circleTypes.map((entry) => {
          const editing = editingId === entry.id;
          return (
            <Card key={entry.id}>
              <CardBody className="flex flex-col gap-3">
                {editing && editForm ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>Edit “{entry.type}”</CardTitle>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                          setFormError(null);
                        }}
                        aria-label="Cancel editing"
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <CircleTypeFields form={editForm} onChange={(next) => setEditForm(next)} />
                    {formError && (
                      <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
                        {formError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                          setFormError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" size="md" onClick={saveEdit}>
                        <Check className="size-4" /> Save changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                          style={{ backgroundColor: entry.accentSoft, borderColor: `${entry.accent}55`, color: entry.accent }}
                        >
                          <Circle className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{entry.type}</p>
                          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-slate-500">
                            {entry.description}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Members: {entry.minMembers ?? "any"}
                            {entry.maxMembers !== null && `–${entry.maxMembers}`}
                            {entry.requiresBanker && " · Banker required"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={entry.enabled ? "success" : "muted"}>
                          {entry.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {entry.mandatory && <Badge variant="gold">Mandatory</Badge>}
                        <Toggle
                          label={entry.enabled ? "Hide" : "Show"}
                          checked={entry.enabled}
                          onChange={(v) => toggleEnabled(entry, v)}
                        />
                        <Button variant="outline" size="sm" onClick={() => startEdit(entry)}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => remove(entry)} aria-label={`Delete ${entry.type}`}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Durations
                      </span>
                      {entry.allowedDurations.length === 0 ? (
                        <span className="text-[11px] text-warning-400">None allowed</span>
                      ) : (
                        entry.allowedDurations.map((d) => (
                          <span key={d} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                            {d} days
                          </span>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Mandatory circle rules */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-gold-400" />
          <h2 className="text-sm font-semibold text-white">Mandatory circle rules</h2>
          <TipIcon text="A rule says a tier of business must keep at least one circle of this type. Turn on Auto-enforce to block group creation when the rule is not met." />
        </div>
        <p className="text-xs text-slate-400">
          Rules that determine which circle types a business must maintain. Enforcement is controlled per rule.
        </p>
        {mandatoryCircles.map((rule, index) => (
          <Card key={rule.circleType}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{rule.circleType}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Applies to: {rule.appliesToTier} · Min members: {rule.minMemberCount}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle label="Required" checked={rule.required} onChange={(v) => updateMandatory(index, { required: v })} />
                <Toggle label="Auto-enforce" checked={rule.autoEnforce} onChange={(v) => updateMandatory(index, { autoEnforce: v })} />
                <select
                  value={rule.appliesToTier}
                  aria-label="Tier this rule applies to"
                  onChange={(e) => updateMandatory(index, { appliesToTier: e.target.value as MandatoryCircleRule["appliesToTier"] })}
                  className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[11px] text-white focus:border-gold-500/40 focus:outline-none"
                >
                  <option value="All">All tiers</option>
                  <option value="Free">Free only</option>
                  <option value="Paid">Paid only</option>
                </select>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function CircleTypeFields({
  form,
  onChange,
}: {
  form: CircleFormState;
  onChange: (next: CircleFormState) => void;
}) {
  const set = <K extends keyof CircleFormState>(key: K, value: CircleFormState[K]) =>
    onChange({ ...form, [key]: value } as CircleFormState);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-white">Type name</span>
          <FieldHint>Shown to businesses when they choose what kind of circle to build.</FieldHint>
          <input
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            placeholder="e.g. Renewable Energy Circle"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-white">Short label</span>
          <FieldHint>Compact form used in sidebars, chips and stat cards.</FieldHint>
          <input
            value={form.shortLabel}
            onChange={(e) => set("shortLabel", e.target.value)}
            placeholder="e.g. Renewables"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-semibold text-white">Description</span>
        <FieldHint>One sentence a business reads before selecting this type.</FieldHint>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="What this circle type is for and who it reaches."
          className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-gold-500/40"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">Accent colour</span>
          <TipIcon text="Used for the type badge and dot in the circle workspace so the type is recognisable at a glance." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((colour) => (
            <button
              key={colour}
              type="button"
              onClick={() => set("accent", colour)}
              aria-label={`Use accent ${colour}`}
              className={`flex size-7 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-110 ${
                form.accent === colour ? "border-white ring-2 ring-white/40" : "border-white/20"
              }`}
              style={{ backgroundColor: colour }}
            >
              {form.accent === colour && <Check className="size-3.5 text-ink-950" strokeWidth={3} />}
            </button>
          ))}
          <input
            type="color"
            value={form.accent}
            onChange={(e) => set("accent", e.target.value)}
            aria-label="Custom accent colour"
            className="h-7 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-semibold text-white">Minimum members</span>
          <FieldHint>Lowest number of contacts a circle of this type must start with.</FieldHint>
          <input
            type="number"
            min={0}
            value={form.minMembers}
            onChange={(e) => set("minMembers", e.target.value)}
            placeholder="1"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white">Maximum members</span>
            <TipIcon text="Leave empty for no upper limit. When set, the circle refuses further members once it is full." />
          </div>
          <FieldHint>Leave empty for unlimited.</FieldHint>
          <input
            type="number"
            min={0}
            value={form.maxMembers}
            onChange={(e) => set("maxMembers", e.target.value)}
            placeholder="Unlimited"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">Allowed durations</span>
          <TipIcon text="Only the ticked durations are offered to businesses on the circle creation screen." />
        </div>
        <FieldHint>Choose at least one. Durations are in days.</FieldHint>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((value) => {
            const active = form.allowedDurations.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  set(
                    "allowedDurations",
                    active
                      ? form.allowedDurations.filter((d) => d !== value)
                      : [...form.allowedDurations, value].sort((a, b) => a - b)
                  )
                }
                className={`h-9 cursor-pointer rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  active
                    ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                    : "border-white/10 bg-ink-950/60 text-slate-400"
                }`}
              >
                {value}d
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle
          label="Mandatory"
          checked={form.mandatory}
          onChange={(v) => set("mandatory", v)}
        />
        <Toggle
          label="Banker required"
          checked={form.requiresBanker}
          onChange={(v) => set("requiresBanker", v)}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">Mandatory</span> — the type appears in the
        “must maintain” list for businesses.{" "}
        <span className="font-semibold text-slate-400">Banker required</span> — a circle of this
        type cannot be created unless a finance contact is included.
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-white/10 bg-white/5 text-slate-500"
      }`}
    >
      {label}
    </button>
  );
}
