import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import Stepper from "../../components/ui/Stepper";
import TipIcon from "../../components/ui/TipIcon";
import { INTERACTION_LEVELS } from "../../domain/constants";
import type { CampaignDuration, CircleVisibility, InteractionLevel } from "../../domain/types";
import { CONTACTS, LISTS } from "../../data/mockData";
import { resolveContactsOfList } from "../../data/contactHelpers";
import { useAppStore } from "../../store/context";
import { useCircleTypeEntries, useNetworkContacts } from "../../store/selectors";
const STEPS = [
  { id: "lists", label: "Select Lists" },
  { id: "type", label: "Define Type" },
  { id: "configure", label: "Configure" },
];

export default function CircleCreatePage() {
  const navigate = useNavigate();
  const { dispatch } = useAppStore();
  const networkContacts = useNetworkContacts();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => {
    const preset = params.get("list");
    return preset && LISTS.some((list) => list.id === preset) ? [preset] : [];
  });
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<CampaignDuration>(90);
  const [visibility, setVisibility] = useState<CircleVisibility>("private");
  const [interaction, setInteraction] = useState<InteractionLevel>("message");
  const [error, setError] = useState<string | null>(null);

  const allCircleTypes = useCircleTypeEntries();
  const circleTypes = useMemo(() => allCircleTypes.filter((entry) => entry.enabled), [allCircleTypes]);
  const meta = circleTypes.find((entry) => entry.id === selectedTypeId) ?? circleTypes[0];

  const memberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of LISTS) {
      if (!selected.includes(list.id)) continue;
      for (const id of list.contactIds) ids.add(id);
      for (const contact of networkContacts) {
        if (contact.listId === list.id) ids.add(contact.id);
      }
    }
    return [...ids];
  }, [selected, networkContacts]);

  const toggleList = (id: string) => {
    setError(null);
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const goNext = () => {
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
    if (step === 2) {
      if (!meta) {
        setError("Choose a circle type on the previous step before configuring the circle.");
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
        const hasBanker = memberIds.some(
          (id) => CONTACTS.find((contact) => contact.id === id)?.role === "banker"
        );
        if (!hasBanker) {
          setError(
            "This circle type requires a designated Banker. Include a list that contains a finance contact."
          );
          return;
        }
      }
      const finalDuration: CampaignDuration = meta.allowedDurations.includes(duration)
        ? duration
        : (meta.allowedDurations[0] ?? duration);
      const id = `circle-${Date.now().toString(36)}`;
      dispatch({
        type: "circle/create",
        circle: {
          id,
          type: meta.type,
          config: {
            name: name.trim(),
            description:
              description.trim().length > 0
                ? description.trim()
                : `${meta.shortLabel} circle built from ${selected.length} My Network list${selected.length === 1 ? "" : "s"}.`,
            duration: finalDuration,
            visibility,
            interactionLevel: interaction,
          },
          memberIds,
          sourceListIds: selected,
          createdAt: new Date().toISOString(),
        },
      });
      navigate(`/business/circles/${id}`);
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

      <Card data-tour="step-body">
        <CardBody className="flex flex-col gap-4">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Select the lists this circle is built from</CardTitle>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LISTS.map((list) => {
                  const active = selected.includes(list.id);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => toggleList(list.id)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                        active
                          ? "border-gold-500/40 bg-gold-500/[0.07]"
                          : "border-white/10 bg-ink-950/60 hover:border-gold-500/30"
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
                          <Users className="size-3.5" />{" "}
                          {resolveContactsOfList(list, networkContacts).length}
                        </span>
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
                Pick the type that matches what this circle is for. Its rules — member limits,
                banker requirement and allowed durations — are applied on the next step.
              </FieldHint>
              {circleTypes.length === 0 ? (
                <p className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-3 py-2.5 text-xs text-warning-300">
                  No circle types are currently enabled. Your administrator must create and enable
                  one on the Circle Type Configuration screen before you can build a circle.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {circleTypes.map((entry) => {
                    const active = entry.id === selectedTypeId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelectedTypeId(entry.id);
                          if (entry.allowedDurations.length > 0 && !entry.allowedDurations.includes(duration)) {
                            setDuration(entry.allowedDurations[0]);
                          }
                          setError(null);
                        }}
                        className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                          active
                            ? "border-gold-500/40 bg-gold-500/[0.07]"
                            : "border-white/10 bg-ink-950/60 hover:border-gold-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{entry.shortLabel}</p>
                          <span className="flex gap-1.5">
                            {entry.mandatory && <Badge variant="gold">Mandatory</Badge>}
                            {entry.requiresBanker && <Badge variant="info">Banker</Badge>}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                          {entry.description}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Members: {entry.minMembers ?? 0}
                          {entry.maxMembers === null ? "+" : `–${entry.maxMembers}`}
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

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Duration</span>
                    <TipIcon text={`Only the durations allowed by the ${meta.shortLabel} type are offered.`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {meta.allowedDurations.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDuration(value)}
                        className={`h-10 cursor-pointer rounded-lg border px-3 text-xs font-semibold transition-colors ${
                          duration === value
                            ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                            : "border-white/10 bg-ink-950/60 text-slate-300"
                        }`}
                      >
                        {value}d
                      </button>
                    ))}
                  </div>
                </div>

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
                    <TipIcon text="How members may act inside the circle: read only, post messages, or collaborate on shared work." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INTERACTION_LEVELS.map((value) => (
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
                <p className="font-semibold text-white">Review</p>
                <p className="mt-1">
                  {meta.shortLabel} circle · {selected.length} list
                  {selected.length === 1 ? "" : "s"} · {memberIds.length} members · {duration} days ·{" "}
                  {visibility} · {interaction}
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
            <Button variant="primary" size="md" onClick={goNext}>
              {step === STEPS.length - 1 ? (
                <>
                  <Check className="size-4" /> Create circle
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
