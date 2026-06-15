import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — SnapLern" },
      { name: "description", content: "Connecte-toi à SnapLern pour apprendre à partir de tes images." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const getErrorMessage = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("weak_password") || msg.includes("pwned")) {
      return "Mot de passe trop faible. Utilise au moins 8 caractères avec majuscules, chiffres et symboles.";
    }
    if (msg.includes("invalid_credentials")) {
      return "Email ou mot de passe incorrect.";
    }
    if (msg.includes("user_already_exists") || msg.includes("already registered")) {
      return "Ce compte existe déjà. Connecte-toi plutôt.";
    }
    if (msg.includes("email_not_confirmed")) {
      return "Confirme ton email avant de te connecter.";
    }
    if (msg.includes("invalid_email")) {
      return "Adresse email invalide.";
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          toast.error("Ce compte existe déjà. Connecte-toi plutôt.");
          setLoading(false);
          return;
        }
        toast.success("Compte créé ! Confirme ton email si demandé.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      }
    });
    if (res.error) {
      toast.error("Erreur Google");
      setLoading(false);
      return;
    }
    if (res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-xl">SNAPLERN</span>
        </Link>
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl shadow-primary/5">
          <h1 className="text-2xl font-display font-bold mb-2">
            {mode === "signin" ? "Bon retour" : "Crée ton compte"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "signin" ? "Reprends ton apprentissage." : "Commence gratuitement."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </Button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="8 caractères minimum" />
              {mode === "signup" && password.length > 0 && password.length < 8 && (
                <p className="text-xs text-red-400 mt-1">Minimum 8 caractères.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>

          <p className="text-sm text-center mt-6 text-muted-foreground">
            {mode === "signin" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline font-medium"
            >
              {mode === "signin" ? "Inscris-toi" : "Connecte-toi"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}