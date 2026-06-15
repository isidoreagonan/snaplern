import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

interface Props {
  priceId: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const res = await createCheckoutSession({
      data: {
        priceId,
        environment: getStripeEnvironment(),
        returnUrl: returnUrl || `${window.location.origin}/checkout/return`,
      },
    });
    return res.clientSecret;
  };

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}