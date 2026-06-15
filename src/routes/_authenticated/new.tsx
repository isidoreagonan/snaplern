import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Upload, FileText, Image as ImageIcon, FileImage, Loader2,
  Sparkles, Brain, Zap, CheckCircle2, ArrowLeft, ShieldCheck,
  Wand2, BookOpen, Layers, Camera,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeImage } from "@/lib/learning.functions";
import { AppShell } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Nouveau parcours — SnapLern" }] }),
  component: NewParcoursPage,
});

function NewParcoursPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const busy = uploading || analyzing;

  const handleFile = useCallback(async (file: File) => {
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Choisis une image (jpg, png, webp) ou un PDF");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Fichier trop lourd (100 Mo max)");
      return;
    }

    setUploading(true);
    setProgress(15);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Non connecté");

      const ext = file.name.split(".").pop() ?? (isPdf ? "pdf" : "jpg");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("learning-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setProgress(45);

      const { data: pub } = supabase.storage.from("learning-images").getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      const { data: session, error: insErr } = await supabase
        .from("learning_sessions")
        .insert({ user_id: userId, image_url: imageUrl, status: "analyzing", title: "Analyse en cours…" })
        .select()
        .single();
      if (insErr || !session) throw insErr ?? new Error("Erreur création");

      setUploading(false);
      setAnalyzing(true);
      setProgress(70);
      toast.info(isPdf ? "L'IA lit ton PDF en entier…" : "L'IA analyse ton document…");

      await analyzeImage({ data: { sessionId: session.id, imageUrl, fileType: isPdf ? "pdf" : "image" } });
      setProgress(100);
      toast.success("Parcours prêt !");
      navigate({ to: "/session/$id", params: { id: session.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  }, [navigate]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <AppShell>
      <div className="min-h-full flex flex-col">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">
          <Link to="/app" className="hover:text-[#ff7a6c] flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">Nouveau parcours</span>
        </div>

        {/* Header */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#fff5f3] text-[#ff7a6c] px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-bold mb-4">
              <Sparkles className="h-3 w-3" /> Étape 1 — Importer
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 leading-[1.05]">
              Crée un nouveau parcours
              <span className="text-[#ff7a6c]">.</span>
            </h1>
            <p className="text-slate-600 mt-3 max-w-xl text-base">
              Dépose un cours, un chapitre de manuel ou une photo de tableau.
              L'IA en extrait un résumé, des cartes mentales, des flashcards et un quiz adaptatif en quelques secondes.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Privé & chiffré</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2 text-xs">
              <Zap className="h-4 w-4 text-[#ff7a6c]" />
              <span className="font-semibold text-slate-700">~10 sec / doc</span>
            </div>
          </div>
        </div>

        {/* Main grid: dropzone + side panel */}
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 flex-1">
          {/* DROPZONE */}
          <motion.label
            htmlFor="np-file"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-[28px] border-2 border-dashed bg-white transition-all cursor-pointer group flex flex-col ${
              busy ? "border-[#ff7a6c] cursor-wait" :
              drag ? "border-[#ff7a6c] bg-[#fff5f3] scale-[1.005]" : "border-slate-200 hover:border-[#ff7a6c] hover:bg-[#fffaf9]"
            }`}
          >
            <input
              id="np-file"
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Decorative grid bg */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

            {busy ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative">
                <div className="relative w-24 h-24 mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="44" stroke="#fde9e5" strokeWidth="6" fill="none" />
                    <motion.circle
                      cx="50" cy="50" r="44" stroke="#ff7a6c" strokeWidth="6" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 44}
                      animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - progress / 100) }}
                      transition={{ duration: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-[#ff7a6c] animate-spin" />
                  </div>
                </div>
                <p className="font-display font-black text-2xl text-slate-900">
                  {uploading ? "Upload en cours…" : "L'IA digère ton contenu"}
                </p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  {uploading
                    ? "Sécurisation du fichier sur tes espaces privés."
                    : "Extraction du texte, génération du résumé, cartes mentales et quiz."}
                </p>
                <div className="mt-5 text-xs font-mono uppercase tracking-widest text-[#ff7a6c]">{progress}%</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-14 text-center relative">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative mb-6"
                >
                  <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] flex items-center justify-center shadow-2xl shadow-[#ff7a6c]/30">
                    <Upload className="h-10 w-10 text-white" strokeWidth={2.2} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#fde047] flex items-center justify-center shadow-lg">
                    <Sparkles className="h-3.5 w-3.5 text-slate-900" />
                  </div>
                </motion.div>

                <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900">
                  Glisse-dépose ton document
                </h2>
                <p className="text-slate-500 mt-2 text-sm">
                  ou <span className="text-[#ff7a6c] font-bold underline underline-offset-4 decoration-2">parcours tes fichiers</span> pour sélectionner
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  {[
                    { i: FileText, l: "PDF", note: "lu en entier" },
                    { i: FileImage, l: "DOCX", note: "bientôt" },
                    { i: ImageIcon, l: "Image", note: "jpg, png, webp" },
                    { i: Camera, l: "Photo", note: "tableau, cahier" },
                  ].map((b) => (
                    <div
                      key={b.l}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700"
                    >
                      <b.i className="h-4 w-4 text-[#ff7a6c]" />
                      <span className="text-xs font-bold">{b.l}</span>
                      <span className="text-[10px] font-mono text-slate-400">{b.note}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 100 Mo max</span>
                  <span className="hidden sm:flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Multi-pages</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Français & EN</span>
                </div>
              </div>
            )}
          </motion.label>

          {/* SIDE PANEL */}
          <div className="space-y-4">
            {/* What you'll get */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#fff5f3] flex items-center justify-center">
                  <Wand2 className="h-4 w-4 text-[#ff7a6c]" />
                </div>
                <h3 className="font-display font-black text-slate-900">Ce que l'IA va générer</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { i: BookOpen, l: "Résumé structuré", d: "Les points clés extraits chapitre par chapitre" },
                  { i: Brain, l: "Cartes mentales", d: "Visualise les liens entre les concepts" },
                  { i: Layers, l: "Flashcards", d: "Mémorise plus vite grâce à la répétition espacée" },
                  { i: Zap, l: "Quiz adaptatif", d: "Teste-toi sur ce que tu n'as pas encore maîtrisé" },
                ].map((f) => (
                  <li key={f.l} className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                      <f.i className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{f.l}</div>
                      <div className="text-xs text-slate-500 leading-snug">{f.d}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[24px] p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ff7a6c]/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] mb-2">Pro tip</div>
                <p className="font-display font-bold text-lg leading-snug">
                  Des photos nettes et bien cadrées donnent les meilleurs parcours.
                </p>
                <p className="text-white/60 text-xs mt-2">
                  Évite les reflets, garde le texte droit, regroupe tes pages dans un seul PDF pour un contexte maximal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA pinned action */}
        {!busy && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4">
            <p className="text-sm text-slate-600">
              Prêt à commencer ? Sélectionne ton premier document.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#ff7a6c] text-white px-6 py-3 rounded-full font-bold text-sm transition-colors shadow-lg"
            >
              <Upload className="h-4 w-4" /> Choisir un fichier
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}