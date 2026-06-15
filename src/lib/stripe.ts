/**
 * Browser-safe Stripe helpers.
 * NOTE: Do NOT import from "@/lib/stripe.server" here — that file is server-only.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

// Stripe direct: use VITE_STRIPE_PUBLISHABLE_KEY (pk_live_… or pk_test_…)
// Falls back to the legacy Lovable token for backward compatibility.
const clientToken =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined);

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_live_")) return "live";
  return "sandbox";
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not configured");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}