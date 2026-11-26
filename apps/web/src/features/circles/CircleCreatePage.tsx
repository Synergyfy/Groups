import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Lock, MapPin, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard } from "../../components/ui/Skeleton";
import Stepper from "../../components/ui/Stepper";
import TipIcon from "../../components/ui/TipIcon";
import type { CircleVisibility, InteractionLevel } from "../../domain/types";
import { useCircleTypeEntries } from "../../store/selectors";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";
const CIRCLE_INTERACTION_LEVELS: InteractionLevel[] = ["read", "message"];
const STEPS = [
  { id: "lists", label: "Select Lists" },
  { id: "type", label: "Define Type" },
  { id: "configure", label: "Configure" },
];

export default function CircleCreatePage() {
  const navigate = useNavigate();
  const { networkLists, contacts, circles, refresh, location } = useBusinessData();
  const lists = useMemo(() => networkLists?.items ?? [], [networkLists]);
  const [params] = useSearchParams();

  // A circle always belongs to the business that owns it, so it inherits the
  // business's Central Hub location chain.
  const myLocation = location?.current ?? null;
  const locationChain = [
    myLocation?.city,
    myLocation?.borough ?? myLocation?.localArea,
    myLocation?.highStreet,
    myLocation?.localMall,
  ].filter(Boolean) as string[];

  const getListContactCount = (list: (typeof lists)[number]) =>
    list.contactCount ??
    list.contactIds?.length ??
    contacts.filter((contact) => contact.listId === list.id).length;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => {
    const preset = params.get("list");
    const presetList = preset ? lists.find((list) => list.id === preset) : undefined;
    return presetList && getListContactCount(presetList) >= 1 ? [presetList.id] : [];
  });
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CircleVisibility>("private");
  const [interaction, setInteraction] = useState<InteractionLevel>("message");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allCircleTypes = useCircleTypeEntries();
  const circleTypes = useMemo(() => allCircleTypes.filter((entry) => entry.enabled), [allCircleTypes]);
  const circlesReady = circles !== null;
  const missingCircles = useMemo(
    () => (circles?.mandatoryCircles ?? []).filter((entry) => entry.required && !entry.satisfied),
    [circles]
  );
  const mandateActive = missingCircles.length > 0;
  const missingTypeSet = useMemo(
    () => new Set(missingCircles.map((entry) => entry.circleType)),
    [missingCircles]
  );
  const requiredRuleByType = useMemo(
    () =>
      new Map(
        (circles?.mandatoryCircles ?? [])
          .filter((entry) => entry.required)
          .map((entry) => [entry.circleType, entry])
      ),
    [circles]
  );
  const allowedCircleTypes = useMemo(
    () =>
      mandateActive
        ? circleTypes.filter((entry) => missingTypeSet.has(entry.type))
        : circleTypes,
    [mandateActive, circleTypes, missingTypeSet]
  );
  const meta =
    allowedCircleTypes.find((entry) => entry.id === selectedTypeId) ?? allowedCircleTypes[0];

  const memberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of lists) {
      if (!selected.includes(list.id)) continue;
      for (const id of list.contactIds ?? []) ids.add(id);
      for (const contact of contacts) {
        if (contact.listId === list.id) ids.add(contact.id);
      }
    }
    return [...ids];
  }, [selected, lists, contacts]);

  const toggleList = (id: string) => {
    const target = lists.find((list) => list.id === id);
    if (!target || getListContactCount(target) < 1) return;
    setError(null);
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const goNext = async () => {
    setError(null);
    if (step === 0 && selected.length === 0) {
      setError("Select at least one list — a circle is always built from your network.");
      return;
    }
    if (step === 1 && circleTypes.length === 0) {
      setError(
        "No circle types are enabled. An administrator must create and enable a circle type before a business can build one."
      );
      return;
    }
    if (step === 1 && mandateActive && allowedCircleTypes.length === 0) {
      setError(
        `A required circle type (${missingCircles.map((entry) => entry.circleType).join(", ")}) is currently disabled by your administrator. Ask an administrator to enable it before creating circles.`
      );
      return;
    }
    if (step === 1 && (!meta || (mandateActive && !missingTypeSet.has(meta.type)))) {
      setError(
        `Create the required circle types first: ${missingCircles.map((entry) => entry.circleType).join(", ")}.`
      );
      return;
    }
    if (step === 2) {
      if (!meta) {
        setError("Choose a circle type on the previous step before configuring the circle.");
        return;
      }
      if (mandateActive && !missingTypeSet.has(meta.type)) {
        setError(
          `Create the required circle types first: ${missingCircles.map((entry) => entry.circleType).join(", ")}.`
        );
        return;
      }
      if (name.trim().length === 0) {
        setError("Give the circle a name before creating it.");
        return;
      }
      if (meta.minMembers !== null && memberIds.length < meta.minMembers) {
        setError(
          `${meta.shortLabel} circles need at least ${meta.minMembers} members — the selected lists give ${memberIds.length}.`
        );
        return;
      }
      if (meta.requiresBanker) {
        const hasBanker = lists
          .filter((list) => selected.includes(list.id))
          .flatMap((list) => list.contacts ?? [])
          .some((contact) => (contact as { role?: string }).role === "banker");
        if (!hasBanker) {
          setError(
            "This circle type requires a designated Banker. Include a list that contains a finance contact."
          );
          return;
        }
      }
      setSubmitting(true);
      try {
        const created = await businessApi.createCircle({
          type: meta.type,
          config: {
            name: name.trim(),
            description:
              description.trim().length > 0
                ? description.trim()
                : `${meta.shortLabel} circle built from ${selected.length} My Network list${selected.length === 1 ? "" : "s"}.`,
            visibility,
            interactionLevel: interaction,
          },
          memberIds,
          sourceListIds: selected,
        });
        await refresh();
        navigate(`/business/circles/${created.circle.id}`);
        return;
      } catch (cause) {
        setError(errorMessage(cause));
        setSubmitting(false);
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Create Group Circle"
        back="/business/circles"
        subtitle="Circle wizard in three steps: Select Lists → Define Type → Configure. Every option comes from your My Network lists and the circle type definitions."
      />

      <div data-tour="stepper">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      {!circlesReady ? (
        <SkeletonCard />
      ) : (
        <>
          {mandateActive && (
            <div className="flex flex-col gap-2 rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4 text-xs text-gold-200">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0 text-gold-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">Required circles first</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gold-200/90">
                    Your administrator requires these circles before any other circle type can be
                    created. Other circle types unlock once each required circle exists with its
                    minimum member count.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {missingCircles.map((entry) => (
                  <Badge key={entry.circleType} variant="warning">
                    {entry.circleType} · {entry.current}/{entry.minMemberCount} members
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Card data-tour="step-body">
        <CardBody className="flex flex-col gap-4">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Select the lists this circle is built from</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {lists.map((list) => {
                  const active = selected.includes(list.id);
                  const listCount = getListContactCount(list);
                  const isEmpty = listCount < 1;
                  return (
                    <button
                      key={list.id}
                      type="button"
                      disabled={isEmpty}
                      title={
                        isEmpty
                          ? "Add at least one contact to this list before selecting it"
                          : undefined
                      }
                      onClick={() => toggleList(list.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        isEmpty
                          ? "cursor-not-allowed border-white/5 bg-ink-950/40 opacity-50"
                          : active
                            ? "cursor-pointer border-gold-500/40 bg-gold-500/[0.07]"
                            : "cursor-pointer border-white/10 bg-ink-950/60 hover:border-gold-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{list.name}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {list.geography} · {list.source}
                          </p>
                        </div>
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                            active
                              ? "border-gold-500 bg-gold-500 text-ink-950"
                              : "border-white/20 text-transparent"
                          }`}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant={list.type === "B2B" ? "gold" : "info"}>{list.type}</Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Users className="size-3.5" /> {listCount}
                        </span>
                        {isEmpty && <Badge variant="muted">Empty</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {selected.length === 0
                  ? "No lists selected yet."
                  : `${selected.length} list${selected.length === 1 ? "" : "s"} selected · ${memberIds.length} unique contacts.`}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <CardTitle>Define the circle type</CardTitle>
                <TipIcon text="Circle types are authored by the administrator. Only the types that are enabled in admin configuration appear here." />
              </div>
              <FieldHint>
                Pick the type that matches what this circle is for. Its rules — member limits and
                banker requirement — are applied on the next step.
              </FieldHint>
              {circleTypes.length === 0 ? (
                <p className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-3 py-2.5 text-xs text-warning-300">
                  No circle types are currently enabled. Your administrator must create and enable
                  one on the Circle Type Configuration screen before you can build a circle.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {circleTypes.map((entry) => {
                    const active = meta?.id === entry.id;
                    const lockedByMandate = mandateActive && !missingTypeSet.has(entry.type);
                    const requiredRule = requiredRuleByType.get(entry.type);
                    const isUnsatisfiedRequired = Boolean(requiredRule && !requiredRule.satisfied);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={lockedByMandate}
                        onClick={() => {
                          if (lockedByMandate) return;
                          setSelectedTypeId(entry.id);
                          setError(null);
                        }}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          lockedByMandate
                            ? "cursor-not-allowed border-white/5 bg-ink-950/40 opacity-45"
                            : active
                              ? "cursor-pointer border-gold-500/40 bg-gold-500/[0.07]"
                              : "cursor-pointer border-white/10 bg-ink-950/60 hover:border-gold-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{entry.shortLabel}</p>
                          <span className="flex gap-1.5">
                            {lockedByMandate && <Badge variant="warning">Locked</Badge>}
                            {isUnsatisfiedRequired && <Badge variant="gold">Required first</Badge>}
                            {requiredRule?.satisfied && <Badge variant="success">Required · Ready</Badge>}
                            {entry.requiresBanker && <Badge variant="info">Banker</Badge>}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                          {lockedByMandate
                            ? `Available once required circles (${missingCircles.map((item) => item.circleType).join(", ")}) are created.`
                            : entry.description}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Members: {entry.minMembers ?? 0}
                          {entry.maxMembers === null ? "+" : `–${entry.maxMembers}`}
                          {isUnsatisfiedRequired && requiredRule && requiredRule.minMemberCount > 0
                            ? ` · Admin rule requires ${requiredRule.minMemberCount}+`
                            : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && meta && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5">
                <CardTitle>Configure the circle</CardTitle>
                <TipIcon text="Everything here is yours to choose — the circle type only sets which options are offered." />
              </div>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Circle name</span>
                <FieldHint>Required — this name is shown wherever the circle appears.</FieldHint>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  placeholder={`e.g. ${meta.shortLabel} Circle — Autumn`}
                  className="h-10 rounded-xl border border-white/10 bg-ink-950/60 px-3 text-xs text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Description</span>
                <FieldHint>Leave empty to auto-generate a description from the circle type.</FieldHint>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="What this circle is for — who it reaches and what it promotes."
                  className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Visibility</span>
                    <TipIcon text="Private = only the owner and named members can see it. Invite only = visible only to people you send an invitation to." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["private", "invite only"] as CircleVisibility[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setVisibility(value)}
                        className={`h-10 cursor-pointer rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${
                          visibility === value
                            ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                            : "border-white/10 bg-ink-950/60 text-slate-300"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Interaction</span>
                    <TipIcon text="How members may act inside the circle: read only or post messages." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CIRCLE_INTERACTION_LEVELS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setInteraction(value)}
                        className={`h-10 cursor-pointer rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${
                          interaction === value
                            ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                            : "border-white/10 bg-ink-950/60 text-slate-300"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                <p className="flex items-center gap-1.5 font-semibold text-white">
                  <MapPin className="size-3.5 text-gold-400" /> Location
                </p>
                <p className="mt-1">
                  {locationChain.length > 0 ? (
                    <>
                      This circle is attached to your business location:{" "}
                      <span className="text-slate-200">
                        {locationChain.join(" → ")}
                      </span>
                      . Central Hub resolves it from the postcode on your profile.
                    </>
                  ) : (
                    "No business location yet. Central Hub assigns one from the postcode on your profile."
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                <p className="font-semibold text-white">Review</p>
                <p className="mt-1">
                  {meta.shortLabel} circle · {selected.length} list
                  {selected.length === 1 ? "" : "s"} · {memberIds.length} members · {visibility} ·{" "}
                  {interaction}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {error}
            </p>
          )}

          <div className="sticky bottom-[4.5rem] z-20 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-ink-900/95 py-3 backdrop-blur lg:bottom-0 lg:rounded-b-2xl">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button variant="primary" size="md" onClick={goNext} disabled={submitting}>
              {step === STEPS.length - 1 ? (
                <>
                  <Check className="size-4" /> {submitting ? "Creating…" : "Create circle"}
                </>
              ) : (
                <>
                  Continue <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>
        </>
      )}

      {selected.length === 0 && step === 0 && (
        <EmptyState
          title="No lists selected"
          description="Pick at least one My Network list — you can start from the intake layer if you have not captured contacts yet."
          icon={<Users className="size-6" />}
        />
      )}
    </div>
  );
}
