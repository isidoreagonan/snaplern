import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const Env = z.enum(["sandbox", "live"]);

/**
 * Reuse an existing Stripe customer if we've stamped one on the profile,
 * otherwise create a new one and stamp it so the lookup is stable across
 * sandbox/live and across sessions.
 */
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  args: { userId: string; email: string | undefined; supabase: any },
): Promise<string> {
  const { userId, email, supabase } = args;
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { userId },
  });
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);
  return customer.id;
}

function extractStripePrice(listResponse: unknown) {
  if (
    listResponse &&
    typeof listResponse === "object" &&
    "data" in listResponse &&
    Array.isArray((listResponse as { data?: unknown }).data)
  ) {
    return ((listResponse as { data: Array<{ id: string }> }).data[0] ?? null);
  }

  if (
    listResponse &&
    typeof listResponse === "object" &&
    "message" in listResponse &&
    typeof (listResponse as { message?: unknown }).message === "string"
  ) {
    throw new Error((listResponse as { message: string }).message);
  }

  throw new Error("Unexpected payment provider response while resolving the price");
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        priceId: z.string().min(1).max(120),
        environment: Env,
        returnUrl: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: userResp } = await supabase.auth.getUser();
    const email = userResp.user?.email ?? undefined;

    const stripe = createStripeClient(data.environment);

    // Resolve the price by lookup_key (the human-readable ID we created with)
    const prices = await stripe.prices.list({
      lookup_keys: [data.priceId],
      active: true,
      limit: 1,
    });
    const price = extractStripePrice(prices);
    if (!price) throw new Error(`Price not found: ${data.priceId}`);

    const customerId = await resolveOrCreateCustomer(stripe, {
      userId,
      email,
      supabase,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      payment_method_collection: "always",
      ui_mode: "embedded_page",
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: { userId },
      },
      return_url: `${data.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      metadata: { userId },
    });

    if (!session.client_secret) throw new Error("Stripe did not return a client secret");
    return { clientSecret: session.client_secret };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ environment: Env, returnUrl: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("Aucun abonnement trouvé");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: data.returnUrl,
    });
    return { url: portal.url };
  });
