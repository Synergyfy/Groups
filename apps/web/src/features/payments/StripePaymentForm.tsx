import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Button from "../../components/ui/Button";
import { errorMessage } from "../../app/api";
import { paymentsApi } from "./paymentsApi";

const publishableKey = (
  import.meta.env as { VITE_STRIPE_PUBLISHABLE_KEY?: string } | undefined
)?.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface StripePaymentFormProps {
  paymentId: string;
  clientSecret: string;
  returnUrl: string;
  onPaid: () => void | Promise<void>;
  onError: (message: string) => void;
}

export default function StripePaymentForm(props: StripePaymentFormProps) {
  if (!stripePromise) {
    return (
      <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
        Card payments are not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to the
        environment.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#d4af37",
            borderRadius: "10px",
          },
        },
      }}
    >
      <StripeForm {...props} />
    </Elements>
  );
}

function StripeForm({
  paymentId,
  returnUrl,
  onPaid,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Card payment failed.");
        return;
      }

      if (paymentIntent) {
        await paymentsApi.confirmPayment(paymentId, {
          paymentIntentId: paymentIntent.id,
        });
        await onPaid();
      }
    } catch (cause) {
      onError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <PaymentElement />
      <Button type="submit" size="md" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : "Pay securely"}
      </Button>
      <p className="text-[10px] leading-relaxed text-slate-500">
        Card details are entered in Stripe's secure payment element. MCOM never
        sees or stores your card number.
      </p>
    </form>
  );
}
