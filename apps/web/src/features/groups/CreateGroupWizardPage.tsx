import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  CircleDot,
  Info,
  ListChecks,
  Lock,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import Modal from "../../components/ui/Modal";
import SectionHeader from "../../components/ui/SectionHeader";
import Select from "../../components/ui/Select";
import { SkeletonCard } from "../../components/ui/Skeleton";
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
import { INTERACTION_LEVELS } from "../../domain/constants";
import {
  useBusinessId,
  useCanCreateGroups,
  useCreationRightsLabel,
  useMandatoryGroupStatuses,
  usePlan,
  useOwnedGroups,
  useAppState,
  usePlatformGroup,
} from "../../store/selectors";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";
import type { GeographyBoroughDetail } from "../../business/businessApi";
import { creatableGroupTypes, nonCreatableGroupTypes, pendingMandatoryTypes, typeForcedPaid } from "./groupUtils";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { adminConfig } = useAppState();
  const { circles } = useBusinessData();
  const actorId = useBusinessId();
  const canCreate = useCanCreateGroups();
  const rightsLabel = useCreationRightsLabel();
  const plan = usePlan();
  const platformGroup = usePlatformGroup();
  const mandatoryGroups = useMandatoryGroupStatuses(actorId);
  const creatableTypes = creatableGroupTypes(adminConfig);
  const blockedTypes = nonCreatableGroupTypes(adminConfig);

  const requestedType = searchParams.get("type") ?? "";
  const missingCircles = (circles?.mandatoryCircles ?? []).filter(
    (entry) => entry.required && !entry.satisfied,
  );
  const missingGroups = mandatoryGroups.filter(
    (entry) => entry.required && !entry.satisfied,
  );
  const requestedIsMissingRequiredGroup =
    missingGroups.some((entry) => entry.type === requestedType) &&
    creatableTypes.some((entry) => entry.type === requestedType);
  // `circles` is null until the business data provider has loaded. Do not show
  // the wizard before the prerequisite check can run.
  const circlesReady = circles !== null;
  const circleBlocker = circlesReady && missingCircles.length > 0;
  const groupBlocker =
    circlesReady &&
    missingCircles.length === 0 &&
    missingGroups.length > 0 &&
    !requestedIsMissingRequiredGroup;

  const circlesHref = "/business/circles/create";
  const nextRequiredGroup = missingGroups[0];
  const groupHref = nextRequiredGroup
    ? `/business/groups/create?type=${encodeURIComponent(nextRequiredGroup.type)}`
    : "/business/groups";

  const blockedTitle = circleBlocker
    ? "Set up your required circles first"
    : "Create your required groups first";

  const blockedDescription = circleBlocker
    ? "Your administrator requires these circles before any group can be created. A circle is built from contacts in your My Network lists."
    : "Your administrator requires these group types before any other group can be created.";

  const blockedActionLabel = circleBlocker
    ? "Set up circles"
    : `Create ${nextRequiredGroup?.type ?? "required"} group`;

  const lockedCallout = (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-ink-950 text-gold-500">
          {circleBlocker ? (
            <CircleDot className="size-6" />
          ) : (
            <ListChecks className="size-6" />
          )}
        </div>
        <p className="text-sm font-semibold text-white">{blockedTitle}</p>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          {blockedDescription}
        </p>
        <LinkButton to={circleBlocker ? circlesHref : groupHref} size="sm">
          {blockedActionLabel}
        </LinkButton>
      </CardBody>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="06–08 — Create Group Wizard"
        subtitle="Guided creation — Free or Paid → Type → Details → Rules → Review. Available types, access rules and payment limits come from administrator configuration."
        back="/business/groups"
        backLabel="Groups"
      />

      {!canCreate ? (
        <EmptyState
          title="Your plan cannot create groups"
          description={`${rightsLabel} may create groups. You are on ${plan.planName} ${plan.variant}, so administrators place your plan into ${
            platformGroup?.name ?? "the admin-set platform group"
          } instead — head start groups are still provided in your dashboard. Upgrade your plan to open this wizard.`}
          icon={<Lock className="size-6" />}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {platformGroup && (
                <LinkButton
                  to={`/business/groups/${platformGroup.id}`}
                  variant="outline"
                  size="sm"
                >
                  Open platform group
                </LinkButton>
              )}
              <LinkButton to="/business/groups" size="sm">
                Back to groups
              </LinkButton>
            </div>
          }
        />
      ) : creatableTypes.length === 0 ? (
        <EmptyState
          title="No group types are available"
          description="Administrators have disabled every group type, so no group can be created right now."
          icon={<Lock className="size-6" />}
        />
      ) : !circlesReady ? (
        <SkeletonCard />
      ) : circleBlocker || groupBlocker ? (
        <>
          {lockedCallout}
          <Modal
            open
            title={blockedTitle}
            onClose={() => navigate("/business/groups")}
            footer={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/business/groups")}
                >
                  Back to groups
                </Button>
                <LinkButton
                  to={circleBlocker ? circlesHref : groupHref}
                  size="sm"
                >
                  {blockedActionLabel}
                </LinkButton>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-slate-400">
                {blockedDescription}
              </p>

              {circleBlocker ? (
                <>
                  <ul className="flex flex-col gap-2">
                    {missingCircles.map((entry) => (
                      <li
                        key={entry.circleType}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-white">
                          {entry.circleType}
                        </span>
                        <Badge variant="warning">
                          {entry.current}/{entry.minMemberCount ?? 1} members
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Circles are your marketing and advertising audiences. Build
                    one from a My Network list with at least one confirmed
                    contact.
                  </p>
                </>
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {missingGroups.map((entry) => (
                      <li
                        key={entry.type}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-white">
                          {entry.type} group
                        </span>
                        <Badge
                          variant={entry.pricing === "paid" ? "gold" : "muted"}
                        >
                          {entry.pricing === "paid"
                            ? "Paid group"
                            : "Free or paid"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Create these first — every other group type unlocks once they
                    exist.
                  </p>
                </>
              )}
            </div>
          </Modal>
        </>
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
  const actorId = useBusinessId();
  const { refresh, locations, location } = useBusinessData();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const ownedGroups = useOwnedGroups(actorId);
  const ownedTypes = useMemo(
    () => new Set(ownedGroups.map((group) => group.type)),
    [ownedGroups]
  );
  const paymentRules = adminConfig.paymentRules;

  // Hard mandate: while required groups are missing, only those types are offered.
  const creatableSet = useMemo(() => new Set(types.map((entry) => entry.type)), [types]);
  const allPendingTypes = useMemo(
    () => pendingMandatoryTypes(adminConfig, ownedTypes),
    [adminConfig, ownedTypes]
  );
  const pendingTypes = useMemo(
    () => allPendingTypes.filter((entry) => creatableSet.has(entry)),
    [allPendingTypes, creatableSet]
  );
  const mandateActive = allPendingTypes.length > 0;
  const pendingSet = useMemo(() => new Set(pendingTypes), [pendingTypes]);

  const rawStep = Number(searchParams.get("step") ?? "0");
  const step = Number.isFinite(rawStep)
    ? Math.min(Math.max(rawStep, 0), STEPS.length - 1)
    : 0;
  const setStep = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    const nextParams: Record<string, string> = {};
    // Keep the preset type in the URL so a refresh or back/forward keeps the
    // skipped Type step skipped.
    const typeParam = searchParams.get("type");
    if (typeParam) nextParams.type = typeParam;
    if (clamped !== 0) nextParams.step = String(clamped);
    setSearchParams(nextParams, { replace: true });
  };
  // The dashboard's "Create" links deep-link here with ?type= — preselect it,
  // but only when it is creatable, still required (or the mandate is satisfied)
  // and not already owned.
  const presetCandidate = (searchParams.get("type") ?? "") as UserGroupType;
  const validPreset =
    creatableSet.has(presetCandidate) &&
    !ownedTypes.has(presetCandidate) &&
    (!mandateActive || pendingSet.has(presetCandidate));
  const presetForcedPaid = validPreset && typeForcedPaid(adminConfig, presetCandidate);
  const initialPresetAmount = presetForcedPaid
    ? ((paymentRules?.presets ?? []).find(
        (value) =>
          value >= (paymentRules?.minAmount ?? 0) &&
          value <= (paymentRules?.maxAmount ?? 0)
      ) ?? null)
    : null;
  const [type, setType] = useState<UserGroupType | "">(validPreset ? presetCandidate : "");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  // A group created by a business inherits that business's Central Hub
  // location chain — city, borough, high street and local mall — so members
  // in the same area discover it automatically. Only a city Central Hub knows
  // is pre-filled: anything else (a placeholder such as "Unspecified", or a
  // street address) would be rejected when the group is saved.
  const myLocation = location?.current ?? null;
  const knownCity = useMemo(
    () =>
      myLocation?.city &&
      (locations?.cities ?? []).some((entry) => entry.name === myLocation.city)
        ? myLocation.city
        : "",
    [myLocation, locations],
  );
  const [city, setCity] = useState(knownCity);
  const [localArea, setLocalArea] = useState(
    knownCity ? (myLocation?.borough ?? myLocation?.localArea ?? "") : "",
  );
  const [highStreet, setHighStreet] = useState(knownCity ? (myLocation?.highStreet ?? "") : "");
  const [localMall, setLocalMall] = useState(knownCity ? (myLocation?.localMall ?? "") : "");
  const [boroughDetail, setBoroughDetail] =
    useState<GeographyBoroughDetail | null>(null);
  const [accessType, setAccessType] = useState<GroupAccessType>("open");
  const [visibility, setVisibility] = useState<GroupVisibility>("directory");
  const [interactionLevel, setInteractionLevel] = useState<InteractionLevel>("message");
  const [requiredSize, setRequiredSize] = useState("");
  const [pricing, setPricing] = useState<GroupPricingMode>(
    presetForcedPaid ? "paid" : "free"
  );
  const [presetAmount, setPresetAmount] = useState<number | null>(
    initialPresetAmount
  );
  const [customAmount, setCustomAmount] = useState("");
  const [frequencyMode, setFrequencyMode] = useState<"once" | "recurring">("once");
  const [recurringEvery, setRecurringEvery] = useState<"daily" | "weekly" | "monthly">("weekly");

  const cityNode = useMemo(
    () => locations?.cities.find((entry) => entry.name === city) ?? null,
    [locations, city],
  );
  const boroughNode = useMemo(
    () => cityNode?.boroughs.find((entry) => entry.name === localArea) ?? null,
    [cityNode, localArea],
  );
  // High streets and malls are loaded lazily for the selected borough; the
  // full UK hierarchy is several megabytes and must not ride on every
  // dashboard load.
  const activeDetail =
    boroughDetail && boroughDetail.boroughId === boroughNode?.id
      ? boroughDetail
      : null;

  useEffect(() => {
    const boroughId = boroughNode?.id;
    if (!boroughId) return;
    let cancelled = false;
    businessApi
      .locationBorough(boroughId)
      .then((detail) => {
        if (!cancelled) setBoroughDetail(detail);
      })
      .catch(() => {
        // A missing detail payload just leaves the optional levels empty.
      });
    return () => {
      cancelled = true;
    };
  }, [boroughNode?.id]);

  const highStreetNode = useMemo(
    () =>
      activeDetail?.highStreets.find((entry) => entry.name === highStreet) ??
      null,
    [activeDetail, highStreet],
  );
  const areas = useMemo(
    () => cityNode?.boroughs.map((entry) => entry.name) ?? [],
    [cityNode],
  );
  const highStreets = useMemo(
    () => activeDetail?.highStreets.map((entry) => entry.name) ?? [],
    [activeDetail],
  );
  const localMalls = useMemo(
    () =>
      (highStreetNode?.localMalls ?? activeDetail?.localMalls ?? []).map(
        (entry) => entry.name
      ),
    [highStreetNode, activeDetail],
  );

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
  // A required group the administrator set to paid (Partner, by default) is
  // always created as a paid group — the wizard locks pricing for that type.
  const forcedPaid = Boolean(type) && typeForcedPaid(adminConfig, type);
  const finalPricing: GroupPricingMode = forcedPaid ? "paid" : effectivePricing;
  const amountInRange =
    paidAmount !== null &&
    Number.isFinite(paidAmount) &&
    paidAmount >= (paymentRules?.minAmount ?? 0) &&
    paidAmount <= (paymentRules?.maxAmount ?? 0);
  const paidValid = finalPricing === "free" || amountInRange;
  const amountError =
    finalPricing === "paid" && !paidValid
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

  const selectType = (entry: UserGroupType) => {
    setType(entry);
    if (typeForcedPaid(adminConfig, entry)) {
      // Administrators require this group to be paid — lock the choice in.
      setPricing("paid");
      if (!hasCustom && presetAmount === null && inRangePresets.length > 0) {
        setPresetAmount(inRangePresets[0]);
      }
    }
  };

  const next = () => {
    if (!stepValid) return;
    // A "Create" button on a required group already chose the type, so the
    // Type step is done by default. Pricing still needs a decision, then the
    // wizard jumps straight to Details.
    if (step === 0 && validPreset) {
      setStep(2);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const back = () => {
    if (step === 0) return;
    setStep(step === 2 && validPreset ? 0 : step - 1);
  };

  const create = async () => {
    if (!type || !stepValid || submitting) return;
    if (mandateActive && !pendingSet.has(type)) {
      setSubmitError(
        `Create the required group types first: ${allPendingTypes.join(", ")}.`
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await businessApi.createGroup({
        name: name.trim(),
        type,
        purpose: purpose.trim(),
        accessType,
        visibility,
        interactionLevel,
        pricing: finalPricing,
        ...(finalPricing === "paid" && amountInRange && paidAmount !== null
          ? { contribution: paidAmount }
          : {}),
        ...(finalPricing === "paid"
          ? {
              contributionFrequency:
                frequencyMode === "recurring" ? recurringEvery : "once",
            }
          : {}),
        ...(city
          ? {
              city,
              ...(localArea ? { localArea } : {}),
              ...(highStreet ? { highStreet } : {}),
              ...(localMall ? { localMall } : {}),
            }
          : {}),
        ...(requiredSize ? { requiredSize: Number(requiredSize) } : {}),
      });
      await refresh();
      navigate("/business/groups/create/success", {
        state: { groupId: created.id },
      });
    } catch (cause) {
      setSubmitError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
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
              {mandateActive && (
                <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-[11px] leading-relaxed text-gold-200">
                  <Lock className="mt-px size-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">Required groups first.</span> Administrators
                    require your business to create {pendingTypes.join(", ")} before any other
                    group type — every other type unlocks as soon as these exist.
                  </span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {types.map((entry) => {
                  const selected = type === entry.type;
                  const alreadyOwned = ownedTypes.has(entry.type);
                  const lockedByMandate =
                    mandateActive && !alreadyOwned && !pendingSet.has(entry.type);
                  const forcedEntryPaid = typeForcedPaid(adminConfig, entry.type);
                  const disabled = alreadyOwned || lockedByMandate;
                  return (
                    <button
                      key={entry.type}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectType(entry.type)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        disabled
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
                        ) : lockedByMandate ? (
                          <Badge variant="warning">Locked</Badge>
                        ) : selected ? (
                          <Check className="size-4 text-gold-400" />
                        ) : (
                          <span className="size-4 rounded-full border border-white/20" />
                        )}
                      </div>
                      {!disabled && forcedEntryPaid && (
                        <span className="mt-1.5 inline-flex">
                          <Badge variant="gold">Paid group required</Badge>
                        </span>
                      )}
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {alreadyOwned
                          ? `Your business already owns a ${entry.type} group — one group per owner and type.`
                          : lockedByMandate
                            ? `Available once ${pendingTypes.join(", ")} have been created — administrators require those first.`
                            : `Create and own a ${entry.type} group. The type is fixed once created.`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Info className="size-3.5" />
                <span>Only types enabled for creation in administrator configuration are listed.</span>
                {mandateActive && (
                  <span className="text-gold-200">
                    Required groups must be created before any other type.
                  </span>
                )}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="City (optional)"
                  hint="Optional — pins the group to a city for geographic discovery."
                  value={city}
                  onChange={(event) => {
                    const nextCity = event.target.value;
                    setCity(nextCity);
                    setLocalArea(
                      locations?.cities.find((entry) => entry.name === nextCity)
                        ?.boroughs[0]?.name ?? "",
                    );
                    setHighStreet("");
                    setLocalMall("");
                  }}
                  options={[
                    { value: "", label: "No location (not location-bound)" },
                    ...(locations?.cities ?? []).map((entry) => ({ value: entry.name, label: entry.name })),
                  ]}
                />                <Select
                  label="Borough / local area"
                  hint="Narrower than city — helps people in your local area find the group."
                  value={localArea}
                  disabled={city === ""}
                  onChange={(event) => {
                    setLocalArea(event.target.value);
                    setHighStreet("");
                    setLocalMall("");
                  }}
                  options={
                    city === ""
                      ? [{ value: "", label: "—" }]
                      : areas.map((entry) => ({ value: entry, label: entry }))
                  }
                />
                <Select
                  label="High street"
                  hint="Optional — the retail street or ward within the borough."
                  value={highStreet}
                  disabled={!boroughNode}
                  onChange={(event) => {
                    setHighStreet(event.target.value);
                    setLocalMall("");
                  }}
                  options={
                    !boroughNode
                      ? [{ value: "", label: "—" }]
                      : [
                          { value: "", label: "No high street" },
                          ...highStreets.map((entry) => ({ value: entry, label: entry })),
                        ]
                  }
                />
                <Select
                  label="Local mall"
                  hint="Optional — the local mall or district the group belongs to."
                  value={localMall}
                  disabled={localMalls.length === 0}
                  onChange={(event) => setLocalMall(event.target.value)}
                  options={
                    localMalls.length === 0
                      ? [{ value: "", label: "—" }]
                      : [
                          { value: "", label: "No local mall" },
                          ...localMalls.map((entry) => ({ value: entry, label: entry })),
                        ]
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2">
                <p className="text-[11px] text-slate-400">
                  {knownCity ? (
                    <>
                      Attached to your business location:{" "}
                      <span className="font-semibold text-slate-200">
                        {[
                          knownCity,
                          myLocation?.borough ?? myLocation?.localArea,
                          myLocation?.highStreet,
                          myLocation?.localMall,
                        ]
                          .filter(Boolean)
                          .join(" → ")}
                      </span>
                    </>
                  ) : myLocation?.city ? (
                    <>
                      Central Hub has not resolved{" "}
                      <span className="font-semibold text-slate-200">
                        {myLocation.city}
                      </span>{" "}
                      to a city yet. Add a postcode in Central Hub, or pick the city
                      for this group below.
                    </>
                  ) : (
                    "No business location yet — choose where this group sits."
                  )}
                </p>
                {knownCity && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCity(knownCity);
                      setLocalArea(
                        myLocation?.borough ?? myLocation?.localArea ?? "",
                      );
                      setHighStreet(myLocation?.highStreet ?? "");
                      setLocalMall(myLocation?.localMall ?? "");
                    }}
                  >
                    Use my business location
                  </Button>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
                <Info className="mt-px size-3.5 shrink-0 text-gold-400" />
                Location is optional — Group ≠ Location. Your group starts on your own city,
                borough, high street and local mall so members nearby find it; adjust any level
                when the group needs to reach a wider area.
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
              {validPreset && (
                <div className="flex items-start gap-2 rounded-xl border border-success-500/30 bg-success-500/10 p-3 text-[11px] leading-relaxed text-success-400">
                  <Check className="mt-px size-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">{type} group selected.</span>{" "}
                    The Type step is already done for this link — choose pricing
                    and continue straight to the group details.
                  </span>
                </div>
              )}
              <p className="text-xs leading-relaxed text-slate-400">
                Decide membership pricing before anything else — whether members pay to join, how
                much, and how often. Everything here follows the administrator payment rules, and
                you can review your choice at the end before creating.
              </p>
              {mandateActive && (
                <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                  <Info className="mt-px size-3.5 shrink-0 text-gold-400" />
                  <span>
                    You still have to create {pendingTypes.join(", ")} — your choice below applies
                    to them and to every group in this wizard. A required group administrators have
                    set to paid is always created as a paid group; the wizard locks its pricing when
                    you pick that type.
                  </span>
                </div>
              )}
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
                    disabled={forcedPaid}
                    onClick={() => choosePricing("free")}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      forcedPaid
                        ? "cursor-not-allowed border-white/5 bg-ink-950/40 opacity-45"
                        : `cursor-pointer ${
                            effectivePricing === "free"
                              ? "border-gold-500/50 bg-gold-500/10"
                              : "border-white/10 bg-ink-950/60 hover:border-white/20"
                          }`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Users className="size-3.5 text-gold-400" /> Free group
                      </span>
                      {forcedPaid ? (
                        <Badge variant="gold">Paid required</Badge>
                      ) : effectivePricing === "free" ? (
                        <Check className="size-4 text-gold-400" />
                      ) : (
                        <span className="size-4 rounded-full border border-white/20" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {forcedPaid
                        ? `The ${type} group is required to be a paid group — administrators have switched this on.`
                        : "Membership costs nothing — no money changes hands when members join."}
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
                  value={
                    city
                      ? [city, localArea, highStreet, localMall]
                          .filter(Boolean)
                          .join(" → ")
                      : "Not location-bound"
                  }
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
                    finalPricing === "paid" && amountInRange && paidAmount !== null
                      ? `£${paidAmount} ${
                          frequencyMode === "recurring"
                            ? `${recurringEvery} per member`
                            : "one-off per member"
                        } — paid group`
                      : "Free group — no contribution"
                  }
                />
              </div>
              {type && pendingSet.has(type) && (
                <div className="flex items-start gap-2 rounded-xl border border-info-500/30 bg-info-500/10 p-3 text-[11px] leading-relaxed text-info-400">
                  <Info className="mt-px size-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">Required group.</span> {type} is one of the
                    groups administrators require your business to create first.
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-[11px] leading-relaxed text-gold-200">
                <Info className="mt-px size-3.5 shrink-0" />
                You become the owner of this group. The type, source and access rules cannot be
                changed afterwards — only an administrator can reconfigure group types.
              </div>
              {finalPricing === "paid" && amountInRange && paidAmount !== null && (
                <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                  <CircleDollarSign className="mt-px size-3.5 shrink-0 text-gold-400" />
                  {forcedPaid
                    ? `Administrators require this group to be paid. `
                    : ""}
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
        <span className="w-full text-[11px] font-medium text-slate-500 sm:w-auto" aria-live="polite">
          {submitError ? (
            <span className="text-danger-400">{submitError}</span>
          ) : (
            <>
              Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            </>
          )}
        </span>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="ghost"
            size="md"
            onClick={back}
            disabled={step === 0 || submitting}
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
              disabled={!stepValid || submitting}
              className="flex-1 sm:flex-none"
            >
              {submitting ? "Creating…" : "Create group"}
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
