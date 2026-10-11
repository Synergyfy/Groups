import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, Info, Lock, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import Select from "../../components/ui/Select";
import Stepper from "../../components/ui/Stepper";
import type {
  GroupAccessType,
  GroupPricingMode,
  GroupTypeConfig,
  GroupVisibility,
  InteractionLevel,
  UserGroupType,
} from "../../domain/types";
import { GROUP_VISIBILITY_LABELS } from "../../domain/types";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { CITY_NAMES, areasOf } from "../../data/locationsData";
import { INTERACTION_LEVELS } from "../../domain/constants";
import { useAppStore } from "../../store/context";
import { useOwnedGroups, useAppState } from "../../store/selectors";
import { creatableGroupTypes, nonCreatableGroupTypes } from "./groupUtils";

const ACTOR_ID = CURRENT_BUSINESS.id;

const INTERACTION_LABELS: Record<InteractionLevel, string> = {
  read: "Read only — members can read and browse",
  message: "Message — members can post and reply",
  collaborate: "Collaborate — members can post, reply and co-edit",
};

const STEPS = [
  { id: "pricing", label: "Free or Paid" },
  { id: "type", label: "Type" },
  { id: "details", label: "Details" },
  { id: "rules", label: "Rules" },
  { id: "review", label: "Review" },
];

const ACCESS_RULES: { value: GroupAccessType; label: string; hint: string }[] = [
  { value: "open", label: "Open", hint: "Anyone can join instantly — no approval needed." },
  { value: "request", label: "Request", hint: "Members ask to join and the owner approves." },
  {
    value: "eligibility",
    label: "Eligibility",
    hint: "Membership conditions apply before joining.",
  },
  { value: "invitation", label: "Invitation only", hint: "Only the owner can invite people in." },
];

const SIZE_OPTIONS = ["", "6", "12", "18", "24"].map((value) => ({
  value,
  label: value === "" ? "No target size" : `${value} members`,
}));

const FIELD_CLASS =
  "h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function CreateGroupWizardPage() {
  const { adminConfig } = useAppState();
  const creatableTypes = creatableGroupTypes(adminConfig);
  const blockedTypes = nonCreatableGroupTypes(adminConfig);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="06–08 — Create Group Wizard"
        subtitle="Guided creation — Free or Paid → Type → Details → Rules → Review. Available types, access rules and payment limits come from administrator configuration."
        back="/business/groups"
        backLabel="Groups"
      />

      {creatableTypes.length === 0 ? (
        <EmptyState
          title="No group types are available"
          description="Administrators have disabled every group type, so no group can be created right now."
          icon={<Lock className="size-6" />}
          action={
            <LinkButton to="/admin/config/types" size="sm">
              Open Group Type Configuration
            </LinkButton>
          }
        />
      ) : (
        <CreateGroupWizard types={creatableTypes} blockedTypes={blockedTypes} />
      )}
    </div>
  );
}

function CreateGroupWizard({
  types,
  blockedTypes,
}: {
  types: GroupTypeConfig[];
  blockedTypes: GroupTypeConfig[];
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { adminConfig } = useAppState();
  const { dispatch } = useAppStore();
  const ownedGroups = useOwnedGroups(ACTOR_ID);
  const ownedTypes = useMemo(
    () => new Set(ownedGroups.map((group) => group.type)),
    [ownedGroups]
  );
  const paymentRules = adminConfig.paymentRules;

  const rawStep = Number(searchParams.get("step") ?? "0");
  const step = Number.isFinite(rawStep)
    ? Math.min(Math.max(rawStep, 0), STEPS.length - 1)
    : 0;
  const setStep = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    setSearchParams(clamped === 0 ? {} : { step: String(clamped) }, { replace: true });
  };
  const [type, setType] = useState<UserGroupType | "">("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [city, setCity] = useState(CURRENT_BUSINESS.city);
  const [localArea, setLocalArea] = useState(CURRENT_BUSINESS.localArea);
  const [accessType, setAccessType] = useState<GroupAccessType>("open");
  const [visibility, setVisibility] = useState<GroupVisibility>("directory");
  const [interactionLevel, setInteractionLevel] = useState<InteractionLevel>("message");
  const [requiredSize, setRequiredSize] = useState("");
  const [pricing, setPricing] = useState<GroupPricingMode>("free");
  const [presetAmount, setPresetAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [frequencyMode, setFrequencyMode] = useState<"once" | "recurring">("once");
  const [recurringEvery, setRecurringEvery] = useState<"daily" | "weekly" | "monthly">("weekly");

  const areas = useMemo(() => areasOf(city), [city]);

  const inRangePresets = useMemo(
    () =>
      (paymentRules?.presets ?? []).filter(
        (value) => value >= (paymentRules?.minAmount ?? 0) && value <= (paymentRules?.maxAmount ?? 0)
      ),
    [paymentRules]
  );
  const customValue = Number(customAmount);
  const hasCustom = customAmount.trim() !== "";
  const paidAmount = hasCustom ? customValue : presetAmount;
  const effectivePricing: GroupPricingMode = paymentRules?.allowPaid ? pricing : "free";
  const amountInRange =
    paidAmount !== null &&
    Number.isFinite(paidAmount) &&
    paidAmount >= (paymentRules?.minAmount ?? 0) &&
    paidAmount <= (paymentRules?.maxAmount ?? 0);
  const paidValid = effectivePricing === "free" || amountInRange;
  const amountError =
    effectivePricing === "paid" && !paidValid
      ? hasCustom
        ? `Enter an amount between £${paymentRules?.minAmount ?? 0} and £${paymentRules?.maxAmount ?? 0}.`
        : "Choose a contribution amount to continue."
      : null;

  const stepValid =
    step === 0
      ? paidValid
      : step === 1
        ? Boolean(type)
        : step === 2
          ? Boolean(name.trim() && purpose.trim())
          : Boolean(type && name.trim() && purpose.trim() && paidValid);

  const choosePricing = (mode: GroupPricingMode) => {
    setPricing(mode);
    if (mode === "paid" && presetAmount === null && inRangePresets.length > 0) {
      setPresetAmount(inRangePresets[0]);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1 && stepValid) setStep(step + 1);
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const create = () => {
    if (!type || !stepValid) return;
    dispatch({
      type: "group/create",
      owner: { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName },
      input: {
        name: name.trim(),
        type,
        purpose: purpose.trim(),
        accessType,
        visibility,
        interactionLevel,
        pricing: effectivePricing,
        ...(effectivePricing === "paid" && amountInRange && paidAmount !== null
          ? { contribution: paidAmount }
          : {}),
        ...(effectivePricing === "paid"
          ? { contributionFrequency: frequencyMode === "recurring" ? recurringEvery : ("once" as const) }
          : {}),
        ...(city ? { city, ...(localArea ? { localArea } : {}) } : {}),
        ...(requiredSize ? { requiredSize: Number(requiredSize) } : {}),
      },
    });
    navigate("/business/groups/create/success");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card data-tour="step-body">
        <CardBody className="flex flex-col gap-4">
          <div data-tour="stepper">
            <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <CardTitle>Choose a group type</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {types.map((entry) => {
                  const selected = type === entry.type;
                  const alreadyOwned = ownedTypes.has(entry.type);
                  return (
                    <button
                      key={entry.type}
                      type="button"
                      disabled={alreadyOwned}
                      onClick={() => setType(entry.type)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        alreadyOwned
                          ? "cursor-not-allowed border-white/5 bg-ink-950/40 opacity-45"
                          : `cursor-pointer ${
                              selected
                                ? "border-gold-500/50 bg-gold-500/10"
                                : "border-white/10 bg-ink-950/60 hover:border-white/20"
                            }`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{entry.type}</span>
                        {alreadyOwned ? (
                          <Badge variant="muted">Already have one</Badge>
                        ) : selected ? (
                          <Check className="size-4 text-gold-400" />
                        ) : (
                          <span className="size-4 rounded-full border border-white/20" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {alreadyOwned
                          ? `Your business already owns a ${entry.type} group — one group per owner and type.`
                          : `Create and own a ${entry.type} group. The type is fixed once created.`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Info className="size-3.5" />
                <span>Only types enabled for creation in administrator configuration are listed.</span>
                {ownedTypes.size > 0 && (
                  <span className="text-slate-400">
                    Types your business already owns are faded out.
                  </span>
                )}
                {blockedTypes.map((entry) => (
                  <Badge key={entry.type} variant="muted">
                    {entry.type} disabled
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <CardTitle>Group details</CardTitle>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Group name</span>
                <FieldHint>
                  How the group appears in directories, invites and search results.
                </FieldHint>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. West Midlands B2B Exchange"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Purpose</span>
                <FieldHint>
                  Why this group exists — shown on the group page and in invitations.
                </FieldHint>
                <textarea
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  rows={4}
                  placeholder="What does this group exist for?"
                  className={`${FIELD_CLASS} h-auto py-2 leading-relaxed`}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  label="City (optional)"
                  hint="Optional — pins the group to a city for geographic discovery."
                  value={city}
                  onChange={(event) => {
                    const nextCity = event.target.value;
                    setCity(nextCity);
                    setLocalArea(areasOf(nextCity)[0] ?? "");
                  }}
                  options={[
                    { value: "", label: "No location (not location-bound)" },
                    ...CITY_NAMES.map((entry) => ({ value: entry, label: entry })),
                  ]}
                />
                <Select
                  label="Local area"
                  hint="Narrower than city — helps people in your local area find the group."
                  value={localArea}
                  disabled={city === ""}
                  onChange={(event) => setLocalArea(event.target.value)}
                  options={
                    city === ""
                      ? [{ value: "", label: "—" }]
                      : areas.map((entry) => ({ value: entry, label: entry }))
                  }
                />
                <Select
                  label="Target size"
                  hint="Optional goal shown as progress — not a hard cap on members."
                  value={requiredSize}
                  onChange={(event) => setRequiredSize(event.target.value)}
                  options={SIZE_OPTIONS}
                />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
                <Info className="mt-px size-3.5 shrink-0 text-gold-400" />
                Location is optional — Group ≠ Location. Attach a city and local area only when
                members should discover this group geographically; the group itself stays a
                membership container, not a place.
              </div>
              {!stepValid && (
                <p className="text-[11px] text-warning-400">
                  A group name and purpose are required to continue.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <CardTitle>Membership rules</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {ACCESS_RULES.map((rule) => {
                  const selected = accessType === rule.value;
                  return (
                    <button
                      key={rule.value}
                      type="button"
                      onClick={() => setAccessType(rule.value)}
                      className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? "border-gold-500/50 bg-gold-500/10"
                          : "border-white/10 bg-ink-950/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{rule.label}</span>
                        {selected ? (
                          <Check className="size-4 text-gold-400" />
                        ) : (
                          <span className="size-4 rounded-full border border-white/20" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{rule.hint}</p>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Visibility"
                  hint="Who can find this group — directory, members only or private."
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as GroupVisibility)}
                  options={(Object.keys(GROUP_VISIBILITY_LABELS) as GroupVisibility[]).map(
                    (value) => ({ value, label: GROUP_VISIBILITY_LABELS[value] })
                  )}
                />
                <Select
                  label="Interaction level"
                  hint="What members can do inside: read, post and reply, or co-edit."
                  value={interactionLevel}
                  onChange={(event) =>
                    setInteractionLevel(event.target.value as InteractionLevel)
                  }
                  options={INTERACTION_LEVELS.map((value) => ({
                    value,
                    label: INTERACTION_LABELS[value].split(" — ")[0],
                  }))}
                />
              </div>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500">
                <li>
                  Approval requirements are set by administrators in Automatic Group Rules and
                  Group Type Configuration — the access option you pick here must be permitted for
                  this type.
                </li>
              </ul>
            </div>
          )}

          {step === 0 && (
            <div className="flex flex-col gap-4">
              <CardTitle>Free group or paid group?</CardTitle>
              <p className="text-xs leading-relaxed text-slate-400">
                Decide membership pricing before anything else — whether members pay to join, how
                much, and how often. Everything here follows the administrator payment rules, and
                you can review your choice at the end before creating.
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Contribution
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Admin rules: £{paymentRules?.minAmount ?? 0}–£
                    {paymentRules?.maxAmount ?? 0} per member
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => choosePricing("free")}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                      effectivePricing === "free"
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-white/10 bg-ink-950/60 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Users className="size-3.5 text-gold-400" /> Free group
                      </span>
                      {effectivePricing === "free" ? (
                        <Check className="size-4 text-gold-400" />
                      ) : (
                        <span className="size-4 rounded-full border border-white/20" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Membership costs nothing — no money changes hands when members join.
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={!paymentRules?.allowPaid}
                    onClick={() => choosePricing("paid")}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      !paymentRules?.allowPaid
                        ? "cursor-not-allowed border-white/5 bg-ink-950/40 opacity-45"
                        : effectivePricing === "paid"
                          ? "cursor-pointer border-gold-500/50 bg-gold-500/10"
                          : "cursor-pointer border-white/10 bg-ink-950/60 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <CircleDollarSign className="size-3.5 text-gold-400" /> Paid group
                      </span>
                      {!paymentRules?.allowPaid ? (
                        <Badge variant="muted">Admins off</Badge>
                      ) : effectivePricing === "paid" ? (
                        <Check className="size-4 text-gold-400" />
                      ) : (
                        <span className="size-4 rounded-full border border-white/20" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {paymentRules?.allowPaid
                        ? `Members pay a contribution you choose — one-off or recurring — inside £${paymentRules.minAmount}–£${paymentRules.maxAmount}.`
                        : "Administrators have turned paid groups off — only free groups can be created."}
                    </p>
                  </button>
                </div>

                {effectivePricing === "paid" && paymentRules && (
                  <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">Contribution per member</p>
                      <span className="text-[11px] text-slate-500">
                        Allowed £{paymentRules.minAmount}–£{paymentRules.maxAmount}
                      </span>
                    </div>

                    {inRangePresets.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {inRangePresets.map((value) => {
                          const selected = !hasCustom && presetAmount === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setPresetAmount(value);
                                setCustomAmount("");
                              }}
                              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selected
                                  ? "border-gold-500/60 bg-gold-500/15 text-gold-200"
                                  : "border-white/10 bg-ink-950/60 text-slate-300 hover:border-white/25"
                              }`}
                            >
                              £{value}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {paymentRules.allowCustom && (
                      <label className="mt-3 flex flex-col gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400">
                          Custom amount (within the allowed range)
                        </span>
                        <FieldHint>
                          {`What each member pays — it must be between £${paymentRules.minAmount} and £${paymentRules.maxAmount}.`}
                        </FieldHint>
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gold-300">£</span>
                          <input
                            type="number"
                            min={paymentRules.minAmount}
                            max={paymentRules.maxAmount}
                            value={customAmount}
                            onChange={(event) => {
                              setCustomAmount(event.target.value);
                              if (event.target.value.trim() !== "") setPresetAmount(null);
                            }}
                            placeholder={`${paymentRules.minAmount} – ${paymentRules.maxAmount}`}
                            className={`${FIELD_CLASS} h-10`}
                          />
                        </span>
                      </label>
                    )}

                    {!paymentRules.allowCustom && inRangePresets.length === 0 && (
                      <p className="mt-2.5 text-[11px] text-warning-400">
                        Administrators have no preset amounts in range and custom amounts are off —
                        paid groups cannot be configured right now.
                      </p>
                    )}

                    {amountError && (
                      <p className="mt-2 text-[11px] text-warning-400">{amountError}</p>
                    )}

                    <div className="mt-3 flex flex-col gap-2">
                      <span className="text-[11px] font-medium text-slate-400">
                        How often do members pay?
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setFrequencyMode("once")}
                          className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                            frequencyMode === "once"
                              ? "border-gold-500/50 bg-gold-500/10"
                              : "border-white/10 bg-ink-950/60 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white">One-time</span>
                            {frequencyMode === "once" ? (
                              <Check className="size-4 text-gold-400" />
                            ) : (
                              <span className="size-4 rounded-full border border-white/20" />
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Members pay once, when they join.
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFrequencyMode("recurring")}
                          className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                            frequencyMode === "recurring"
                              ? "border-gold-500/50 bg-gold-500/10"
                              : "border-white/10 bg-ink-950/60 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white">Recurring</span>
                            {frequencyMode === "recurring" ? (
                              <Check className="size-4 text-gold-400" />
                            ) : (
                              <span className="size-4 rounded-full border border-white/20" />
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Members pay again on a schedule — daily, weekly or monthly.
                          </p>
                        </button>
                      </div>
                      {frequencyMode === "recurring" && (
                        <div className="flex flex-wrap gap-2">
                          {(["daily", "weekly", "monthly"] as const).map((every) => {
                            const selected = recurringEvery === every;
                            return (
                              <button
                                key={every}
                                type="button"
                                onClick={() => setRecurringEvery(every)}
                                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                                  selected
                                    ? "border-gold-500/60 bg-gold-500/15 text-gold-200"
                                    : "border-white/10 bg-ink-950/60 text-slate-300 hover:border-white/25"
                                }`}
                              >
                                {every}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-300">
                      {amountInRange ? (
                        frequencyMode === "recurring" ? (
                          <>
                            Each member pays{" "}
                            <span className="font-semibold text-white">£{paidAmount}</span>{" "}
                            <span className="capitalize">{recurringEvery}</span> — the first
                            payment is due when they join this group.
                          </>
                        ) : (
                          <>
                            Each member pays{" "}
                            <span className="font-semibold text-white">£{paidAmount}</span> once,
                            when they join this group.
                          </>
                        )
                      ) : (
                        "Pick a preset or enter a custom amount to see what each member pays."
                      )}
                    </p>

                    <div className="mt-2.5 border-t border-white/10 pt-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Payment process
                      </p>
                      <ol className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-slate-400">
                        <li>
                          <span className="font-semibold text-slate-200">
                            1. You set the contribution
                          </span>{" "}
                          — an amount inside the admin range (£{paymentRules.minAmount}–£
                          {paymentRules.maxAmount}), one-time or recurring.
                        </li>
                        <li>
                          <span className="font-semibold text-slate-200">
                            2. Members pay to join
                          </span>{" "}
                          — the amount is shown before they confirm
                          {frequencyMode === "recurring"
                            ? `, and £${paidAmount} ${recurringEvery} repeats until they leave`
                            : ", and payment is due when they join"}
                          .
                        </li>
                        <li>
                          <span className="font-semibold text-slate-200">
                            3. Each payment is recorded
                          </span>{" "}
                          — the contribution is logged in the group activity feed.
                        </li>
                        <li>
                          <span className="font-semibold text-slate-200">
                            4. You track the money
                          </span>{" "}
                          —{" "}
                          {frequencyMode === "recurring"
                            ? "upcoming and paid contributions are visible"
                            : "paid vs outstanding contributions are visible"}{" "}
                          from the members list.
                        </li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <CardTitle>Review and create</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReviewRow label="Type" value={type ?? "—"} />
                <ReviewRow label="Name" value={name.trim() || "—"} />
                <ReviewRow label="Purpose" value={purpose.trim() || "—"} wide />
                <ReviewRow
                  label="Location"
                  value={city ? `${localArea || city}, ${city}` : "Not location-bound"}
                />
                <ReviewRow
                  label="Access"
                  value={ACCESS_RULES.find((rule) => rule.value === accessType)?.label ?? accessType}
                />
                <ReviewRow label="Visibility" value={GROUP_VISIBILITY_LABELS[visibility]} />
                <ReviewRow
                  label="Interaction"
                  value={INTERACTION_LABELS[interactionLevel].split(" — ")[0]}
                />
                <ReviewRow
                  label="Target size"
                  value={requiredSize ? `${requiredSize} members` : "No target size"}
                />
                <ReviewRow
                  label="Contribution"
                  value={
                    effectivePricing === "paid" && amountInRange && paidAmount !== null
                      ? `£${paidAmount} ${
                          frequencyMode === "recurring"
                            ? `${recurringEvery} per member`
                            : "one-off per member"
                        } — paid group`
                      : "Free group — no contribution"
                  }
                />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-[11px] leading-relaxed text-gold-200">
                <Info className="mt-px size-3.5 shrink-0" />
                You become the owner of this group. The type, source and access rules cannot be
                changed afterwards — only an administrator can reconfigure group types.
              </div>
              {effectivePricing === "paid" && amountInRange && paidAmount !== null && (
                <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                  <CircleDollarSign className="mt-px size-3.5 shrink-0 text-gold-400" />
                  {frequencyMode === "recurring"
                    ? `Payment process: members pay £${paidAmount} ${recurringEvery} — the first payment is due when they join, each payment is recorded in the group activity feed, and you track upcoming and paid contributions from the members list.`
                    : `Payment process: members pay £${paidAmount} once when they join, each payment is recorded in the group activity feed, and you track paid vs outstanding contributions from the members list.`}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="sticky bottom-[4.5rem] z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-950/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border lg:px-5">
        <span className="text-[11px] font-medium text-slate-500" aria-live="polite">
          Step {step + 1} of {STEPS.length} · {STEPS[step].label}
        </span>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="ghost"
            size="md"
            onClick={back}
            disabled={step === 0}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="md"
              onClick={next}
              disabled={!stepValid}
              className="flex-1 sm:flex-none"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={create}
              disabled={!stepValid}
              className="flex-1 sm:flex-none"
            >
              Create group
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-ink-950/60 p-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
