import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { ArrowLeft, Crown, User, Mail, LogOut, Trash2, Bell, Globe, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getBillingStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Paramètres — SnapLern" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [plan, setPlan] = useState("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [analysesCount, setAnalysesCount] = useState(0);
  const [emailNotif, setEmailNotif] = useState(true);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const [{ data }, billing] = await Promise.all([
        supabase
        .from("profiles")
        .select("display_name,analyses_count")
        .eq("user_id", u.user.id)
        .maybeSingle(),
        getBillingStatus({ data: { environment: getStripeEnvironment() } }),
      ]);
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAnalysesCount(data.analyses_count);
      }
      setPlan(billing.plan);
      setTrialEndsAt(billing.trialEndsAt);
      setLoading(false);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      setNewPassword("");
      toast.success("Mot de passe modifié");
    }
  };

  const cancelPro = async () => {
    try {
      const { url } = await createPortalSession({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/settings`,
        },
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'ouvrir la gestion d'abonnement");
    }
  };

  if (loading) {
    return <AppShell><div className="flex items-center justify-center h-96"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div></AppShell>;
  }

  const isPro = plan === "pro" || plan === "trial";

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/app" })}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black font-display">Paramètres</h1>
        <p className="text-slate-500 mt-1">Compte, abonnement et préférences.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-5 max-w-5xl">
        {/* Subscription card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-[#ff6b5a] rounded-[24px] p-6 text-white relative overflow-hidden">
          <Crown className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5" />
          <div className="relative">
            <div className="text-xs font-mono uppercase tracking-widest text-white/60 mb-2">Mon abonnement</div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black font-display">
                {isPro ? "SnapLern Aura — Pro" : "Plan Gratuit"}
              </h2>
              {plan === "trial" && (
                <span className="text-[10px] font-mono bg-[#fde047] text-slate-900 px-2 py-0.5 rounded-full font-bold">ESSAI</span>
              )}
            </div>
            {plan === "trial" && trialEndsAt && (
              <p className="text-sm text-white/80">
                Fin de l'essai : {new Date(trialEndsAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}
            {plan === "free" && (
              <p className="text-sm text-white/80">{analysesCount} analyses effectuées</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {!isPro ? (
                <Link to="/pricing" className="bg-white text-slate-900 px-5 py-2.5 rounded-full font-bold text-sm hover:scale-[1.03] transition">
                  Passer à Pro →
                </Link>
              ) : (
                <>
                  <Link to="/pricing" className="bg-white/15 backdrop-blur text-white px-5 py-2.5 rounded-full font-bold text-sm border border-white/20 hover:bg-white/25 transition">
                    Voir le plan
                  </Link>
                  <button onClick={cancelPro} className="bg-white/15 backdrop-blur text-white px-5 py-2.5 rounded-full font-bold text-sm border border-white/20 hover:bg-white/25 transition">
                    Gérer l'abonnement
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile shortcut */}
        <Link to="/profile" className="bg-white rounded-[24px] p-6 border border-slate-100 hover:border-[#ff7a6c] transition group">
          <User className="h-6 w-6 text-[#ff7a6c] mb-2" />
          <h3 className="font-black text-lg">Mon profil</h3>
          <p className="text-sm text-slate-500 mt-1">{displayName || email}</p>
          <p className="text-xs text-[#ff7a6c] mt-3 font-semibold group-hover:underline">Modifier →</p>
        </Link>

        {/* Email */}
        <Section icon={Mail} title="Email">
          <div className="text-sm text-slate-700">{email}</div>
          <p className="text-xs text-slate-400 mt-1">Contacte le support pour modifier ton email.</p>
        </Section>

        {/* Password */}
        <Section icon={Shield} title="Mot de passe">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-2 outline-none focus:border-[#ff7a6c]"
          />
          <button
            onClick={changePassword}
            className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-[#ff7a6c] transition"
          >
            Mettre à jour
          </button>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Notifications email">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700">Recevoir les rappels d'étude</span>
            <button
              onClick={() => setEmailNotif((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition ${emailNotif ? "bg-[#ff7a6c]" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${emailNotif ? "translate-x-4" : ""}`} />
            </button>
          </label>
        </Section>

        {/* Language */}
        <Section icon={Globe} title="Langue">
          <div className="text-sm text-slate-700">Français 🇫🇷</div>
          <p className="text-xs text-slate-400 mt-1">D'autres langues bientôt.</p>
        </Section>

        {/* Danger zone */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-6 border border-red-100">
          <h3 className="font-black text-lg text-red-600 mb-2">Zone sensible</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-full"
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
            <button
              onClick={() => toast.info("Contacte le support pour supprimer ton compte.")}
              className="inline-flex items-center gap-2 text-sm font-bold bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-full"
            >
              <Trash2 className="h-4 w-4" /> Supprimer mon compte
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="font-bold text-sm text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}