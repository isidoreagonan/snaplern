import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  Brain,
  Layers,
  Flame,
  Target,
  Zap,
  Trophy,
  RotateCcw,
  ChevronRight,
  Lightbulb,
  Star,
  FileText,
  Dumbbell,
  Camera,
  Upload,
  Lock,
  Loader2,
  Send,
  Network,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { AudioPlayer } from "@/components/audio-player";
import { CameraCapture } from "@/components/camera-capture";
import { SignedImage, SignedPdfLink } from "@/components/signed-image";
import { PdfThumbnail } from "@/components/pdf-thumbnail";
import {
  generateSessionExercises,
  submitExerciseAttempt,
} from "@/lib/exercises.functions";
import { createMindmap, generateMindmap } from "@/lib/mindmaps.functions";
import { exportSessionPdf } from "@/lib/pdf-export";
import { useNavigate } from "@tanstack/react-router";

type Analysis = {
  title: string;
  subject: string;
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  lesson: { heading: string; content: string }[];
  quiz: { question: string; choices: string[]; answerIndex: number; explanation: string }[];
  flashcards: { question: string; answer: string }[];
};

type Session = {
  id: string;
  title: string;
  subject: string | null;
  image_url: string;
  analysis: Analysis | null;
  status: string;
};

export const Route = createFileRoute("/_authenticated/session/$id")({
  component: SessionPage,
});

function SessionPage() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<"lesson" | "quiz" | "cards" | "exos">("lesson");
  const navigate = useNavigate();
  const createMm = useServerFn(createMindmap);
  const genMm = useServerFn(generateMindmap);
  const [mmBusy, setMmBusy] = useState(false);

  const openMindmap = async () => {
    if (!session?.analysis) {
      toast.error("Attends la fin de l'analyse");
      return;
    }
    setMmBusy(true);
    try {
      const { id: mid } = await createMm({ data: { sessionId: session.id } });
      navigate({ to: "/mindmaps/$id", params: { id: mid } });
      genMm({ data: { mindmapId: mid } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : "Génération impossible"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setMmBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      const { data } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      setSession(data as Session | null);
    };
    fetchOnce();
    const interval = setInterval(() => {
      if (session?.status !== "ready") fetchOnce();
      else clearInterval(interval);
    }, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, session?.status]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6">
        <div className="bg-[#fdfbf3] rounded-[24px] sm:rounded-[28px] p-6 sm:p-12 text-center max-w-md">
          <Sparkles className="h-10 w-10 mx-auto mb-4 text-[#ff7a6c] animate-pulse" />
          <p className="font-display font-bold text-slate-900 text-lg">Chargement de ton parcours…</p>
        </div>
      </div>
    );
  }

  const a = session.analysis;
  const isPdf = /\.pdf($|\?)/i.test(session.image_url);

  return (
    <div className="min-h-screen bg-[#fdfbf3]">
      <div className="w-full">
        <div className="bg-[#fdfbf3] overflow-hidden text-slate-900 min-h-screen">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-2 px-4 sm:px-6 md:px-12 pt-5 sm:pt-7 pb-2">
            <Link to="/app" className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#ff7a6c] transition shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Mes parcours</span>
              <span className="xs:hidden sm:hidden">Retour</span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={openMindmap}
                disabled={mmBusy || !session?.analysis}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#7dd3fc] to-[#c4b5fd] text-slate-900 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 hover:scale-[1.03] transition-transform"
                title="Mindmap"
              >
                {mmBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Mindmap</span>
              </button>
              <button
                onClick={async () => {
                  if (!session?.analysis) { toast.error("Attends la fin de l'analyse"); return; }
                  try {
                    toast.loading("Génération du PDF…", { id: "pdf-export" });
                    await exportSessionPdf(session.analysis, { title: session.title, subject: session.subject ?? undefined });
                    toast.success("PDF téléchargé", { id: "pdf-export" });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Export impossible", { id: "pdf-export" });
                  }
                }}
                disabled={!session?.analysis}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-[#ff7a6c] text-white px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 transition-colors"
                title="Télécharger en PDF"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <div className="hidden md:flex items-center gap-1.5 bg-[#fef8e7] px-3 py-1.5 rounded-full">
                <Flame className="h-3.5 w-3.5 text-[#ff7a6c]" />
                <span className="text-xs font-bold">+25 XP</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 bg-[#e8f5d8] px-3 py-1.5 rounded-full">
                <Trophy className="h-3.5 w-3.5 text-[#5a8a3a]" />
                <span className="text-xs font-bold text-[#3a5a20]">Nouveau parcours</span>
              </div>
            </div>
          </header>

          {/* Hero */}
          <div className="px-4 sm:px-8 md:px-12 pt-4 sm:pt-6 pb-6 sm:pb-10 grid md:grid-cols-[260px_1fr] gap-5 sm:gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative mx-auto md:mx-0 w-40 sm:w-52 md:w-full"
            >
              <div className="aspect-square rounded-[24px] overflow-hidden bg-white border-4 border-white shadow-2xl">
                {isPdf ? (
                  <SignedPdfLink src={session.image_url} className="block w-full h-full group relative">
                    <PdfThumbnail src={session.image_url} className="w-full h-full" alt={session.title} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 group-hover:opacity-100 transition">
                      <div className="text-[10px] font-mono uppercase tracking-wider font-bold">Ouvrir le PDF</div>
                    </div>
                  </SignedPdfLink>
                ) : (
                  <SignedImage src={session.image_url} alt={session.title} className="w-full h-full object-cover" />
                )}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-3 -right-3 bg-[#ff7a6c] text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono shadow-lg flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> {isPdf ? "PDF analysé par IA" : "Analysée par IA"}
              </motion.div>
            </motion.div>

            <div>
              {a?.subject && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-block text-[10px] px-2.5 py-1 bg-[#ff7a6c] text-white rounded-full font-mono uppercase tracking-wider font-bold"
                >
                  / {a.subject}
                </motion.span>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-display font-black tracking-tight mt-3 leading-[1.05]"
              >
                {session.title}
              </motion.h1>
              {a ? (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-600 leading-relaxed mt-4 text-base md:text-lg max-w-2xl"
                >
                  {a.summary}
                </motion.p>
              ) : (
                <div className="mt-6 flex items-center gap-3 bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-[#fff5f3] flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-[#ff7a6c] animate-pulse" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">L'IA décompose ton image…</p>
                    <p className="text-xs text-slate-500 font-mono">~10 secondes</p>
                  </div>
                </div>
              )}

              {a && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-3 gap-3 mt-6 max-w-lg"
                >
                  {[
                    { l: "Concepts", v: a.keyConcepts.length, i: Lightbulb, c: "from-[#ff7a6c] to-[#ff9a3c]" },
                    { l: "Quiz", v: a.quiz.length, i: Target, c: "from-[#a3d97a] to-[#7dd3fc]" },
                    { l: "Cartes", v: a.flashcards.length, i: Layers, c: "from-[#c4b5fd] to-[#f0abfc]" },
                  ].map((s) => (
                  <div key={s.l} className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-100 flex items-center gap-2 sm:gap-2.5">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${s.c} flex items-center justify-center shadow shrink-0`}>
                        <s.i className="h-4 w-4 text-white" />
                      </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl font-display font-black leading-none">{s.v}</div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mt-0.5 truncate">{s.l}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {a && (
            <>
              {/* Tabs */}
              <div className="px-4 sm:px-8 md:px-12">
                <div className="flex gap-1.5 sm:gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
                  {([
                    ["lesson", "Leçon", BookOpen],
                    ["quiz", "Quiz", Target],
                    ["cards", "Flashcards", Layers],
                    ["exos", "Exercices", Dumbbell],
                  ] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`relative min-w-[90px] sm:min-w-0 sm:flex-none justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                        tab === key ? "text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab === key && (
                        <motion.div
                          layoutId="active-tab"
                          className="absolute inset-0 bg-slate-900 rounded-xl"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 sm:px-8 md:px-12 py-6 sm:py-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {tab === "lesson" && <LessonView analysis={a} />}
                    {tab === "quiz" && <QuizView analysis={a} sessionId={session.id} />}
                    {tab === "cards" && <CardsView analysis={a} />}
                    {tab === "exos" && <ExercisesView sessionId={session.id} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Exercise = {
  id: string;
  level: number;
  title: string;
  statement: string;
  hints: unknown;
};
type Attempt = {
  id: string;
  exercise_id: string;
  score: number;
  is_correct: boolean;
  feedback: string;
  submission_type: string;
  submission_image_url: string | null;
  submission_text: string | null;
  created_at: string;
};

function ExercisesView({ sessionId }: { sessionId: string }) {
  const generate = useServerFn(generateSessionExercises);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const refresh = async () => {
    const [{ data: exs }, { data: u }] = await Promise.all([
      supabase
        .from("session_exercises")
        .select("id,level,title,statement,hints")
        .eq("session_id", sessionId)
        .order("level"),
      supabase.auth.getUser(),
    ]);
    setExercises((exs ?? []) as Exercise[]);
    if (exs && u.user) {
      const ids = exs.map((e) => e.id);
      const { data: atts } = await supabase
        .from("exercise_attempts")
        .select("*")
        .in("exercise_id", ids)
        .order("created_at", { ascending: false });
      const best: Record<string, Attempt> = {};
      (atts ?? []).forEach((a) => {
        const cur = best[a.exercise_id];
        if (!cur || (a.is_correct && !cur.is_correct) || a.score > cur.score) {
          best[a.exercise_id] = a as Attempt;
        }
      });
      setAttempts(best);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const runGenerate = async () => {
    setGenerating(true);
    try {
      await generate({ data: { sessionId } });
      await refresh();
      toast.success("Exercices prêts !");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-500">Chargement…</div>;
  }

  if (exercises.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-8 md:p-12 border border-slate-100 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff7a6c] to-[#ff9a3c] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl font-display font-black">Passe à l'action</h3>
        <p className="text-slate-600 mt-2 max-w-md mx-auto">
          L'IA va te créer 5 exercices progressifs basés sur ton cours. Tu réponds par texte ou par photo de ta feuille. Chaque exercice validé débloque le suivant.
        </p>
        <button
          onClick={runGenerate}
          disabled={generating}
          className="mt-6 inline-flex items-center gap-2 bg-[#ff7a6c] hover:bg-[#ff6b5a] text-white font-bold px-6 py-3 rounded-2xl disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Générer mes exercices
        </button>
      </div>
    );
  }

  const unlockedUpTo = (() => {
    let last = 0;
    for (let i = 0; i < exercises.length; i++) {
      if (attempts[exercises[i].id]?.is_correct) last = i + 1;
      else break;
    }
    return Math.min(last + 1, exercises.length);
  })();

  const completed = exercises.filter((e) => attempts[e.id]?.is_correct).length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Progression</div>
          <div className="text-sm font-bold mt-0.5">
            Niveau {Math.min(completed + 1, exercises.length)} / {exercises.length}
          </div>
          <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#5a8a3a] to-[#a3d97a]"
              animate={{ width: `${(completed / exercises.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl px-3 py-2">
          <Trophy className="h-4 w-4 text-[#fde047] inline mr-1" />
          <span className="font-display font-black">{completed * 20}</span>
          <span className="text-xs opacity-60"> XP</span>
        </div>
      </div>

      {exercises.map((ex, i) => {
        const att = attempts[ex.id];
        const unlocked = i < unlockedUpTo;
        return (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            attempt={att}
            unlocked={unlocked}
            onSubmitted={refresh}
          />
        );
      })}
    </div>
  );
}

function ExerciseCard({
  exercise,
  attempt,
  unlocked,
  onSubmitted,
}: {
  exercise: Exercise;
  attempt?: Attempt;
  unlocked: boolean;
  onSubmitted: () => void | Promise<void>;
}) {
  const submit = useServerFn(submitExerciseAttempt);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const isDone = !!attempt?.is_correct;

  const sendText = async () => {
    if (!text.trim()) {
      toast.error("Écris ta réponse");
      return;
    }
    setBusy(true);
    try {
      const r = await submit({
        data: { exerciseId: exercise.id, submissionType: "text", text: text.trim() },
      });
      toast[r.is_correct ? "success" : "info"](`Score : ${r.score}/100`);
      setText("");
      await onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Correction impossible");
    } finally {
      setBusy(false);
    }
  };

  const uploadAndSubmit = async (blob: Blob) => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Non connecté");
      const path = `${uid}/attempts/${exercise.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("learning-images").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("learning-images").getPublicUrl(path);
      const r = await submit({
        data: { exerciseId: exercise.id, submissionType: "image", imageUrl: pub.publicUrl },
      });
      toast[r.is_correct ? "success" : "info"](`Score : ${r.score}/100`);
      await onSubmitted();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
      setCameraOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-[24px] border-2 overflow-hidden ${
        isDone ? "border-[#a3d97a]" : unlocked ? "border-slate-100" : "border-slate-100 opacity-60"
      }`}
    >
      <button
        type="button"
        onClick={() => unlocked && setOpen((o) => !o)}
        disabled={!unlocked}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
            isDone
              ? "bg-[#5a8a3a] text-white"
              : unlocked
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-400"
          }`}
        >
          {!unlocked ? <Lock className="h-4 w-4" /> : isDone ? <CheckCircle2 className="h-5 w-5" /> : `N${exercise.level}`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Niveau {exercise.level}
          </div>
          <div className="font-display font-bold text-slate-900 truncate">{exercise.title}</div>
        </div>
        {attempt && (
          <div className={`text-xs font-bold px-2 py-1 rounded-full ${isDone ? "bg-[#e8f5d8] text-[#3a5a20]" : "bg-[#fff5f3] text-[#ff7a6c]"}`}>
            {attempt.score}/100
          </div>
        )}
        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {open && unlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-5 space-y-4">
              <div className="bg-[#fff5f3] rounded-2xl p-4 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {exercise.statement}
              </div>

              {attempt && (
                <div
                  className={`rounded-2xl p-4 border ${
                    attempt.is_correct ? "bg-[#e8f5d8] border-[#a3d97a]" : "bg-[#fff5f3] border-[#ffd5cc]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {attempt.is_correct ? (
                      <CheckCircle2 className="h-4 w-4 text-[#5a8a3a]" />
                    ) : (
                      <Lightbulb className="h-4 w-4 text-[#ff7a6c]" />
                    )}
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                      / feedback IA · {attempt.score}/100
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{attempt.feedback}</p>
                </div>
              )}

              {!isDone && (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="Tape ta réponse ici, ou envoie une photo de ta feuille…"
                    className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm focus:outline-none focus:border-[#ff7a6c]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={sendText}
                      disabled={busy}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#ff7a6c] text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Envoyer
                    </button>
                    <button
                      onClick={() => setCameraOpen(true)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-[#ff7a6c] text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm"
                    >
                      <Camera className="h-4 w-4" /> Photo
                    </button>
                    <label className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-[#ff7a6c] text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm cursor-pointer">
                      <Upload className="h-4 w-4" /> Importer
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAndSubmit(f);
                        }}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={uploadAndSubmit} />
    </motion.div>
  );
}

function LessonView({ analysis }: { analysis: Analysis }) {
  const fullText = [
    analysis.title,
    analysis.summary,
    ...analysis.keyConcepts.map((c) => `${c.term}. ${c.definition}`),
    ...analysis.lesson.map((s) => `${s.heading}. ${s.content}`),
  ]
    .filter(Boolean)
    .join(". ");
  return (
    <div className="space-y-14">
      <AudioPlayer text={fullText} title={analysis.title || "cours"} />
      {/* Key concepts — bold highlighted */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#ff7a6c] flex items-center justify-center shadow">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-2xl font-display font-black tracking-tight">Concepts à graver</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100 ml-auto">
            {analysis.keyConcepts.length} clés
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {analysis.keyConcepts.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group relative bg-white rounded-[20px] p-5 border border-slate-100 overflow-hidden hover:border-[#ff7a6c] transition-colors"
            >
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#ff7a6c] via-[#ff9a3c] to-[#fde047] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start gap-3">
                <div className="text-[10px] font-mono font-bold text-[#ff7a6c] bg-[#fff5f3] rounded-md px-1.5 py-0.5 mt-1">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="font-display font-black text-lg text-slate-900 leading-tight">{c.term}</div>
                  <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{c.definition}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Lesson sections — story-style with progress rail */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-2xl font-display font-black tracking-tight">La leçon, étape par étape</h2>
        </div>

        <div className="relative">
          {/* Vertical rail */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#ff7a6c] via-[#ff9a3c] to-[#fde047] rounded-full opacity-30" />

          <div className="space-y-8">
            {analysis.lesson.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-14"
              >
                <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-white border-2 border-[#ff7a6c] flex items-center justify-center font-mono text-xs font-black text-[#ff7a6c] shadow-sm">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="bg-white rounded-[20px] p-6 border border-slate-100 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 leading-tight">
                    {s.heading}
                  </h3>
                  <p className="text-slate-600 leading-relaxed mt-3 text-[15px]">{s.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-8 text-center text-white relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ff7a6c]/30 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-[#a3d97a]/20 blur-3xl" />
          <div className="relative">
            <Zap className="h-8 w-8 text-[#fde047] mx-auto mb-3" />
            <h3 className="text-2xl font-display font-black">Tu as lu. Maintenant ancre.</h3>
            <p className="text-slate-300 mt-2 text-sm max-w-md mx-auto">
              Lire = 10% de rétention. Quizzer + flashcards = 80%. Passe à l'action.
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function QuizView({ analysis, sessionId }: { analysis: Analysis; sessionId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(
    () => analysis.quiz.reduce((s, q, i) => (answers[i] === q.answerIndex ? s + 1 : s), 0),
    [answers, analysis.quiz],
  );
  const progress = (Object.keys(answers).length / analysis.quiz.length) * 100;

  const submit = async () => {
    setSubmitted(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("quiz_attempts").insert({
        user_id: u.user.id,
        session_id: sessionId,
        score,
        total: analysis.quiz.length,
        answers,
      });
    }
    toast.success(`Score : ${score}/${analysis.quiz.length}`);
  };

  return (
    <div className="space-y-6">
      {/* Sticky progress */}
      <div className="sticky top-3 z-10 bg-[#fdfbf3]/95 backdrop-blur rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Progression</span>
            <span className="text-sm font-bold text-slate-900">
              {Object.keys(answers).length}/{analysis.quiz.length}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#ff7a6c] to-[#ff9a3c]"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        </div>
        {submitted && (
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-xl">
            <Trophy className="h-4 w-4 text-[#fde047]" />
            <span className="font-display font-black text-lg leading-none">{score}</span>
            <span className="text-xs opacity-60">/{analysis.quiz.length}</span>
          </div>
        )}
      </div>

      {analysis.quiz.map((q, i) => {
        const answered = answers[i] !== undefined;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-slate-100 rounded-[24px] p-6 md:p-7"
          >
            <div className="flex items-start gap-3 mb-5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black shadow-sm shrink-0 ${
                submitted
                  ? answers[i] === q.answerIndex
                    ? "bg-[#a3d97a] text-white"
                    : "bg-[#ff7a6c] text-white"
                  : answered
                    ? "bg-slate-900 text-white"
                    : "bg-white border-2 border-slate-200 text-slate-500"
              }`}>
                Q{i + 1}
              </div>
              <div className="font-display font-bold text-lg md:text-xl text-slate-900 leading-snug flex-1">
                {q.question}
              </div>
            </div>
            <div className="space-y-2">
              {q.choices.map((c, ci) => {
                const picked = answers[i] === ci;
                const correct = submitted && ci === q.answerIndex;
                const wrong = submitted && picked && ci !== q.answerIndex;
                return (
                  <motion.button
                    key={ci}
                    whileHover={!submitted ? { x: 4 } : undefined}
                    disabled={submitted}
                    onClick={() => setAnswers({ ...answers, [i]: ci })}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-[15px] font-medium transition-all flex items-center justify-between gap-3 ${
                      correct
                        ? "border-[#5a8a3a] bg-[#e8f5d8] text-slate-900"
                        : wrong
                          ? "border-[#ff7a6c] bg-[#fff5f3] text-slate-900"
                          : picked
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-100 bg-white hover:border-[#ff7a6c] text-slate-700"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                        correct ? "bg-[#5a8a3a] text-white"
                          : wrong ? "bg-[#ff7a6c] text-white"
                          : picked ? "bg-white text-slate-900"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {String.fromCharCode(65 + ci)}
                      </span>
                      {c}
                    </span>
                    {correct && <CheckCircle2 className="h-5 w-5 text-[#5a8a3a] shrink-0" />}
                    {wrong && <XCircle className="h-5 w-5 text-[#ff7a6c] shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 pt-4 border-t border-slate-100 flex gap-3"
                >
                  <Lightbulb className="h-4 w-4 text-[#ff9a3c] shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {!submitted ? (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length !== analysis.quiz.length}
          className="w-full bg-[#ff7a6c] hover:bg-[#ff6b5a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-black text-lg py-5 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#ff7a6c]/20 disabled:shadow-none"
        >
          <Target className="h-5 w-5" />
          Valider mes réponses
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-8 text-center text-white relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ff7a6c]/30 blur-3xl" />
          <div className="relative">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < Math.round((score / analysis.quiz.length) * 5) ? "fill-[#fde047] text-[#fde047]" : "text-slate-600"}`} />
              ))}
            </div>
            <div className="text-6xl font-display font-black">
              {score}<span className="text-3xl text-slate-400">/{analysis.quiz.length}</span>
            </div>
            <p className="text-slate-300 mt-2">
              {score === analysis.quiz.length ? "Parfait. C'est ancré." :
               score >= analysis.quiz.length * 0.7 ? "Solide. Encore un tour de flashcards et c'est gagné." :
               "Pas grave. Les flashcards vont tout fixer."}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CardsView({ analysis }: { analysis: Analysis }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const card = analysis.flashcards[idx];
  const total = analysis.flashcards.length;
  const progress = ((idx + 1) / total) * 100;

  const next = (mark?: "know" | "review") => {
    if (mark === "know") setKnown(new Set([...known, idx]));
    if (idx < total - 1) {
      setIdx(idx + 1);
      setFlipped(false);
    }
  };
  const prev = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setFlipped(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
          Carte {idx + 1} / {total}
        </span>
        <span className="text-xs font-mono font-bold text-[#5a8a3a] bg-[#e8f5d8] px-2 py-0.5 rounded-full">
          {known.size} maîtrisée{known.size > 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
        <motion.div
          className="h-full bg-gradient-to-r from-[#ff7a6c] to-[#ff9a3c]"
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Flip card */}
      <div style={{ perspective: 1500 }} className="mb-6">
        <motion.div
          onClick={() => setFlipped(!flipped)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 80, damping: 14 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative min-h-[340px] cursor-pointer"
        >
          {/* Front */}
          <div
            style={{ backfaceVisibility: "hidden" }}
            className="absolute inset-0 bg-white rounded-[24px] sm:rounded-[28px] border border-slate-100 p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-xl"
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff7a6c] font-bold mb-6">
              / Question
            </span>
            <p className="text-2xl md:text-3xl font-display font-black text-slate-900 leading-tight">
              {card.question}
            </p>
            <div className="mt-auto pt-8 flex items-center gap-2 text-xs font-mono text-slate-400">
              <RotateCcw className="h-3 w-3" />
              Clique pour retourner
            </div>
          </div>
          {/* Back */}
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 flex flex-col items-center justify-center text-center text-white shadow-xl overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#ff7a6c]/30 blur-3xl" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#fde047] font-bold mb-6 relative">
              / Réponse
            </span>
            <p className="text-xl md:text-2xl font-display font-bold leading-relaxed relative">
              {card.answer}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      {!flipped ? (
        <button
          onClick={() => setFlipped(true)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-display font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <Brain className="h-4 w-4" /> Révéler la réponse
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => next("review")}
            className="bg-white border-2 border-[#ff7a6c] text-[#ff7a6c] hover:bg-[#fff5f3] font-display font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> À revoir
          </button>
          <button
            onClick={() => next("know")}
            className="bg-[#5a8a3a] hover:bg-[#4a7a2a] text-white font-display font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#5a8a3a]/20"
          >
            <CheckCircle2 className="h-4 w-4" /> Je sais
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mt-6 text-xs font-mono text-slate-500">
        <button onClick={prev} disabled={idx === 0} className="disabled:opacity-30 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Précédent
        </button>
        {idx === total - 1 && known.size === total && (
          <span className="text-[#5a8a3a] font-bold flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Deck maîtrisé
          </span>
        )}
        <button onClick={() => next()} disabled={idx === total - 1} className="disabled:opacity-30 hover:text-slate-900 flex items-center gap-1">
          Suivant <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}