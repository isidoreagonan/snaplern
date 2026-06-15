import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBillingStatusForUser } from "@/lib/billing.server";
import { getStripeEnvironment } from "@/lib/stripe";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
  context: z.string().max(20000).optional(),
});

const SYSTEM = `Tu es Oracle, le tuteur IA de SnapLern. Tu réponds en français, de manière claire, pédagogique et concise (réponses courtes et structurées avec puces si utile). Tu peux expliquer un concept, corriger un exercice, créer un plan de révision, générer une question, donner un exemple. Si l'utilisateur fournit un contexte de cours, base-toi en priorité dessus. N'invente jamais ce que tu ne sais pas.`;

export const askOracle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: u } = await supabase.auth.getUser();
    const billing = await getBillingStatusForUser({
      environment: getStripeEnvironment(),
      userId: u.user!.id,
      email: u.user?.email ?? undefined,
    });
    const isPro = billing.hasActiveSubscription;
    if (!isPro) {
      const { data: quota } = await supabase.rpc("consume_oracle_quota", { p_limit: 20 });
      const row = Array.isArray(quota) ? quota[0] : quota;
      if (!row?.allowed) {
        throw new Error("Limite atteinte : 20 questions Oracle / jour en plan Gratuit. Passe à Pro pour l'illimité.");
      }
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    const systemContent = data.context
      ? `${SYSTEM}\n\nContexte de cours fourni par l'étudiant :\n${data.context}`
      : SYSTEM;

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemContent }, ...data.messages],
      }),
    });
    if (res.status === 429) throw new Error("Trop de requêtes, réessaie dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    if (!res.ok) throw new Error("Oracle indisponible");
    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content ?? "…";
    return { reply: String(reply) };
  });
