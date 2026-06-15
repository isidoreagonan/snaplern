import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

// Map Stripe status to our profile.plan label
function planFromStatus(status: string): "pro" | "trial" | "free" {
  if (status === "trialing") return "trial";
  if (status === "active" || status === "past_due") return "pro";
  return "free";
}

async function syncProfile(userId: string, sub: any) {
  const plan = planFromStatus(sub.status);
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const trialEnd = sub.trial_end ?? null;

  await getSupabase()
    .from("profiles")
    .update({
      plan,
      trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    })
    .eq("user_id", userId);
  void periodEnd;
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[stripe-webhook] No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await syncProfile(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (userId) {
    await getSupabase()
      .from("profiles")
      .update({ plan: "free", trial_ends_at: null })
      .eq("user_id", userId);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.trial_will_end":
      await handleSubscriptionUpsert(obj, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(obj, env);
      break;
    case "invoice.payment_failed": {
      // Stripe will retry; once it gives up the subscription transitions
      // to `canceled` and customer.subscription.deleted fires — handled above.
      console.log("[stripe-webhook] payment failed for", obj.customer);
      break;
    }
    default:
      console.log("[stripe-webhook] unhandled:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[stripe-webhook] invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});