import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { getBillingStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Paiement confirmé — SnapLern" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const [syncing, setSyncing] = useState(Boolean(session_id));
  const [plan, setPlan] = useState<"free" | "trial" | "pro" | null>(null);

  useEffect(() => {
    if (!session_id) return;

    let cancelled = false;

    const poll = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        try {
          const billing = await getBillingStatus({
            data: { environment: getStripeEnvironment() },
          });
          if (billing.hasActiveSubscription) {
            setPlan(billing.plan);
            setSyncing(false);
            return;
          }
        } catch {
          // noop
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!cancelled) setSyncing(false);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black font-display mb-2">
          {session_id ? (syncing ? "Activation en cours…" : "Essai Pro activé !") : "Paiement"}
        </h1>
        <p className="text-slate-500 mb-6">
          {session_id
            ? syncing
              ? "Nous synchronisons ton abonnement. Cela peut prendre quelques secondes après le paiement."
              : plan === "trial" || plan === "pro"
                ? "Ton accès Pro est bien actif. Tu peux maintenant utiliser toutes les fonctionnalités premium."
                : "Le paiement est revenu avec succès, mais la synchronisation prend plus de temps que prévu. Réessaie dans quelques secondes depuis l'app."
            : "Aucune session trouvée."}
        </p>
        {syncing && (
          <div className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Synchronisation de l'abonnement
          </div>
        )}
        <Link
          to="/app"
          className="inline-flex items-center justify-center w-full bg-slate-900 text-white font-bold rounded-full py-3 hover:bg-slate-800"
        >
          Aller à mon espace
        </Link>
      </div>
    </div>
  );
}