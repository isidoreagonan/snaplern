import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload, Image as ImageIcon, Loader2, BookOpen, Sparkles,
  Flame, Trophy, FileText, Bell,
  Search, Target, Zap, ArrowRight, ArrowUpRight, Calendar,
  Clock, Award, ChevronRight, Mic, Camera, Link as LinkIcon, Wand2,
  GraduationCap, BookMarked, CheckCircle2, Activity, Rocket, Brain,
} from "lucide-react";
import { motion } from "motion/react";
import { analyzeImage } from "@/lib/learning.functions";
import { AppShell } from "@/components/app-sidebar";
import { SignedImage } from "@/components/signed-image";

type Session = {
  id: string;
  title: string;
  subject: string | null;
  image_url: string;
  status: string;
  created_at: string;
};

type QuizAttempt = { score: number; total: number; created_at: string; session_id: string };
type ExamSession = { score: number; total: number; completed_at: string | null; subjects: unknown };
type Flashcard = { last_reviewed_at: string | null; subject: string | null };

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Mon espace — SnapLern" }] }),
  component: AppDashboard,
});

function AppDashboard() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      const name = meta?.full_name || meta?.name || data.user?.email?.split("@")[0] || "Explorateur";
      setUserName(name);
    });
  }, []);

  const load = async () => {
    const [s, q, e, f] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("id,title,subject,image_url,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("quiz_attempts")
        .select("score,total,created_at,session_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("exam_sessions")
        .select("score,total,completed_at,subjects")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(200),
      supabase
        .from("flashcards")
        .select("last_reviewed_at,subject")
        .limit(1000),
    ]);
    setSessions(s.data ?? []);
    setQuizAttempts((q.data as QuizAttempt[]) ?? []);
    setExamSessions((e.data as ExamSession[]) ?? []);
    setFlashcards((f.data as Flashcard[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  // Process pending image saved from landing page (upload-without-signup flow)
  useEffect(() => {
    const dataUrl = sessionStorage.getItem("lumen_pending_image");
    const name = sessionStorage.getItem("lumen_pending_name") ?? "upload.jpg";
    if (!dataUrl) return;
    sessionStorage.removeItem("lumen_pending_image");
    sessionStorage.removeItem("lumen_pending_name");
    (async () => {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], name, { type: blob.type || "image/jpeg" });
        await handleFile(file);
      } catch {
        toast.error("Impossible de récupérer l'image en attente");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File) => {
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Choisis une image (jpg, png, webp) ou un PDF");
      return;
    }
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Fichier trop lourd (100 Mo max)");
      return;
    }

    setUploading(true);
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
      toast.info(isPdf ? "L'IA lit ton PDF en entier…" : "L'IA analyse ton image…");

      await analyzeImage({ data: { sessionId: session.id, imageUrl, fileType: isPdf ? "pdf" : "image" } });
      toast.success("Parcours prêt !");
      navigate({ to: "/session/$id", params: { id: session.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const busy = uploading || analyzing;

  // --- derived data ---
  const hour = now.getHours();
  const greeting = hour < 6 ? "Bonne nuit" : hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const firstName = userName.split(" ")[0] || "toi";
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // subject distribution
  const subjectMap = new Map<string, number>();
  sessions.forEach((s) => {
    const k = (s.subject || "Autres").trim() || "Autres";
    subjectMap.set(k, (subjectMap.get(k) ?? 0) + 1);
  });
  const subjects = Array.from(subjectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const subjectColors = ["#ff7a6c", "#7dd3fc", "#c4b5fd", "#a3d97a", "#fde047"];

  // 30-day activity heatmap based on created_at
  const days: { d: Date; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ d, count: 0 });
  }
  sessions.forEach((s) => {
    const ts = new Date(s.created_at);
    ts.setHours(0, 0, 0, 0);
    const hit = days.find((x) => x.d.getTime() === ts.getTime());
    if (hit) hit.count += 1;
  });
  const heatMax = Math.max(1, ...days.map((d) => d.count));

  // --- REAL stats ---
  // Active days set (sessions + quiz + flashcards reviewed)
  const activeDaySet = new Set<string>();
  const dayKey = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };
  sessions.forEach((s) => { const k = dayKey(s.created_at); if (k) activeDaySet.add(k); });
  quizAttempts.forEach((q) => { const k = dayKey(q.created_at); if (k) activeDaySet.add(k); });
  flashcards.forEach((f) => { const k = dayKey(f.last_reviewed_at); if (k) activeDaySet.add(k); });

  // Streak: consecutive days ending today (or yesterday)
  let streak = 0;
  {
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    // allow streak if today not active but yesterday is
    if (!activeDaySet.has(cursor.toISOString())) cursor.setDate(cursor.getDate() - 1);
    while (activeDaySet.has(cursor.toISOString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Parcours this week (ISO week starts Monday)
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const dow = (weekStart.getDay() + 6) % 7; // 0 = Monday
  weekStart.setDate(weekStart.getDate() - dow);
  const sessionsThisWeek = sessions.filter((s) => new Date(s.created_at) >= weekStart).length;

  // Mastery: average score across quizzes + exams
  const allScores = [
    ...quizAttempts.filter((q) => q.total > 0).map((q) => q.score / q.total),
    ...examSessions.filter((e) => e.total > 0).map((e) => e.score / e.total),
  ];
  const mastery = allScores.length
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100)
    : 0;

  // Mastery delta this month vs previous
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inRange = (iso: string, from: Date, to: Date) => {
    const d = new Date(iso); return d >= from && d < to;
  };
  const scoresIn = (from: Date, to: Date) => {
    const arr = [
      ...quizAttempts.filter((q) => q.total > 0 && inRange(q.created_at, from, to)).map((q) => q.score / q.total),
      ...examSessions.filter((e) => e.completed_at && e.total > 0 && inRange(e.completed_at, from, to)).map((e) => e.score / e.total),
    ];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  };
  const mThis = scoresIn(monthStart, new Date(now.getTime() + 1));
  const mPrev = scoresIn(prevMonthStart, monthStart);
  const masteryDelta = mThis !== null && mPrev !== null ? Math.round((mThis - mPrev) * 100) : null;

  // XP: 50 per session + score for each quiz/exam attempt + 2 per flashcard reviewed
  const xp =
    sessions.length * 50 +
    quizAttempts.reduce((a, q) => a + (q.score || 0) * 10, 0) +
    examSessions.reduce((a, e) => a + (e.score || 0) * 15, 0) +
    flashcards.filter((f) => f.last_reviewed_at).length * 2;
  const level = Math.max(1, Math.floor(xp / 200) + 1);
  const xpInLevel = xp % 200;
  const objectivePct = Math.round((xpInLevel / 200) * 100);

  // ISO week number
  const isoWeek = (() => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  })();

  // Badges earned (simple, real rules)
  const badgeRules = [
    { i: Flame, c: "from-[#ff7a6c] to-[#ff9a3c]", on: streak >= 3 },
    { i: Zap, c: "from-[#fde047] to-[#ff9a3c]", on: quizAttempts.length >= 1 },
    { i: BookMarked, c: "from-[#7dd3fc] to-[#c4b5fd]", on: sessions.length >= 1 },
    { i: Trophy, c: "from-[#fde047] to-[#ff7a6c]", on: mastery >= 80 },
    { i: Brain, c: "from-[#c4b5fd] to-[#7dd3fc]", on: flashcards.length >= 10 },
    { i: Rocket, c: "from-[#ff7a6c] to-[#fde047]", on: sessions.length >= 10 },
    { i: GraduationCap, c: "from-[#a3d97a] to-[#7dd3fc]", on: examSessions.length >= 1 },
    { i: Target, c: "from-[#ff7a6c] to-[#c4b5fd]", on: streak >= 7 },
  ];
  const offClass = "from-slate-200 to-slate-300";
  const badges = badgeRules.map((b) => ({ ...b, c: b.on ? b.c : offClass }));
  const badgesEarned = badges.filter((b) => b.on).length;

  // Subject mastery: per-subject avg quiz/exam score, fallback to doc-count heuristic
  const subjectScoreMap = new Map<string, { sum: number; n: number }>();
  const sessionSubject = new Map<string, string>();
  sessions.forEach((s) => sessionSubject.set(s.id, (s.subject || "Autres").trim() || "Autres"));
  quizAttempts.forEach((q) => {
    if (q.total <= 0) return;
    const subj = sessionSubject.get(q.session_id);
    if (!subj) return;
    const cur = subjectScoreMap.get(subj) ?? { sum: 0, n: 0 };
    cur.sum += q.score / q.total;
    cur.n += 1;
    subjectScoreMap.set(subj, cur);
  });

  // Daily mission progress (real)
  const todayKey = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString(); })();
  const quizDoneToday = quizAttempts.some((q) => dayKey(q.created_at) === todayKey);
  const cardsToday = flashcards.filter((f) => dayKey(f.last_reviewed_at) === todayKey).length;
  const cardsDone = cardsToday >= 10;
  const streakKept = activeDaySet.has(todayKey);
  const missions = [
    { l: "Quiz terminé", done: quizDoneToday },
    { l: `${Math.min(cardsToday,10)}/10 cartes révisées`, done: cardsDone },
    { l: "Streak maintenu", done: streakKept },
  ];
  const missionsDone = missions.filter((m) => m.done).length;
  const missionsPct = Math.round((missionsDone / missions.length) * 100);

  return (
    <AppShell>
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-8">
        <div className="flex-1 relative min-w-0 max-w-md">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Cherche un cours…"
            className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-transparent sm:bg-white rounded-none sm:rounded-full text-sm border-0 border-b sm:border border-slate-200 focus:border-[#ff7a6c] outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button aria-label="Notifications" className="hidden sm:inline-flex p-2.5 rounded-full bg-white border border-slate-200 hover:border-slate-300">
            <Bell className="h-4 w-4 text-slate-600" />
          </button>
            <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-full">
              <Flame className="h-4 w-4 text-[#ff7a6c]" />
              <span className="text-sm font-bold">{streak}</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">jour{streak > 1 ? "s" : ""}</span>
            </div>
          <Link
            to="/profile"
            aria-label="Mon profil"
            className="flex items-center gap-2 bg-white border border-slate-200 pl-1 pr-1 sm:pr-3 py-1 rounded-full hover:border-[#ff7a6c] transition"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff7a6c] to-[#ff9a3c] text-white flex items-center justify-center text-xs font-black">
              {firstName[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">{firstName}</span>
          </Link>
        </div>
      </header>

            {/* HERO greeting — flat on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-[#ff8a7a] via-[#ff7a6c] to-[#ff6b5a] p-5 sm:p-8 md:p-10 text-white mb-5 sm:mb-6"
            >
              <motion.div
                className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/15 blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-[#fde047]/30 blur-3xl"
                animate={{ scale: [1.1, 1, 1.1] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <div className="relative grid md:grid-cols-[1fr_auto] gap-5 sm:gap-6 items-end">
                <div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-white/80 mb-2 sm:mb-3">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {dateLabel}
                  </div>
                  <h1 className="text-[26px] sm:text-3xl md:text-5xl font-black leading-tight">
                    {greeting}, {firstName} <span className="inline-block animate-pulse">✨</span>
                  </h1>
                  <p className="text-sm sm:text-base text-white/80 mt-2 max-w-lg">
                    Tu as <span className="font-bold text-white">{sessions.length} parcours</span> actifs. Ton cerveau est prêt pour 25 min d'apprentissage profond.
                  </p>
                  <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 bg-white text-slate-900 px-4 sm:px-5 py-2.5 rounded-full font-bold text-sm hover:scale-[1.03] transition-transform shadow-lg"
                    >
                      <Upload className="h-4 w-4" /> Importer un document
                    </button>
                    <button className="inline-flex flex-1 sm:flex-none justify-center items-center gap-2 bg-white/15 backdrop-blur text-white px-4 sm:px-5 py-2.5 rounded-full font-bold text-sm hover:bg-white/25 transition border border-white/20">
                      <Wand2 className="h-4 w-4" /> <span className="sm:inline">IA</span>
                    </button>
                  </div>
                </div>

                {/* Live metric ring */}
                <div className="hidden md:flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                      <motion.circle
                        cx="50" cy="50" r="42"
                        stroke="white" strokeWidth="8" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - objectivePct / 100) }}
                        transition={{ duration: 1.4, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black">{objectivePct}%</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-white/70">niveau {level}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/70 mt-2">Semaine {isoWeek}</div>
                </div>
              </div>
            </motion.div>

            {/* Stats row — flat list on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 sm:mb-6">
              {[
                {
                  l: "Parcours",
                  v: String(sessions.length),
                  sub: sessionsThisWeek > 0 ? `+${sessionsThisWeek} cette sem.` : "aucun cette sem.",
                  c: "from-[#ff7a6c] to-[#ff9a3c]",
                  i: BookOpen,
                },
                {
                  l: "Streak",
                  v: `${streak}j`,
                  sub: streak > 0 ? "en cours" : "démarre aujourd'hui",
                  c: "from-[#a3d97a] to-[#7dd3fc]",
                  i: Flame,
                },
                {
                  l: "Maîtrise",
                  v: allScores.length ? `${mastery}%` : "—",
                  sub: masteryDelta !== null
                    ? `${masteryDelta >= 0 ? "+" : ""}${masteryDelta}% ce mois`
                    : allScores.length ? "premier mois" : "fais un quiz",
                  c: "from-[#c4b5fd] to-[#f0abfc]",
                  i: Trophy,
                },
                {
                  l: "XP total",
                  v: xp.toLocaleString("fr-FR"),
                  sub: `niveau ${level}`,
                  c: "from-[#fde047] to-[#ff9a3c]",
                  i: Sparkles,
                },
              ].map((s, idx) => (
                <motion.div
                  key={s.l}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-100 hover:border-slate-300 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${s.c} flex items-center justify-center shadow`}>
                      <s.i className="h-4 w-4 text-white" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-black text-slate-900 font-display">{s.v}</div>
                  <div className="flex items-center justify-between mt-0.5 gap-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{s.l}</span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">{s.sub}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick capture bar — flat on mobile */}
            <label
              htmlFor="file-input"
              className={`relative block border-2 border-dashed rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 md:p-8 cursor-pointer transition-all mb-5 sm:mb-6 ${
                busy ? "border-[#ff7a6c]/60 bg-[#fff5f3] cursor-wait" : "border-slate-200 bg-white hover:border-[#ff7a6c] hover:bg-[#fff5f3]"
              }`}
            >
              <input id="file-input" ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" disabled={busy}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {busy ? (
                <div className="text-center py-4">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 text-[#ff7a6c] animate-spin" />
                  <p className="font-display font-bold text-lg">{uploading ? "Upload en cours…" : "L'IA digère ton contenu…"}</p>
                  <p className="text-sm text-slate-500 mt-1">Cours, quiz et flashcards générés en ~10 sec</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] flex items-center justify-center shadow-lg">
                        <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-black text-base sm:text-lg leading-tight">Capture instantanée</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-2">Image · PDF · Photo · Schéma · Formule</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 -mx-1 px-1 overflow-x-auto sm:overflow-visible scrollbar-none">
                    {[
                      { i: ImageIcon, l: "Image" },
                      { i: FileText, l: "PDF" },
                      { i: Camera, l: "Photo" },
                      { i: LinkIcon, l: "Lien" },
                      { i: Mic, l: "Audio" },
                    ].map((b) => (
                      <button
                        key={b.l}
                        type="button"
                        className="shrink-0 flex flex-col items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-50 hover:bg-[#fff5f3] hover:text-[#ff7a6c] transition text-slate-600"
                      >
                        <b.i className="h-4 w-4" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">{b.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </label>

            {/* TWO COLUMN GRID */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <div className="space-y-4">
                {/* Recent parcours */}
                <section className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div>
                      <h2 className="text-lg sm:text-xl font-display font-black">Mes parcours</h2>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-1">
                        {sessions.length} session{sessions.length > 1 ? "s" : ""} actives
                      </p>
                    </div>
                    <button className="text-xs font-bold text-[#ff7a6c] hover:underline flex items-center gap-1">
                      Voir tout <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 bg-[#fef8e7] rounded-2xl">
                      <Rocket className="h-10 w-10 mx-auto mb-3 text-[#ff7a6c]" />
                      <p className="font-semibold text-slate-700">Aucun parcours pour le moment.</p>
                      <p className="text-xs text-slate-500 mt-1">Upload ta première image ou PDF pour démarrer.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {sessions.slice(0, 6).map((s, idx) => (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <Link
                            to="/session/$id"
                            params={{ id: s.id }}
                            className="group flex gap-3 p-3 rounded-2xl border border-slate-100 hover:border-[#ff7a6c] hover:bg-[#fff5f3] transition-all"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                              <SignedImage src={s.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {s.subject && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-[#fff5f3] text-[#ff7a6c] rounded font-mono uppercase tracking-wider font-bold">
                                    {s.subject}
                                  </span>
                                )}
                                {s.status === "analyzing" && (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> IA
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm leading-snug line-clamp-2">{s.title}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(s.created_at).toLocaleDateString("fr-FR")}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#ff7a6c] group-hover:translate-x-1 transition-all self-center" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Activity heatmap */}
                <section className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div>
                      <h2 className="text-lg sm:text-xl font-display font-black flex items-center gap-2">
                        <Activity className="h-5 w-5 text-[#ff7a6c]" /> Carte d'activité
                      </h2>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-1">30 derniers jours</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <span>Moins</span>
                      {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                        <span key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: v === 0 ? "#f1f5f9" : `rgba(255,122,108,${0.25 + v * 0.75})` }} />
                      ))}
                      <span>Plus</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                    {days.map((d, i) => {
                      const intensity = d.count === 0 ? 0 : 0.25 + (d.count / heatMax) * 0.75;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.01 }}
                          title={`${d.d.toLocaleDateString("fr-FR")} — ${d.count} parcours`}
                          className="aspect-square rounded-[4px] hover:ring-2 hover:ring-[#ff7a6c] cursor-pointer transition"
                          style={{ backgroundColor: intensity === 0 ? "#f1f5f9" : `rgba(255,122,108,${intensity})` }}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Subject mastery */}
                <section className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <h2 className="text-lg sm:text-xl font-display font-black flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-[#ff7a6c]" /> Mes matières
                    </h2>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      {subjects.length} domaine{subjects.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {subjects.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Tes matières apparaîtront ici dès le premier parcours.</p>
                  ) : (
                    <div className="space-y-3">
                      {subjects.map(([name, count], i) => {
                        const scoreEntry = subjectScoreMap.get(name);
                        const pct = scoreEntry
                          ? Math.round((scoreEntry.sum / scoreEntry.n) * 100)
                          : Math.min(100, 30 + count * 12);
                        const color = subjectColors[i % subjectColors.length];
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1.5 text-sm">
                              <span className="font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                {name}
                              </span>
                              <span className="font-mono text-xs text-slate-500">{count} doc · {pct}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.08 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Daily mission */}
                <motion.section
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-slate-900 to-[#2a1a18] p-5 sm:p-6 text-white"
                >
                  <motion.div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#ff7a6c]/40 blur-3xl"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/60 mb-3">
                      <Target className="h-3 w-3" /> Mission du jour
                    </div>
                    <h3 className="text-xl font-black leading-snug">Termine 1 quiz et révise 10 cartes</h3>
                    <div className="mt-4 space-y-2">
                      {missions.map((t) => (
                        <div key={t.l} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`h-4 w-4 ${t.done ? "text-emerald-400" : "text-white/30"}`} />
                          <span className={t.done ? "line-through text-white/60" : "text-white"}>{t.l}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${missionsPct}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-gradient-to-r from-[#ff7a6c] to-[#fde047]"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-widest text-white/60">
                      <span>{missionsDone} / {missions.length}</span>
                      <span>+{missionsDone * 50} XP</span>
                    </div>
                  </div>
                </motion.section>

                {/* AI Tutor */}
                <section className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c4b5fd] to-[#7dd3fc] flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-display font-black text-sm">Tuteur IA</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">en ligne</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Pose-moi n'importe quelle question sur tes parcours. Je connais tes cours par cœur.
                  </p>
                  <div className="mt-3 space-y-2">
                    {["Explique-moi cette formule", "Crée un quiz personnalisé", "Résume mon dernier PDF"].map((q) => (
                      <button
                        key={q}
                        className="w-full text-left text-xs font-semibold px-3 py-2 bg-slate-50 hover:bg-[#fff5f3] hover:text-[#ff7a6c] rounded-xl transition flex items-center justify-between group"
                      >
                        <span>{q}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </section>

                {/* Achievements */}
                <section className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-black flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#ff7a6c]" /> Badges
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">{badgesEarned} / {badges.length}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {badges.map((b, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.1, rotate: b.on ? 5 : 0 }}
                        className={`aspect-square rounded-xl bg-gradient-to-br ${b.c} flex items-center justify-center ${b.on ? "shadow-md" : "opacity-40"}`}
                      >
                        <b.i className={`h-4 w-4 ${b.on ? "text-white" : "text-slate-500"}`} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
    </AppShell>
  );
}