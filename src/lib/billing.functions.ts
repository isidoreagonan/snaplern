import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { getBillingStatusForUser } from "@/lib/billing.server";
import { type StripeEnv } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

const Input = z.object({
  environment: z.enum(["sandbox", "live"]),
});

export const getBillingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const environment = data.environment as StripeEnv;
    const freeStatus = {
      plan: "free" as const,
      hasActiveSubscription: false,
      subscriptionStatus: null,
      subscriptionId: null,
      customerId: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      environment,
    };

    const authHeader = getRequestHeader("authorization");
    if (!authHeader?.startsWith("Bearer ")) return freeStatus;
    const token = authHeader.slice("Bearer ".length);
    if (!token) return freeStatus;

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData.user) return freeStatus;

    return getBillingStatusForUser({
      environment,
      userId: userData.user.id,
      email: userData.user.email ?? undefined,
    });
  });
