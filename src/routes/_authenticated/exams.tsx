import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Timer, Loader2, Plus, ArrowRight, Trash2, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { createExam } from "@/lib/exams.functions";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Examens chronométrés — SnapLern" }] }),
  component: ExamsPage,
});

type SessionRow = { id: string; title: string; subject: string | null };
type ExamRow = {
  id: string;
  title: string;
  duration_minutes: number;
  question_count: number;
  score: number;
  total: number;
  status: string;
  created_at: string;
};

function ExamsPage() {
  const navigate = useNavigate();
  const create = useServerFn(createExam);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(30);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, e] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("id,title,subject")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("exam_sessions")
        .select("id,title,duration_minutes,question_count,score,total,status,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setSessions((s.data ?? []) as SessionRow[]);
    setExams((e.data ?? []) as ExamRow[]);
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  const start = async () => {
    if (picked.size === 0) {
      toast.error("Choisis au moins un parcours");
      return;
    }
    setBusy(true);
    try {
      const { id } = await create({
        data: {
          sessionIds: Array.from(picked),
          durationMinutes: duration,
          questionCount: count,
        },
      });
      toast.success("Examen prêt — démarre quand tu veux");
      navigate({ to: "/exams/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("exam_sessions").delete().eq("id", id);
    setExams((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#ef4444] flex items-center justify-center shadow">
            <Timer className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ef4444] font-bold">/ examens</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">Examens chronométrés</h1>
        <p className="text-slate-600 mt-3 max-w-xl">
          Simulation de partiel : QCM + questions ouvertes corrigées par l'IA, timer strict, analyse des points faibles.
        </p>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white rounded-3xl border border-slate-100 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#ff7a6c]" />
            <div className="font-bold">Composer un nouvel examen</div>
          </div>

          <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Chapitres à inclure</div>
          {sessions.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-4">
              Aucun parcours prêt. <Link to="/new" className="text-[#ff7a6c] font-bold">Crée d'abord un parcours</Link>.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {sessions.map((s) => {
                const on = picked.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`text-left p-3 rounded-xl border-2 transition ${
                      on ? "border-[#ef4444] bg-[#fff5f3]" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="font-bold text-sm truncate">{s.title}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{s.subject ?? "—"}</div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Durée (min)</label>
              <input
                type="number"
                min={5}
                max={240}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Math.min(240, Number(e.target.value) || 30)))}
                className="mt-1 w-full rounded-xl border border-slate-200 focus:border-[#ef4444] outline-none px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Nb questions</label>
              <input
                type="number"
                min={5}
                max={40}
                value={count}
                onChange={(e) => setCount(Math.max(5, Math.min(40, Number(e.target.value) || 10)))}
                className="mt-1 w-full rounded-xl border border-slate-200 focus:border-[#ef4444] outline-none px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end mt-5">
            <button
              onClick={start}
              disabled={busy || picked.size === 0}
              className="bg-slate-900 hover:bg-[#ef4444] text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {busy ? "Génération…" : "Composer l'examen"}
            </button>
          </div>
        </motion.div>

        {exams.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display font-black text-xl mb-4">Tes examens</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {exams.map((r) => {
                const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                const done = r.status === "completed";
                return (
                  <div key={r.id} className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-[#ef4444] transition flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#ef4444] flex items-center justify-center shrink-0">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <Link to="/exams/$id" params={{ id: r.id }} className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{r.title}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {done ? `${pct}% · ${r.score}/${r.total}` : `${r.duration_minutes} min · ${r.question_count} questions`}
                      </div>
                    </Link>
                    <button onClick={() => remove(r.id)} aria-label="Supprimer" className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#ef4444]" />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}