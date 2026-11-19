import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { errorMessage } from "../../app/api";
import { paymentsApi, type PaymentView } from "../payments/paymentsApi";

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
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !paymentId) return;
    started.current = true;

    paymentsApi
      .confirmPayment(paymentId, { paymentIntentId, orderId })
      .then((result) => {
        setPayment(result.payment);
        setState("success");
        setMessage("Payment received. Your purchase is now active.");
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
