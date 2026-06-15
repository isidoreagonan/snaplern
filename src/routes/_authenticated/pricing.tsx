import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import {
  Check, Crown, Sparkles, ArrowLeft, Zap, X, Star,
  Brain, Infinity as InfinityIcon, Network, FileDown, Timer, Headphones,
  ShieldCheck, Lock, ChevronDown, X as XIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getBillingStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "SnapLern Aura — Plans" }] }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<string>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const status = await getBillingStatus({
        data: { environment: getStripeEnvironment() },
      });
      setPlan(status.plan);
      setTrialEndsAt(status.trialEndsAt);
    })();
  }, []);

  const startTrial = () => {
    setCheckoutOpen(true);
  };

  const isPro = plan === "pro" || plan === "trial";

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/app" })}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <header className="text-center mb-12 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white text-xs font-bold mb-4">
          <Crown className="h-3.5 w-3.5" /> SnapLern Aura
        </div>
        <h1 className="text-4xl md:text-5xl font-black font-display leading-tight">
          Libère tout le potentiel de ton apprentissage
        </h1>
        <p className="text-slate-500 mt-3">
          Commence par 7 jours gratuits. Sans carte requise pour l'instant.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-7 border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-slate-400" />
            <h2 className="font-display font-black text-2xl">Gratuit</h2>
          </div>
          <p className="text-sm text-slate-500 mb-5">Pour découvrir SnapLern</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-5xl font-black">0€</span>
            <span className="text-slate-400">/mois</span>
          </div>
          <ul className="space-y-2.5 text-sm mb-6">
            <Bullet>3 analyses d'images / mois</Bullet>
            <Bullet>5 questions Oracle / jour</Bullet>
            <Bullet>20 flashcards max au total</Bullet>
            <Bullet>1 mindmap par mois</Bullet>
            <Bullet>Lecture audio en streaming (sans MP3)</Bullet>
            <Bullet muted>Pas d'examens chronométrés</Bullet>
            <Bullet muted>Pas d'export PDF des cours</Bullet>
            <Bullet muted>Pas de Forge SRS avancée</Bullet>
          </ul>
          {!isPro && (
            <div className="text-center text-xs font-mono uppercase tracking-wider text-slate-400 py-3">
              Plan actuel
            </div>
          )}
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative bg-gradient-to-br from-slate-900 via-[#2a1a18] to-[#ff6b5a] rounded-[24px] p-7 text-white overflow-hidden"
        >
          <motion.div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-[#fde047]" />
              <h2 className="font-display font-black text-2xl">Aura — Pro</h2>
            </div>
            <p className="text-sm text-white/70 mb-5">Pour les apprenants sérieux</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-black">8,99€</span>
              <span className="text-white/60">/mois</span>
            </div>
            <p className="text-xs text-white/60 mb-6">7 jours gratuits, sans engagement</p>
            <ul className="space-y-2.5 text-sm mb-6">
              <Bullet dark>Analyses illimitées (image & PDF)</Bullet>
              <Bullet dark>Oracle illimité, réponses prioritaires</Bullet>
              <Bullet dark>Flashcards illimitées + Forge SRS (SM-2)</Bullet>
              <Bullet dark>Mindmaps auto interactives illimitées</Bullet>
              <Bullet dark>Examens chronométrés notés par IA</Bullet>
              <Bullet dark>Export PDF élégant de tes cours</Bullet>
              <Bullet dark>Téléchargement audio MP3 des cours</Bullet>
              <Bullet dark>Support prioritaire &lt; 24h</Bullet>
            </ul>
            {isPro ? (
              <div className="text-center bg-white/10 rounded-full py-3 text-sm font-bold">
                {plan === "trial" && trialEndsAt
                  ? `Essai actif — fin ${new Date(trialEndsAt).toLocaleDateString("fr-FR")}`
                  : "Plan actuel ✨"}
              </div>
            ) : (
              <button
                onClick={startTrial}
                className="w-full bg-white text-slate-900 font-black rounded-full py-3.5 hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" /> Essayer Pro 7 jours
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-8 max-w-md mx-auto">
        Paiement sécurisé · Annulable à tout moment · TVA incluse
      </p>

      <div className="text-center mt-6">
        <Link to="/settings" className="text-sm text-[#ff7a6c] hover:underline font-semibold">
          Gérer mon abonnement →
        </Link>
      </div>

      <SocialProof />
      <WhyPro />
      <FAQ />
      <SecurityStrip />

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Paiement — Essai Pro 7 jours</DialogTitle>
          <button
            onClick={() => setCheckoutOpen(false)}
            className="absolute top-3 right-3 z-10 rounded-full bg-white/80 backdrop-blur p-1.5 hover:bg-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="max-h-[85vh] overflow-y-auto">
            {checkoutOpen && <StripeEmbeddedCheckout priceId="pro_monthly" />}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Bullet({ children, dark = false, muted = false }: { children: React.ReactNode; dark?: boolean; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {muted ? (
        <XIcon className="h-4 w-4 mt-0.5 shrink-0 text-slate-300" />
      ) : (
        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${dark ? "text-[#fde047]" : "text-emerald-500"}`} />
      )}
      <span className={muted ? "text-slate-400 line-through" : dark ? "text-white/90" : "text-slate-700"}>
        {children}
      </span>
    </li>
  );
}

const AVATARS = [
  "https://i.pravatar.cc/120?img=47",
  "https://i.pravatar.cc/120?img=32",
  "https://i.pravatar.cc/120?img=12",
  "https://i.pravatar.cc/120?img=68",
];

function SocialProof() {
  return (
    <section className="max-w-4xl mx-auto mt-20 mb-16">
      <div className="bg-white rounded-[28px] border border-slate-100 p-8 flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
        <div className="flex -space-x-3">
          {AVATARS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Étudiant ${i + 1}`}
              className="h-14 w-14 rounded-full border-4 border-white object-cover shadow-sm"
              loading="lazy"
            />
          ))}
        </div>
        <div>
          <div className="flex items-center justify-center md:justify-start gap-0.5 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm font-bold text-slate-900">4,9/5</span>
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-black text-slate-900">+150 étudiants</span> révisent déjà avec SnapLern Pro
          </p>
        </div>
      </div>
    </section>
  );
}

const PRO_BENEFITS = [
  { icon: InfinityIcon, title: "Tout en illimité", desc: "Analyses, Oracle, flashcards, mindmaps — plus aucune limite." },
  { icon: Network, title: "Mindmaps interactives", desc: "Visualise instantanément la structure de tes cours." },
  { icon: Timer, title: "Examens chronométrés", desc: "Simule l'épreuve réelle avec notation IA et points faibles." },
  { icon: FileDown, title: "Export PDF élégant", desc: "Télécharge tes cours + résumés + flashcards brandés." },
  { icon: Brain, title: "Forge SRS avancée", desc: "Algorithme SM-2 pour mémoriser durablement, scientifiquement." },
  { icon: Headphones, title: "Audio MP3 hors-ligne", desc: "Écoute tes cours partout, même sans connexion." },
];

function WhyPro() {
  return (
    <section className="max-w-5xl mx-auto mt-4 mb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black font-display">
          Pourquoi passer à l'abonnement Pro ?
        </h2>
        <p className="text-slate-500 mt-2">Les 6 raisons qui changent vraiment ta façon de réviser.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRO_BENEFITS.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] flex items-center justify-center mb-4">
              <b.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-display font-black text-lg mb-1">{b.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Puis-je annuler mon abonnement à tout moment ?",
    a: "Oui. Tu peux annuler en un clic depuis Réglages → Gérer mon abonnement. Tu gardes l'accès Pro jusqu'à la fin de la période en cours, sans frais cachés.",
  },
  {
    q: "Comment fonctionnent les 7 jours gratuits ?",
    a: "Tu bénéficies de 7 jours d'essai gratuit avec un accès complet à toutes les fonctionnalités Pro. Tu peux annuler à tout moment pendant l'essai — aucun prélèvement ne sera effectué.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Tes cours, flashcards et historiques sont stockés de manière chiffrée et tu es le seul à pouvoir y accéder grâce à nos règles de sécurité au niveau de la base de données (RLS).",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Toutes les cartes bancaires (Visa, Mastercard, AMEX) via Stripe, le standard mondial du paiement sécurisé. SnapLern ne stocke jamais tes informations bancaires.",
  },
  {
    q: "Puis-je changer ou rembourser après le paiement ?",
    a: "Tu peux annuler à tout moment et ton accès restera actif jusqu'à la fin de la période payée. Pour toute demande spécifique, contacte le support — on répond en moins de 24h.",
  },
  {
    q: "Le plan gratuit reste-t-il disponible ?",
    a: "Oui, toujours. Tu peux revenir au plan gratuit quand tu veux, avec les limites associées (3 analyses/mois, 20 flashcards, etc.).",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="max-w-3xl mx-auto mb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black font-display">Questions fréquentes</h2>
        <p className="text-slate-500 mt-2">Tout ce que tu dois savoir avant de te lancer.</p>
      </div>
      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 text-left p-5 hover:bg-slate-50/50"
                aria-expanded={isOpen}
              >
                <span className="font-bold text-slate-900">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SecurityStrip() {
  return (
    <section className="max-w-4xl mx-auto mb-16">
      <div className="rounded-[24px] bg-gradient-to-br from-slate-50 to-orange-50/40 border border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">Paiement sécurisé Stripe</span>
        </div>
        <div className="h-4 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">Données chiffrées (RLS)</span>
        </div>
        <div className="h-4 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">Annulable en 1 clic</span>
        </div>
      </div>
    </section>
  );
}