import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight, Upload, Sparkles, SkipForward, Check } from "lucide-react";
import { analyzeImage } from "@/lib/learning.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Bienvenue — SnapLern" }] }),
  component: OnboardingPage,
});

const STUDY_LEVELS = [
  "Collège", "Lycée — Seconde", "Lycée — Première", "Lycée — Terminale",
  "Bac+1 / L1", "Bac+2 / L2", "Bac+3 / L3", "Bac+4 / M1", "Bac+5 / M2",
  "Doctorat", "Formation pro", "Autodidacte", "Autre",
];

const COUNTRIES = [
  "France", "Belgique", "Suisse", "Canada", "Luxembourg", "Maroc", "Algérie",
  "Tunisie", "Sénégal", "Côte d'Ivoire", "Cameroun", "Bénin", "Togo", "Mali",
  "Burkina Faso", "Niger", "Gabon", "Congo", "RDC", "Madagascar", "Haïti",
  "États-Unis", "Royaume-Uni", "Allemagne", "Espagne", "Italie", "Portugal",
  "Pays-Bas", "Autre",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState("");
  const [hasPassword, setHasPassword] = useState(false);

  // step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [saving, setSaving] = useState(false);

  // step 2 upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOnboarding = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          navigate({ to: "/auth" });
          return;
        }

        if (!mounted) return;
        setUserId(user.id);

        const providers = (user.app_metadata?.providers ?? []) as string[];
        setHasPassword(providers.includes("email"));

        const meta = user.user_metadata as Record<string, unknown> | undefined;
        const full = (meta?.full_name as string) || (meta?.name as string) || "";
        const [f, ...rest] = full.split(" ");
        if (f && !firstName) setFirstName(f);
        if (rest.length && !lastName) setLastName(rest.join(" "));

        const { error: ensureProfileError } = await supabase
          .from("profiles")
          .upsert({ user_id: user.id }, { onConflict: "user_id" });

        if (ensureProfileError) throw ensureProfileError;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name,last_name,country,study_level,onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!mounted) return;

        if (profile?.onboarding_completed) {
          navigate({ to: "/app" });
          return;
        }

        if (profile?.first_name) setFirstName(profile.first_name);
        if (profile?.last_name) setLastName(profile.last_name);
        if (profile?.country) setCountry(profile.country);
        if (profile?.study_level) setStudyLevel(profile.study_level);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Impossible de charger ton profil");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOnboarding();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Renseigne ton prénom et ton nom");
      return;
    }
    if (!country) { toast.error("Choisis ton pays"); return; }
    if (!studyLevel) { toast.error("Choisis ton niveau d'études"); return; }
    if (!hasPassword) {
      if (password.length < 8) { toast.error("Mot de passe : 8 caractères minimum"); return; }
      if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    }
    setSaving(true);
    try {
      if (!hasPassword) {
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) throw pwErr;
      }
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country,
          study_level: studyLevel,
          display_name: displayName,
        }, { onConflict: "user_id" });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: displayName } });
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    await supabase
      .from("profiles")
      .upsert({ user_id: userId, onboarding_completed: true }, { onConflict: "user_id" });
    navigate({ to: "/app" });
  };

  const skipUpload = async () => {
    await finish();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop lourde (10 Mo max)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("learning-images")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("learning-images").getPublicUrl(path);

      const { data: session, error: sErr } = await supabase
        .from("learning_sessions")
        .insert({ user_id: userId, image_url: pub.publicUrl, title: file.name, status: "pending" })
        .select("id")
        .single();
      if (sErr) throw sErr;

      await supabase
        .from("profiles")
        .upsert({ user_id: userId, onboarding_completed: true }, { onConflict: "user_id" });

      analyzeImage({ data: { sessionId: session.id, imageUrl: pub.publicUrl } }).catch(() => {});
      toast.success("Ton premier contenu est en cours d'analyse !");
      navigate({ to: "/session/$id", params: { id: session.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <StepDot active n={1} done={step > 1} label="Profil" />
          <div className="h-px w-12 bg-border" />
          <StepDot active={step === 2} n={2} label="Premier contenu" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-primary/5">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-wider">Bienvenue sur SnapLern</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                Faisons connaissance
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Personnalise ton espace pour des recommandations adaptées.
              </p>

              <form onSubmit={submitStep1} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom">
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent focus:border-primary outline-none"
                      required
                    />
                  </Field>
                  <Field label="Nom">
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent focus:border-primary outline-none"
                      required
                    />
                  </Field>
                </div>

                {!hasPassword && (
                  <>
                    <Field label="Mot de passe">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        placeholder="8 caractères minimum"
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent focus:border-primary outline-none"
                        required
                      />
                    </Field>
                    <Field label="Confirmer le mot de passe">
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        minLength={8}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-transparent focus:border-primary outline-none"
                        required
                      />
                    </Field>
                  </>
                )}

                <Field label="Pays">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background focus:border-primary outline-none"
                    required
                  >
                    <option value="">— Choisir —</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Niveau d'études">
                  <select
                    value={studyLevel}
                    onChange={(e) => setStudyLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background focus:border-primary outline-none"
                    required
                  >
                    <option value="">— Choisir —</option>
                    {STUDY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-full font-bold text-sm hover:opacity-90 transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuer <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Check className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-wider">Profil enregistré</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                Lance ta première analyse
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Envoie une photo de cours, un schéma, un exercice — l'IA t'expliquera tout. Tu peux aussi passer cette étape.
              </p>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-primary/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary transition disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm font-bold">Envoi en cours…</span>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-bold">Cliquer pour choisir une image</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG — 10 Mo max</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <button
                onClick={skipUpload}
                disabled={uploading}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition py-2 disabled:opacity-60"
              >
                <SkipForward className="h-4 w-4" />
                Passer cette étape
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span className={`text-xs font-mono uppercase tracking-wider ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}