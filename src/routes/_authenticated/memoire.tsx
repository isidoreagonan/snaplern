import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { motion } from "motion/react";
import { ScrollText, BookOpen, Target, Sparkles } from "lucide-react";

type Event =
  | { kind: "session"; id: string; title: string; subject: string | null; at: string }
  | { kind: "quiz"; id: string; score: number; total: number; at: string };

export const Route = createFileRoute("/_authenticated/memoire")({
  head: () => ({ meta: [{ title: "Mémoire — SnapLern" }] }),
  component: MemoirePage,
});

function MemoirePage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    (async () => {
      const [s, q] = await Promise.all([
        supabase.from("learning_sessions").select("id,title,subject,created_at").order("created_at", { ascending: false }).limit(80),
        supabase.from("quiz_attempts").select("id,score,total,created_at").order("created_at", { ascending: false }).limit(80),
      ]);
      const evs: Event[] = [
        ...(s.data ?? []).map((r): Event => ({ kind: "session", id: r.id, title: r.title, subject: r.subject, at: r.created_at })),
        ...(q.data ?? []).map((r): Event => ({ kind: "quiz", id: r.id, score: r.score, total: r.total, at: r.created_at })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setEvents(evs);
    })();
  }, []);

  // group by day
  const groups = new Map<string, Event[]>();
  events.forEach((e) => {
    const d = new Date(e.at);
    const key = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  });

  return (
    <AppShell>
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff7a6c]">/ mémoire</div>
        <h1 className="text-4xl md:text-5xl font-black mt-2">Le journal de ton cerveau</h1>
        <p className="text-slate-500 mt-2 max-w-xl">Tout ce que tu as appris, quiz tenté, document importé — un fil chronologique précis.</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <div className="font-bold">Encore vierge</div>
          <Link to="/app" className="text-[#ff7a6c] text-sm font-bold mt-2 inline-block">Commence ton premier parcours →</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([day, evs]) => (
            <div key={day}>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 mb-3">{day}</div>
              <div className="relative pl-6 border-l-2 border-dashed border-[#ffd5cc] space-y-3">
                {evs.map((e, i) => (
                  <motion.div
                    key={`${e.kind}-${e.id}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative bg-white rounded-2xl border border-slate-100 p-4 hover:border-[#ff7a6c] transition"
                  >
                    <div className="absolute -left-[33px] top-4 w-5 h-5 rounded-full bg-white border-2 border-[#ff7a6c] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff7a6c]" />
                    </div>
                    {e.kind === "session" ? (
                      <Link to="/session/$id" params={{ id: e.id }} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#fff5f3] flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5 text-[#ff7a6c]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Parcours · {e.subject || "autre"}</div>
                          <div className="font-bold text-sm truncate">{e.title}</div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{new Date(e.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center shrink-0">
                          <Target className="h-5 w-5 text-[#0284c7]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Quiz</div>
                          <div className="font-bold text-sm">Score {e.score}/{e.total} <Sparkles className="inline h-3 w-3 text-[#ff7a6c]" /></div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{new Date(e.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}