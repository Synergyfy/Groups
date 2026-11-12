import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { LISTS } from "../../data/mockData";
import { useAppStore } from "../../store/context";
import { useNetworkContacts } from "../../store/selectors";

export default function ConfirmContactPage() {
  const { listId = "", contactId = "" } = useParams();
  const { dispatch } = useAppStore();
  const networkContacts = useNetworkContacts();
  const [justConfirmed, setJustConfirmed] = useState(false);

  const list = LISTS.find((entry) => entry.id === listId);
  const contact = networkContacts.find((entry) => entry.id === contactId && entry.listId === listId);

  const shell = (content: ReactNode) => (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <MailCheck className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-white">247 GBS</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Email confirmation</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-5 sm:p-6">{content}</div>
    </div>
  );

  if (!list || !contact) {
    return shell(
      <div className="text-center">
        <p className="text-sm font-semibold text-white">This confirmation link is not valid</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          The link may have expired or already been used. Ask the business to resend your
          confirmation email.
        </p>
      </div>
    );
  }

  const isConfirmed = contact.confirmation === "confirmed";

  if (isConfirmed && !justConfirmed) {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-success-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-white">You are already confirmed</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {CURRENT_BUSINESS.businessName} already has you as an active contact on{" "}
          <span className="text-gold-300">{list.name}</span>.
        </p>
        <Link
          to={`/join/${list.id}`}
          className="mt-4 inline-block text-xs font-semibold text-gold-300 transition-colors hover:text-gold-200"
        >
          Back to the join page →
        </Link>
      </div>
    );
  }

  if (justConfirmed) {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-success-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-white">You are confirmed</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {CURRENT_BUSINESS.businessName} can now see you as an active contact on{" "}
          <span className="text-gold-300">{list.name}</span> — no longer Pending.
        </p>
      </div>
    );
  }

  return shell(
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">Pending</Badge>
        <Badge variant={list.type === "B2B" ? "gold" : "info"}>{list.type}</Badge>
      </div>
      <h1 className="mt-3 text-base font-bold text-white">Confirm your contact details</h1>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {CURRENT_BUSINESS.businessName} added you to{" "}
        <span className="text-slate-200">{list.name}</span>. Check the details below are yours and
        approve them — your status changes from Pending to Confirmed.
      </p>

      <dl className="mt-4 flex flex-col gap-2">
        <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Name
          </dt>
          <dd className="mt-0.5 text-xs font-medium text-slate-200">{contact.fullName}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Email
          </dt>
          <dd className="mt-0.5 text-xs font-medium text-slate-200">{contact.email}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Phone
          </dt>
          <dd className="mt-0.5 text-xs font-medium text-slate-200">{contact.phone}</dd>
        </div>
      </dl>

      <p className="mt-3 flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-gold-200">
        <ShieldCheck className="mt-px size-3.5 shrink-0" />
        By confirming, you agree that {CURRENT_BUSINESS.businessName} may keep these details on
        this network list under their privacy policy and GDPR rules.
      </p>

      <Button
        size="md"
        className="mt-4 w-full"
        onClick={() => {
          dispatch({ type: "contact/confirm", contactId: contact.id });
          setJustConfirmed(true);
        }}
      >
        Confirm my details
      </Button>
    </div>
  );
}
