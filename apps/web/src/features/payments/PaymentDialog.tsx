import { useEffect, useState } from "react";
import { CreditCard, Globe2, Wallet } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { ApiError, errorMessage } from "../../app/api";
import StripePaymentForm from "./StripePaymentForm";
import {
  amountFromPounds,
  formatMinor,
  mcomWalletTopUpUrl,
  paymentsApi,
  type PaymentMethod,
  type PaymentResponse,
  type WalletBalanceView,
} from "./paymentsApi";

export type PaymentTarget =
  | {
      kind: "PLAN";
      planId: string;
      planName: string;
      amountPounds: number;
      agreementAccepted: boolean;
      onPaid: () => void | Promise<void>;
    }
  | {
      kind: "CONTRIBUTION";
      groupId: string;
      groupName: string;
      amountPounds: number;
      frequency: string;
      /** The group owner who receives the contribution, when known. */
      payeeName?: string;
      onPaid: () => void | Promise<void>;
    };

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  target: PaymentTarget | null;
}

const METHODS: Array<{
  id: PaymentMethod;
  label: string;
  hint: string;
  icon: typeof Wallet;
}> = [
  {
    id: "WALLET",
    label: "MCOM Wallet",
    hint: "1 MCOM = £1.00",
    icon: Wallet,
  },
  {
    id: "STRIPE",
    label: "Card",
    hint: "Stripe · secure",
    icon: CreditCard,
  },
  {
    id: "PAYPAL",
    label: "PayPal",
    hint: "PayPal checkout",
    icon: Globe2,
  },
];

export default function PaymentDialog({
  open,
  onClose,
  target,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [created, setCreated] = useState<PaymentResponse | null>(null);
  const [balance, setBalance] = useState<WalletBalanceView | null>(null);

  const amountMinor = target
    ? amountFromPounds(target.amountPounds)
    : "0";

  useEffect(() => {
    if (!open || method !== "WALLET" || balance) return;
    let active = true;
    paymentsApi
      .walletBalance()
      .then((result) => {
        if (active) setBalance(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, method, balance]);

  const reset = () => {
    setBusy(false);
    setError(null);
    setErrorCode(null);
    setCreated(null);
    setBalance(null);
    setMethod("WALLET");
  };

  const close = () => {
    reset();
    onClose();
  };

  if (!target) return null;

  const insufficient =
    method === "WALLET" &&
    balance != null &&
    balance.availableBalance < Number(amountMinor) / 100;

  const complete = async () => {
    await target.onPaid();
    close();
  };

  const startPayment = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setErrorCode(null);
    setCreated(null);

    try {
      sessionStorage.setItem(
        "mcom:payment:return",
        `${window.location.pathname}${window.location.search}`,
      );

      const response =
        target.kind === "PLAN"
          ? await paymentsApi.createPlanPayment({
              planId: target.planId,
              method,
              agreementAccepted: target.agreementAccepted,
            })
          : await paymentsApi.createContributionPayment(
              target.groupId,
              method,
            );

      setCreated(response);

      if (
        response.activated ||
        response.alreadyPaid ||
        response.payment?.status === "PAID"
      ) {
        await complete();
        return;
      }

      if (method === "PAYPAL") {
        if (!response.approvalUrl) {
          setError("PayPal did not return an approval link. Please try again.");
          return;
        }
        window.location.href = response.approvalUrl;
        return;
      }

      if (method === "WALLET") {
        setError("The wallet payment is still pending. Please try again.");
        return;
      }
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) {
        const body = cause.body as { code?: string } | null;
        setErrorCode(body?.code ?? null);
      }
    } finally {
      setBusy(false);
    }
  };

  const stripeReady =
    method === "STRIPE" && created?.clientSecret && created.payment;

  const payeeName =
    created?.payee?.name ??
    (target.kind === "CONTRIBUTION" ? target.payeeName : undefined);
  const hasOwnerPayee =
    Boolean(payeeName) && !/^(admin|system)$/i.test((payeeName ?? "").trim());

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) close();
      }}
      title="Pay with MCOM Pay"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-gold-500/25 bg-gold-500/10 px-4 py-3">
          <p className="text-[11px] text-gold-200/80">
            {target.kind === "PLAN" ? "Plan access" : "Group contribution"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              {target.kind === "PLAN" ? target.planName : target.groupName}
            </p>
            <p className="text-lg font-bold text-white">
              {formatMinor(amountMinor)}
              {target.kind === "CONTRIBUTION" && target.frequency !== "once" ? (
                <span className="ml-1 text-xs font-normal text-slate-400">
                  /{target.frequency}
                </span>
              ) : null}
            </p>
          </div>
          {hasOwnerPayee ? (
            <p className="mt-1 text-[10px] text-slate-500">
              Payee:{" "}
              <span className="font-semibold text-gold-200">{payeeName}</span>{" "}
              · settled through MCOM Pay payee splits.
            </p>
          ) : null}
        </div>

        {!stripeReady && !created?.clientSecret && (
          <div className="grid gap-2 sm:grid-cols-3">
            {METHODS.map(({ id, label, hint, icon: Icon }) => {
              const selected = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMethod(id);
                    setError(null);
                    setErrorCode(null);
                    setCreated(null);
                  }}
                  className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-gold-500/60 bg-gold-500/10"
                      : "border-white/10 bg-ink-950/60 hover:border-white/20"
                  }`}
                >
                  <Icon
                    className={`size-4 ${
                      selected ? "text-gold-300" : "text-slate-400"
                    }`}
                  />
                  <span className="text-xs font-semibold text-white">
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-500">{hint}</span>
                </button>
              );
            })}
          </div>
        )}

        {method === "WALLET" && !stripeReady && (
          <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
            {balance ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">
                    Available balance
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {balance.availableBalance.toFixed(2)} MCOM
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Wallet status: {balance.status}
                  </p>
                </div>
                <a
                  href={mcomWalletTopUpUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-gold-300 underline-offset-2 hover:underline"
                >
                  Top up
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Checking wallet balance…
                </p>
                <a
                  href={mcomWalletTopUpUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-gold-300 underline-offset-2 hover:underline"
                >
                  Top up
                </a>
              </div>
            )}
          </div>
        )}

        {stripeReady && created?.payment && created.clientSecret && (
          <div className="flex flex-col gap-2">
            <StripePaymentForm
              paymentId={created.payment.id}
              clientSecret={created.clientSecret}
              returnUrl={`${window.location.origin}/payment/return?paymentId=${created.payment.id}`}
              onPaid={complete}
              onError={(message) => setError(message)}
            />
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="self-start text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-white hover:underline"
            >
              Use a different payment method
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5">
            <p className="text-xs text-danger-400">{error}</p>
            {(errorCode === "INSUFFICIENT_BALANCE" || insufficient) && (
              <a
                href={mcomWalletTopUpUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] font-semibold text-gold-300 underline-offset-2 hover:underline"
              >
                Top up your MCOM Wallet
              </a>
            )}
          </div>
        )}

        {!stripeReady && (
          <Button
            size="md"
            onClick={() => void startPayment()}
            disabled={busy || insufficient}
          >
            {busy
              ? "Starting payment…"
              : method === "WALLET"
                ? `Pay ${formatMinor(amountMinor)} from wallet`
                : method === "PAYPAL"
                  ? "Continue with PayPal"
                  : "Continue to card payment"}
          </Button>
        )}

        {insufficient && (
          <p className="-mt-2 text-[11px] text-warning-400">
            Your available balance is lower than this payment.
          </p>
        )}

        <p className="text-center text-[10px] leading-relaxed text-slate-500">
          Payments are processed securely by MCOM Pay. The amount is set by
          247GBS Groups and cannot be changed by the browser.
        </p>
      </div>
    </Modal>
  );
}
