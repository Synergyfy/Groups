import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FieldHint from "../../components/ui/FieldHint";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { LISTS } from "../../data/mockData";
import { useAppStore } from "../../store/context";
import { newNetworkContact } from "../../store/reducer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_CLASS =
  "h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function JoinListPage() {
  const { listId = "" } = useParams();
  const { dispatch } = useAppStore();
  const list = LISTS.find((entry) => entry.id === listId);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (!list) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-6 text-center">
          <p className="text-sm font-semibold text-white">This join link is not valid</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Ask the business for a fresh link — network lists can change over time.
          </p>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address — your confirmation link is sent there.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (!consent) {
      setError("Tick the consent box so the business has permission on record.");
      return;
    }
    const contact = newNetworkContact(
      { fullName, email, phone, listId: list.id },
      "join-link",
      CURRENT_BUSINESS.businessName
    );
    dispatch({ type: "contact/add", contact });
    setError(null);
    setSubmittedId(contact.id);
  };

  if (submittedId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-white">Almost there — check your email</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            We sent a confirmation link to{" "}
            <span className="text-slate-200">{email.trim()}</span>. Confirm it and you will appear
            on {CURRENT_BUSINESS.businessName}'s{" "}
            <span className="text-gold-300">{list.name}</span> list — until then you are{" "}
            <span className="text-gold-300">Pending</span>.
          </p>
          <Link
            to={`/join/${list.id}/confirm/${submittedId}`}
            className="mt-4 inline-block text-xs font-semibold text-gold-300 transition-colors hover:text-gold-200"
          >
            Open the demo confirmation email →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <Link2 className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-white">247 GBS</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Business network invite
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={list.type === "B2B" ? "gold" : "info"}>{list.type}</Badge>
          <Badge variant="muted">{list.geography}</Badge>
        </div>
        <h1 className="mt-3 text-base font-bold text-white">
          {CURRENT_BUSINESS.businessName} invited you to join {list.name}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Add your details and they will land in their My Network list as{" "}
          <span className="font-semibold text-gold-300">Pending</span>. You confirm from your own
          email before anything goes live.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-white">Full name</span>
            <FieldHint>How you appear in their network list.</FieldHint>
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
              <FieldHint>For their records.</FieldHint>
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
              <FieldHint>Your confirmation goes here.</FieldHint>
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
              I agree that {CURRENT_BUSINESS.businessName} may keep my name, phone and email on
              their <span className="font-medium text-slate-200">{list.name}</span> network list,
              in line with their privacy policy and <span className="font-medium text-slate-200">GDPR</span>{" "}
              rules. My details only go live once I confirm from my email.
            </span>
          </label>

          {error && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {error}
            </p>
          )}

          <p className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-gold-200">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            We email you a confirmation link. Your contact stays Pending until you approve it —
            nothing is shared before then.
          </p>

          <Button size="md" onClick={submit}>
            Send my details
          </Button>
        </div>
      </div>
    </div>
  );
}
