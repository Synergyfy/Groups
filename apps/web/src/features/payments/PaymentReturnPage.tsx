import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { errorMessage } from "../../app/api";
import {
  formatMinor,
  paymentsApi,
  type PaymentSplitsView,
  type PaymentView,
} from "../payments/paymentsApi";

export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = params.get("paymentId") ?? "";
  const paymentIntentId = params.get("payment_intent") ?? undefined;
  const orderId = params.get("token") ?? undefined;
  const [state, setState] = useState<"loading" | "success" | "error">(
    paymentId ? "loading" : "error",
  );
  const [message, setMessage] = useState<string>(
    paymentId
      ? "Confirming your payment…"
      : "The payment reference is missing from the return link.",
  );
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [splits, setSplits] = useState<PaymentSplitsView | null>(null);
  const started = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (started.current || !paymentId) return;
    started.current = true;

    const pollSplits = async (id: string) => {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        try {
          const result = await paymentsApi.getSplits(id);
          if (!alive.current) return;
          setSplits(result);
          if (result.settlementState === "SETTLED") {
            setMessage("Payment received. The group owner has been credited.");
            return;
          }
          if (result.settlementState === "FAILED") {
            setMessage(
              "Payment received, but the group owner's credit failed. MCOM retries failed splits automatically.",
            );
            return;
          }
        } catch {
          // Settlement may not have a split record yet; keep polling briefly.
        }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        if (!alive.current) return;
      }
      if (alive.current) {
        setMessage(
          "Payment received. The group owner's credit is still being processed.",
        );
      }
    };

    paymentsApi
      .confirmPayment(paymentId, { paymentIntentId, orderId })
      .then((result) => {
        setPayment(result.payment);
        setState("success");
        setMessage("Payment received. Your purchase is now active.");
        if (
          result.payment?.purpose === "GROUP_CONTRIBUTION" &&
          result.payment.payee
        ) {
          void pollSplits(result.payment.id);
        }
      })
      .catch((cause) => {
        setState("error");
        setMessage(errorMessage(cause));
      });
  }, [paymentId, paymentIntentId, orderId]);

  const goBack = () => {
    const stored = sessionStorage.getItem("mcom:payment:return");
    if (stored) {
      sessionStorage.removeItem("mcom:payment:return");
      navigate(stored, { replace: true });
      return;
    }
    navigate(
      payment?.purpose === "PLAN_ACCESS"
        ? "/business/plan"
        : "/business/groups",
      { replace: true },
    );
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <Card className="w-full">
        <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
          {state === "loading" && (
            <div className="size-8 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400" />
          )}
          {state === "success" && (
            <CheckCircle2 className="size-10 text-success-400" />
          )}
          {state === "error" && (
            <XCircle className="size-10 text-danger-400" />
          )}
          <CardTitle>
            {state === "loading"
              ? "Confirming payment"
              : state === "success"
                ? "Payment complete"
                : "Payment not confirmed"}
          </CardTitle>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            {message}
          </p>
          {payment?.purpose === "GROUP_CONTRIBUTION" && payment.payee ? (
            <div className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-left">
              <p className="text-[11px] text-slate-400">
                Payee:{" "}
                <span className="font-semibold text-gold-200">
                  {payment.payee?.name ?? "Group owner"}
                </span>
              </p>
              {splits ? (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Settlement: {splits.settlementState}
                  {splits.splits.length > 0
                    ? ` · ${splits.splits
                        .map(
                          (split) =>
                            `${split.status} (${formatMinor(split.netMinor)})`,
                        )
                        .join(", ")}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}
          {state !== "loading" && (
            <Button size="md" onClick={goBack}>
              Continue
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function PaymentCancelPage() {
  const navigate = useNavigate();
  const goBack = () => {
    const stored = sessionStorage.getItem("mcom:payment:return");
    if (stored) {
      sessionStorage.removeItem("mcom:payment:return");
      navigate(stored, { replace: true });
      return;
    }
    navigate(-1);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <Card className="w-full">
        <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
          <XCircle className="size-10 text-warning-400" />
          <CardTitle>Payment cancelled</CardTitle>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            No money was taken. You can return and try again whenever you are
            ready.
          </p>
          <Button size="md" onClick={goBack}>
            Go back
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
