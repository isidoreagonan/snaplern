import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

export type BillingPlan = "free" | "trial" | "pro";

export type BillingStatus = {
  plan: BillingPlan;
  hasActiveSubscription: boolean;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  environment: StripeEnv;
};

type LocalSubscription = {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

function toIso(seconds?: number | null): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function isFuture(value?: string | number | null): boolean {
  if (!value) return false;
  const timestamp = typeof value === "number" ? value * 1000 : Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function hasAccess(status?: string | null, currentPeriodEnd?: string | number | null): boolean {
  if (!status) return false;
  if (status === "trialing" || status === "active" || status === "past_due") {
    return !currentPeriodEnd || isFuture(currentPeriodEnd);
  }
  return status === "canceled" && isFuture(currentPeriodEnd);
}

function derivePlan(status?: string | null, currentPeriodEnd?: string | number | null): BillingPlan {
  if (status === "trialing") return "trial";
  if (status === "active" || status === "past_due") return "pro";
  if (status === "canceled" && isFuture(currentPeriodEnd)) return "pro";
  return "free";
}

function rankSubscription(subscription: any): number {
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end ?? null;
  const status = String(subscription.status ?? "");

  if (status === "trialing") return 500_000_000 + Number(periodEnd ?? 0);
  if (status === "active") return 400_000_000 + Number(periodEnd ?? 0);
  if (status === "past_due") return 300_000_000 + Number(periodEnd ?? 0);
  if (status === "canceled" && isFuture(periodEnd)) return 200_000_000 + Number(periodEnd ?? 0);
  return Number(periodEnd ?? 0);
}

async function getProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id,trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function getLocalSubscription(userId: string, environment: StripeEnv) {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_subscription_id,stripe_customer_id,status,current_period_end,cancel_at_period_end")
    .eq("user_id", userId)
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as LocalSubscription | null;
}

async function syncProfile(userId: string, status: BillingStatus) {
  await supabaseAdmin
    .from("profiles")
    .update({
      plan: status.plan,
      trial_ends_at: status.trialEndsAt,
      stripe_customer_id: status.customerId,
    })
    .eq("user_id", userId);
}

function fromLocal(local: LocalSubscription | null, environment: StripeEnv, trialEndsAt?: string | null): BillingStatus {
  const status = local?.status ?? null;
  const currentPeriodEnd = local?.current_period_end ?? null;
  const plan = derivePlan(status, currentPeriodEnd);

  return {
    plan,
    hasActiveSubscription: hasAccess(status, currentPeriodEnd),
    subscriptionStatus: status,
    subscriptionId: local?.stripe_subscription_id ?? null,
    customerId: local?.stripe_customer_id ?? null,
    trialEndsAt: plan === "trial" ? trialEndsAt ?? currentPeriodEnd : null,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(local?.cancel_at_period_end),
    environment,
  };
}

function fromStripe(subscription: any, environment: StripeEnv): BillingStatus {
  const item = subscription.items?.data?.[0];
  const currentPeriodEnd = toIso(item?.current_period_end ?? subscription.current_period_end ?? null);
  const trialEndsAt = toIso(subscription.trial_end ?? item?.current_period_end ?? null);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  return {
    plan: derivePlan(subscription.status, currentPeriodEnd),
    hasActiveSubscription: hasAccess(subscription.status, currentPeriodEnd),
    subscriptionStatus: subscription.status ?? null,
    subscriptionId: subscription.id ?? null,
    customerId,
    trialEndsAt: subscription.status === "trialing" ? trialEndsAt : null,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    environment,
  };
}

async function upsertSubscription(userId: string, environment: StripeEnv, subscription: any) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      product_id: typeof productId === "string" ? productId : "unknown",
      price_id: typeof priceId === "string" ? priceId : "unknown",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function findBestStripeSubscription(args: {
  environment: StripeEnv;
  userId: string;
  email?: string;
  knownCustomerId?: string | null;
}) {
  const stripe = createStripeClient(args.environment);
  const customerIds = new Set<string>();
  const candidates: any[] = [];

  if (args.knownCustomerId) customerIds.add(args.knownCustomerId);

  if (/^[a-zA-Z0-9_-]+$/.test(args.userId)) {
    const subscriptions = await stripe.subscriptions.search({
      query: `metadata['userId']:'${args.userId}'`,
      limit: 100,
    });
    for (const subscription of subscriptions.data) {
      candidates.push(subscription);
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
      if (customerId) customerIds.add(customerId);
    }

    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${args.userId}'`,
      limit: 100,
    });
    for (const customer of customers.data) customerIds.add(customer.id);
  }

  if (args.email) {
    const byEmail = await stripe.customers.list({ email: args.email, limit: 100 });
    for (const customer of byEmail.data) customerIds.add(customer.id);
  }

  for (const customerId of customerIds) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    candidates.push(...subscriptions.data);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => rankSubscription(b) - rankSubscription(a));
  return candidates[0] ?? null;
}

export async function getBillingStatusForUser(args: {
  environment: StripeEnv;
  userId: string;
  email?: string;
}): Promise<BillingStatus> {
  // Admins bypass billing entirely — unlimited Pro access, no Stripe lookup.
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: args.userId,
    _role: "admin",
  });
  if (isAdmin === true) {
    return {
      plan: "pro",
      hasActiveSubscription: true,
      subscriptionStatus: "admin",
      subscriptionId: null,
      customerId: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      environment: args.environment,
    };
  }

  const profile = await getProfile(args.userId);
  const local = await getLocalSubscription(args.userId, args.environment);
  const localStatus = fromLocal(local, args.environment, profile?.trial_ends_at ?? null);

  if (localStatus.hasActiveSubscription) {
    await syncProfile(args.userId, localStatus);
    return localStatus;
  }

  const stripeSubscription = await findBestStripeSubscription({
    environment: args.environment,
    userId: args.userId,
    email: args.email,
    knownCustomerId: profile?.stripe_customer_id ?? local?.stripe_customer_id ?? null,
  });

  if (stripeSubscription) {
    const stripeStatus = fromStripe(stripeSubscription, args.environment);
    await upsertSubscription(args.userId, args.environment, stripeSubscription);
    await syncProfile(args.userId, stripeStatus);
    return stripeStatus;
  }

  await syncProfile(args.userId, localStatus);
  return localStatus;
}