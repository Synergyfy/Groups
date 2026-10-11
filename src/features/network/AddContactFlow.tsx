import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Link2,
  Send,
  Table2,
  UserPlus,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FieldHint from "../../components/ui/FieldHint";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import ShareLink from "../../components/ui/ShareLink";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { LISTS } from "../../data/mockData";
import { useAppStore } from "../../store/context";
import { newNetworkContact } from "../../store/reducer";

type View = "method" | "manual" | "link" | "done";

interface DoneInfo {
  contactId: string;
  fullName: string;
  email: string;
  listId: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_CLASS =
  "h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function AddContactFlow({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { dispatch } = useAppStore();
  const [view, setView] = useState<View>("method");
  const [listId, setListId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);

  const listOptions = LISTS.map((list) => ({
    value: list.id,
    label: `${list.name} · ${list.type}`,
  }));
  const selectedList = LISTS.find((list) => list.id === listId);
  const doneList = LISTS.find((list) => list.id === done?.listId);

  const reset = () => {
    setView("method");
    setListId("");
    setFullName("");
    setEmail("");
    setPhone("");
    setConsent(false);
    setError(null);
    setDone(null);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const submitManual = () => {
    if (!listId) {
      setError("Choose which contact list this contact belongs to.");
      return;
    }
    if (!fullName.trim()) {
      setError("Enter the contact's name.");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address — the confirmation link is sent there.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (!consent) {
      setError(
        "Tick the consent box — we need your permission record before storing contact details."
      );
      return;
    }
    const contact = newNetworkContact(
      { fullName, email, phone, listId },
      "manual",
      CURRENT_BUSINESS.businessName
    );
    dispatch({ type: "contact/add", contact });
    setDone({
      contactId: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      listId: contact.listId,
    });
    setError(null);
    setView("done");
  };

  const footer =
    view === "method" ? (
      <Button variant="ghost" size="sm" onClick={handleClose}>
        Cancel
      </Button>
    ) : view === "manual" ? (
      <>
        <Button variant="ghost" size="sm" onClick={() => { setError(null); setView("method"); }}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={submitManual}>
          <Send className="size-3.5" /> Add contact
        </Button>
      </>
    ) : view === "link" ? (
      <>
        <Button variant="ghost" size="sm" onClick={() => { setError(null); setView("method"); }}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <Button size="sm" onClick={handleClose}>
          Done
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setView("method");
          }}
        >
          Add another
        </Button>
        <Button size="sm" onClick={handleClose}>
          Done
        </Button>
      </>
    );

  return (
    <Modal open={open} title="Add a contact" onClose={handleClose} footer={footer}>
      {view === "method" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Add someone to your My Network lists. Every contact is stored as{" "}
            <span className="font-semibold text-white">Pending</span> until they approve the
            confirmation email, so nothing goes live without consent.
          </p>

          <button
            type="button"
            onClick={() => { setError(null); setView("manual"); }}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-left transition-colors hover:border-gold-500/40 hover:bg-gold-500/[0.06]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <UserPlus className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white">Add manually</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                Enter their name, phone number and email yourself — best for one person at a time.
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled
            title="Bulk import arrives in a later phase"
            className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-dashed border-white/10 bg-ink-950/40 p-3 text-left opacity-60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-900 text-slate-400">
              <Table2 className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="block text-xs font-semibold text-white">Bulk import</span>
                <Badge variant="muted">Coming soon</Badge>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                Import a CSV or spreadsheet of contacts in one go.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setError(null); setView("link"); }}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-left transition-colors hover:border-gold-500/40 hover:bg-gold-500/[0.06]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <Link2 className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-white">Share a join link</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                People open your link, add their own details with consent, and confirm from the
                email we send them.
              </span>
            </span>
          </button>

          <p className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
            Consent and email confirmation follow GDPR and the 247 GBS privacy policy: contact
            details are only stored after permission is recorded, and only go live when the person
            approves from their own email.
          </p>
        </div>
      )}

      {view === "manual" && (
        <div className="flex flex-col gap-3">
          <Select
            label="Contact list"
            tip="The contact is added to this list only — you can build circles from the list as usual."
            value={listId}
            onChange={(event) => {
              setListId(event.target.value);
              setError(null);
            }}
            options={[{ value: "", label: "Choose a list…" }, ...listOptions]}
            hint="Referrals, shoppers, Traffic & Leads — pick where they belong."
          />

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-white">Full name</span>
            <FieldHint>The person's name — how they appear in your list and circles.</FieldHint>
            <input
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Jordan Blake"
              className={FIELD_CLASS}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-white">Phone number</span>
              <FieldHint>Used to identify them in your network.</FieldHint>
              <input
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                }}
                inputMode="tel"
                placeholder="07700 900000"
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-white">Email address</span>
              <FieldHint>The confirmation link is sent here.</FieldHint>
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                type="email"
                placeholder="name@example.com"
                className={FIELD_CLASS}
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-ink-950/60 p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setError(null);
              }}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
            />
            <span className="text-[11px] leading-relaxed text-slate-400">
              I have permission to add this contact's details to my network list under{" "}
              <span className="font-medium text-slate-200">GDPR</span> and the{" "}
              <span className="font-medium text-slate-200">247 GBS privacy policy</span>, and I
              understand they will be emailed to confirm before the contact goes live.
            </span>
          </label>

          <p className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-gold-200">
            We will email{" "}
            <span className="font-semibold text-white">
              {email.trim() || "this address"}
            </span>{" "}
            a confirmation link. Until they approve, the contact shows as{" "}
            <span className="font-semibold text-white">Pending</span> — but you can already add
            them to circles while you wait.
          </p>
        </div>
      )}

      {view === "link" && (
        <div className="flex flex-col gap-3">
          <Select
            label="Which list should joiners land in?"
            tip="The link carries the list with it, so everyone who joins lands in the right place."
            value={listId}
            onChange={(event) => {
              setListId(event.target.value);
              setError(null);
            }}
            options={[{ value: "", label: "Choose a list…" }, ...listOptions]}
          />

          {selectedList ? (
            <ShareLink
              url={`${window.location.origin}/join/${selectedList.id}`}
              label={`Join link · ${selectedList.name}`}
              hint="Send this link instead of typing details — people add their own name, phone and email, tick the consent box, then confirm from the email we send. They show as Pending until they do."
            />
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-[11px] text-slate-500">
              Choose a list to generate its join link.
            </p>
          )}

          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[11px] leading-relaxed text-slate-500">
            <li>The joiner fills in their own name, phone and email — no typing for you.</li>
            <li>Consent is captured on their side, with the GDPR and policy wording.</li>
            <li>Nothing goes live until they confirm from their email.</li>
          </ul>
        </div>
      )}

      {view === "done" && done && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-10 text-success-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-white">
            {done.fullName} is pending on {doneList?.name}
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            A confirmation email went to{" "}
            <span className="text-slate-200">{done.email}</span>. Their status changes from{" "}
            <span className="text-gold-300">Pending</span> to{" "}
            <span className="text-success-300">Confirmed</span> only when they approve — and you
            can already add them to circles and groups while you wait.
          </p>
          <Link
            to={`/join/${done.listId}/confirm/${done.contactId}`}
            className="text-[11px] font-semibold text-gold-300 transition-colors hover:text-gold-200"
          >
            Preview the confirmation email (demo) →
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
          {error}
        </p>
      )}
    </Modal>
  );
}
