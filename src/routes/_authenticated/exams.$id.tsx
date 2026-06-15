import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Timer, Loader2, CheckCircle2, XCircle, Trophy, Send, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { startExam, submitExam, type ExamQuestion, type ExamAnswer } from "@/lib/exams.functions";

export const Route = createFileRoute("/_authenticated/exams/$id")({
  head: () => ({ meta: [{ title: "Examen — SnapLern" }] }),
  component: ExamPage,
});

type Exam = {
  id: string;
  title: string;
  duration_minutes: number;
  question_count: number;
  questions: ExamQuestion[] | null;
  answers: ExamAnswer[] | null;
  score: number;
  total: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  weak_points: WeakPoints | null;
};

type WeakPoints = {
  weakPoints?: { topic: string; diagnosis: string; advice: string }[];
  strengths?: string[];
};

function ExamPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const startFn = useServerFn(startExam);
  const submitFn = useServerFn(submitExam);

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  const load = async () => {
    const { data } = await supabase
      .from("exam_sessions")
      .select("id,title,duration_minutes,question_count,questions,answers,score,total,status,started_at,completed_at,weak_points")
      .eq("id", id)
      .maybeSingle();
    setExam(data as Exam | null);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // ticking timer
  useEffect(() => {
    if (exam?.status !== "in_progress") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exam?.status]);

  const deadline = useMemo(() => {
    if (!exam?.started_at) return null;
    return new Date(exam.started_at).getTime() + exam.duration_minutes * 60 * 1000;
  }, [exam?.started_at, exam?.duration_minutes]);

  const remainingMs = deadline ? Math.max(0, deadline - now) : null;

  const submit = async (auto = false) => {
    if (submittedRef.current || !exam) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const answers = (exam.questions ?? []).map((q) => ({
        questionId: q.id,
        value: responses[q.id] ?? (q.type === "mcq" ? -1 : ""),
      }));
      await submitFn({ data: { examId: exam.id, answers } });
      if (auto) toast.info("Temps écoulé — examen soumis automatiquement");
      await load();
    } catch (err) {
      submittedRef.current = false;
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  // auto-submit on timeout
  useEffect(() => {
    if (exam?.status === "in_progress" && remainingMs === 0 && !submittedRef.current) {
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, exam?.status]);

  const start = async () => {
    if (!exam) return;
    try {
      const { startedAt } = await startFn({ data: { examId: exam.id } });
      setExam({ ...exam, status: "in_progress", started_at: exam.started_at ?? startedAt });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (loading) {
    return <AppShell><div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div></AppShell>;
  }
  if (!exam) {
    return <AppShell><div className="p-10 text-center text-slate-500">Examen introuvable. <Link to="/exams" className="text-[#ef4444] font-bold">Retour</Link></div></AppShell>;
  }

  // === Results view ===
  if (exam.status === "completed") {
    const pct = exam.total > 0 ? Math.round((exam.score / exam.total) * 100) : 0;
    const grade = pct >= 80 ? "Excellent" : pct >= 60 ? "Bien" : pct >= 40 ? "Passable" : "À retravailler";
    const color = pct >= 80 ? "from-emerald-400 to-green-500" : pct >= 60 ? "from-[#7dd3fc] to-[#7c5cff]" : pct >= 40 ? "from-amber-400 to-orange-500" : "from-orange-500 to-red-500";
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <Link to="/exams" className="text-xs font-mono text-slate-400 hover:text-[#ef4444]">← tous les examens</Link>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-3">{exam.title}</h1>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={`mt-6 rounded-3xl bg-gradient-to-br ${color} text-white p-8 shadow-lg`}>
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7" />
              <div className="text-sm font-mono uppercase tracking-widest opacity-80">Résultat final</div>
            </div>
            <div className="mt-3 text-6xl md:text-7xl font-display font-black">{pct}%</div>
            <div className="text-lg font-bold opacity-95">{exam.score} / {exam.total} points · {grade}</div>
          </motion.div>

          {exam.weak_points?.weakPoints && exam.weak_points.weakPoints.length > 0 && (
            <section className="mt-8 bg-white rounded-3xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                <div className="font-display font-black text-lg">Points faibles à retravailler</div>
              </div>
              <div className="space-y-3">
                {exam.weak_points.weakPoints.map((wp, i) => (
                  <div key={i} className="border-l-4 border-[#ef4444] pl-4 py-1">
                    <div className="font-bold text-sm">{wp.topic}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{wp.diagnosis}</div>
                    <div className="text-xs text-slate-700 mt-1.5"><Sparkles className="inline h-3 w-3 text-[#ff7a6c] mr-1" />{wp.advice}</div>
                  </div>
                ))}
              </div>
              {exam.weak_points.strengths && exam.weak_points.strengths.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-600 font-bold mb-2">Points forts</div>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {exam.weak_points.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display font-black text-xl mb-4">Détail des réponses</h2>
            <div className="space-y-3">
              {(exam.questions ?? []).map((q, i) => {
                const a = exam.answers?.find((x) => x.questionId === q.id);
                const ok = a?.correct ?? false;
                return (
                  <div key={q.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start gap-3">
                      {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Q{i + 1} · {q.topic} · {a?.awarded ?? 0}/{q.points}</div>
                        <div className="font-bold text-sm mt-1">{q.question}</div>
                        {q.type === "mcq" ? (
                          <div className="mt-2 space-y-1">
                            {q.choices?.map((c, ci) => {
                              const chosen = Number(a?.value) === ci;
                              const correct = q.correctIndex === ci;
                              return (
                                <div key={ci} className={`text-xs px-3 py-1.5 rounded-lg ${correct ? "bg-emerald-50 text-emerald-700 font-bold" : chosen ? "bg-red-50 text-red-700" : "text-slate-500"}`}>
                                  {chosen ? "→ " : ""}{c}{correct ? " ✓" : ""}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{String(a?.value ?? "—")}</div>
                            {q.expectedAnswer && <div className="text-[11px] text-slate-500"><span className="font-mono uppercase tracking-widest text-slate-400">Attendu : </span>{q.expectedAnswer}</div>}
                          </div>
                        )}
                        {a?.feedback && <div className="mt-2 text-xs text-slate-600 italic">{a.feedback}</div>}
                        {q.explanation && <div className="mt-2 text-[11px] text-slate-500">💡 {q.explanation}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-8 flex justify-center">
            <button onClick={() => navigate({ to: "/exams" })} className="bg-slate-900 hover:bg-[#ef4444] text-white font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 transition-colors">
              Composer un nouvel examen <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // === Briefing view (ready, not started) ===
  if (exam.status === "ready") {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center pt-6">
          <Link to="/exams" className="text-xs font-mono text-slate-400 hover:text-[#ef4444]">← tous les examens</Link>
          <div className="mt-6 w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#ef4444] flex items-center justify-center shadow-lg">
            <Timer className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-5">{exam.title}</h1>
          <p className="text-slate-500 mt-3">Tu auras <b>{exam.duration_minutes} minutes</b> pour répondre à <b>{exam.question_count} questions</b>.</p>
          <div className="mt-6 bg-[#fff5f3] border border-[#ef4444]/20 rounded-2xl p-4 text-left text-sm text-slate-700">
            <div className="font-bold mb-1">⚠️ Conditions d'examen</div>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-0.5">
              <li>Le chrono démarre dès que tu cliques sur « Démarrer ».</li>
              <li>L'examen sera soumis automatiquement à la fin du temps imparti.</li>
              <li>Tu ne pourras pas le recommencer.</li>
            </ul>
          </div>
          <button onClick={start} className="mt-6 bg-slate-900 hover:bg-[#ef4444] text-white font-black px-8 py-3.5 rounded-full text-sm flex items-center gap-2 mx-auto transition-colors">
            <Timer className="h-4 w-4" /> Démarrer le chrono
          </button>
        </div>
      </AppShell>
    );
  }

  // === In-progress view ===
  const mm = remainingMs !== null ? Math.floor(remainingMs / 60000) : 0;
  const ss = remainingMs !== null ? Math.floor((remainingMs % 60000) / 1000) : 0;
  const lowTime = remainingMs !== null && remainingMs < 60_000;
  const answeredCount = (exam.questions ?? []).filter((q) => responses[q.id] !== undefined && responses[q.id] !== "" && responses[q.id] !== -1).length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto pb-24">
        <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 bg-[#fdfbf3]/95 backdrop-blur py-3 flex items-center justify-between gap-3 border-b border-slate-100">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">en cours</div>
            <div className="font-bold text-sm truncate">{exam.title}</div>
          </div>
          <motion.div
            animate={lowTime ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-sm ${lowTime ? "bg-red-500 text-white" : "bg-slate-900 text-white"}`}
          >
            <Timer className="h-4 w-4" />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </motion.div>
        </div>

        <div className="mt-4 text-xs font-mono text-slate-400 text-right">
          {answeredCount} / {exam.questions?.length ?? 0} répondues
        </div>

        <div className="mt-4 space-y-5">
          {(exam.questions ?? []).map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#ef4444] font-bold">Q{i + 1}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{q.topic} · {q.points} pt</span>
              </div>
              <div className="font-bold text-slate-900">{q.question}</div>

              {q.type === "mcq" ? (
                <div className="mt-3 space-y-2">
                  {q.choices?.map((c, ci) => {
                    const on = responses[q.id] === ci;
                    return (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => setResponses({ ...responses, [q.id]: ci })}
                        className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition ${on ? "border-[#ef4444] bg-[#fff5f3] font-bold" : "border-slate-100 hover:border-slate-200"}`}
                      >
                        {String.fromCharCode(65 + ci)}. {c}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={String(responses[q.id] ?? "")}
                  onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                  placeholder="Ta réponse…"
                  className="mt-3 w-full h-28 resize-none rounded-xl border border-slate-200 focus:border-[#ef4444] outline-none p-3 text-sm"
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-100 px-4 py-3 lg:left-[290px]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-400">{answeredCount}/{exam.questions?.length ?? 0} répondues</div>
            <button
              onClick={() => submit(false)}
              disabled={submitting}
              className="bg-slate-900 hover:bg-[#ef4444] text-white font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Correction…" : "Terminer l'examen"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {submitting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
              <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#ef4444] mx-auto" />
                <div className="font-bold mt-4">Correction par l'IA…</div>
                <div className="text-xs text-slate-500 mt-1">Analyse des points faibles en cours</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}