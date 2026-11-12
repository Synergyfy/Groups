import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Plus, Search, X } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import FieldHint from "../ui/FieldHint";
import Modal from "../ui/Modal";
import Stepper from "../ui/Stepper";
import type { CircleMember } from "../../domain/types";

interface AddMemberFlowProps {
  open: boolean;
  circleName: string;
  contacts: CircleMember[];
  onClose: () => void;
  onConfirm: (member: CircleMember) => void;
}

const STEPS = [
  { id: "select", label: "Select contact" },
  { id: "review", label: "Review" },
  { id: "done", label: "Added" },
];

export default function AddMemberFlow({
  open,
  circleName,
  contacts,
  onClose,
  onConfirm,
}: AddMemberFlowProps) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<CircleMember | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((member) =>
      [member.fullName, member.businessName, member.category, member.location].some(
        (value) => value.toLowerCase().includes(needle)
      )
    );
  }, [contacts, query]);

  const selected = selectedId
    ? contacts.find((member) => member.id === selectedId) ?? null
    : null;

  const reset = () => {
    setStep(0);
    setQuery("");
    setSelectedId(null);
    setConfirmed(null);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const confirm = () => {
    if (!selected) return;
    setConfirmed(selected);
    onConfirm(selected);
    setStep(2);
  };

  const footer =
    step === 0 ? (
      <>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={!selected} onClick={() => setStep(1)}>
          Continue <ArrowRight className="size-3.5" />
        </Button>
      </>
    ) : step === 1 ? (
      <>
        <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={confirm}>
          <Plus className="size-3.5" /> Add to circle
        </Button>
      </>
    ) : (
      <Button size="sm" onClick={handleClose}>
        Done
      </Button>
    );

  return (
    <Modal open={open} title="Add member from My Network" onClose={handleClose} footer={footer}>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Pick someone from your My Network contacts to add to{" "}
            <span className="font-semibold text-white">{circleName}</span>. Nothing is
            added until you review and confirm it.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 px-3 focus-within:border-gold-500/40">
            <Search className="size-4 shrink-0 text-slate-500" />
            <input
              type="text"
              enterKeyHint="search"
              placeholder="Type a name, category or city"
              aria-label="Search My Network contacts"
              className="h-10 w-full min-w-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <FieldHint>Filters contacts by name, business, category or location.</FieldHint>

          <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
            {results.map((member) => {
              const isSelected = member.id === selectedId;
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(member.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-gold-500 ${
                      isSelected
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-white/10 bg-ink-950/60 hover:border-white/20 hover:bg-ink-850/70"
                    }`}
                  >
                    <Avatar
                      id={member.id}
                      name={member.fullName}
                      className="size-8 shrink-0 rounded-full text-[10px] font-bold text-white"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      <span className="font-semibold text-white">{member.businessName}</span>
                      <span className="text-slate-500">
                        {" "}
                        · {member.category} · {member.location}
                      </span>
                    </span>
                    <Badge variant={member.status === "active" ? "success" : "muted"}>
                      {member.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-gold-400 bg-gold-500 text-ink-950"
                          : "border-white/25"
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-500">
                {contacts.length === 0
                  ? "Every My Network contact is already in this circle."
                  : "No contact matches that search."}
              </li>
            )}
          </ul>
        </div>
      )}

      {step === 1 && selected && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3">
            <Avatar
              id={selected.id}
              name={selected.fullName}
              className="size-11 shrink-0 rounded-full text-sm font-bold text-white"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {selected.businessName}
              </p>
              <p className="truncate text-xs text-slate-400">{selected.fullName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="gold">{selected.tier} tier</Badge>
                <Badge variant={selected.status === "active" ? "success" : "muted"}>
                  {selected.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Fact label="Category" value={selected.category} />
            <Fact label="Location" value={selected.location} />
            <Fact label="Geography" value={selected.geography} />
          </dl>

          <p className="rounded-xl border border-gold-500/30 bg-gold-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-gold-200">
            Review before adding: {selected.fullName} joins{" "}
            <span className="font-semibold text-white">{circleName}</span> as a circle
            member, and the join is recorded in the circle activity feed.
          </p>
        </div>
      )}

      {step === 2 && confirmed && (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="size-10 text-success-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-white">
            {confirmed.fullName} was added
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            {confirmed.businessName} is now a member of {circleName}. You can repeat the
            process any time to bring in more of your network.
          </p>
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="truncate text-xs font-medium text-slate-200">{value}</dd>
    </div>
  );
}
