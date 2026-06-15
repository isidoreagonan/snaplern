import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { motion } from "motion/react";
import { TrendingUp, Trophy, Target, Flame, BookOpen } from "lucide-react";

type Sess = { id: string; subject: string | null; created_at: string };
type Attempt = { score: number; total: number; created_at: string };

export const Route = createFileRoute("/_authenticated/trajectoire")({
  head: () => ({ meta: [{ title: "Trajectoire — SnapLern" }] }),
  component: TrajectoirePage,
});

function TrajectoirePage() {
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    supabase.from("learning_sessions").select("id,subject,created_at").then(({ data }) => setSessions(data ?? []));
    supabase.from("quiz_attempts").select("score,total,created_at").then(({ data }) => setAttempts(data ?? []));
  }, []);

  const totalScore = attempts.reduce((a, b) => a + b.score, 0);
  const totalQ = attempts.reduce((a, b) => a + b.total, 0);
  const accuracy = totalQ ? Math.round((totalScore / totalQ) * 100) : 0;

  // last 12 weeks
  const weeks = useMemo(() => {
    const arr: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = sessions.filter((s) => {
        const d = new Date(s.created_at);
        return d >= start && d < end;
      }).length;
      arr.push({ label: `S${start.getDate()}/${start.getMonth() + 1}`, count });
    }
    return arr;
  }, [sessions]);
  const maxW = Math.max(1, ...weeks.map((w) => w.count));

  const subjects = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => {
      const k = s.subject || "Autre";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [sessions]);
  const totalSub = subjects.reduce((a, [, n]) => a + n, 0) || 1;
  const colors = ["#ff7a6c", "#7dd3fc", "#c4b5fd", "#a3d97a", "#fde047", "#f0abfc"];

  const stats = [
    { l: "Parcours", v: String(sessions.length), i: BookOpen, c: "from-[#ff7a6c] to-[#ff9a3c]" },
    { l: "Quiz tentés", v: String(attempts.length), i: Target, c: "from-[#7dd3fc] to-[#c4b5fd]" },
    { l: "Précision", v: `${accuracy}%`, i: Trophy, c: "from-[#a3d97a] to-[#fde047]" },
    { l: "XP", v: String(totalScore * 10), i: Flame, c: "from-[#fde047] to-[#ff9a3c]" },
  ];

  return (
    <AppShell>
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff7a6c]">/ trajectoire</div>
        <h1 className="text-4xl md:text-5xl font-black mt-2">Ta trajectoire d'apprentissage</h1>
        <p className="text-slate-500 mt-2 max-w-xl">Mesure réelle, pas de vanity metrics. Ce que tu as fait, ce que tu maîtrises.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl p-4 border border-slate-100">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.c} flex items-center justify-center mb-2`}>
              <s.i className="h-4 w-4 text-white" />
            </div>
            <div className="text-3xl font-black">{s.v}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">{s.l}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#ff7a6c]" />
            <div className="font-black">Activité — 12 semaines</div>
          </div>
          <div className="flex items-end gap-1.5 h-40">
            {weeks.map((w, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(w.count / maxW) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="flex-1 rounded-t-md bg-gradient-to-t from-[#ff7a6c] to-[#ff9a3c] relative group min-h-[4px]"
                title={`${w.count} parcours`}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition">{w.count}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] font-mono text-slate-400">
            <span>{weeks[0]?.label}</span>
            <span>{weeks[weeks.length - 1]?.label}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="font-black mb-4">Répartition par matière</div>
          {subjects.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">Pas encore de données</div>
          ) : (
            <div className="space-y-3">
              {subjects.map(([name, n], i) => {
                const pct = (n / totalSub) * 100;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold">{name}</span>
                      <span className="font-mono text-slate-500">{n}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: colors[i % colors.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}