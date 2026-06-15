import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { motion, AnimatePresence } from "motion/react";
import { Hammer, RotateCw, Check, X, Sparkles, Flame, ArrowRight, Zap, Clock, TrendingUp, Layers } from "lucide-react";

type Card = {
  id: string;
  question: string;
  answer: string;
  difficulty: number;
  next_review: string;
  session_id: string | null;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  last_reviewed_at: string | null;
  subject: string | null;
};

export const Route = createFileRoute("/_authenticated/forge")({
  head: () => ({ meta: [{ title: "Forge — SnapLern" }] }),
  component: ForgePage,
});

// SM-2 algorithm (SuperMemo 2)
// quality: 0=again, 3=hard, 4=good, 5=easy
function sm2(prev: { repetitions: number; ease_factor: number; interval_days: number }, quality: 0 | 3 | 4 | 5) {
  let { repetitions, ease_factor, interval_days } = prev;
  if (quality < 3) {
    repetitions = 0;
    interval_days = 0; // review again today (in ~10min)
  } else {
    repetitions += 1;
    if (repetitions === 1) interval_days = 1;
    else if (repetitions === 2) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor * 10) / 10;
  }
  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  return { repetitions, ease_factor, interval_days };
}

type Mode = "due" | "quick" | "all";

function ForgePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [subject, setSubject] = useState<string>("all");
  const [mode, setMode] = useState<Mode>("due");

  const load = async () => {
    const { data } = await supabase
      .from("flashcards")
      .select("id,question,answer,difficulty,next_review,session_id,interval_days,ease_factor,repetitions,last_reviewed_at,subject")
      .order("next_review", { ascending: true })
      .limit(500);
    const rows = (data ?? []) as Card[];
    setAllCards(rows);
    applyFilter(rows, subject, mode);
    setReviewed(0);
    setCorrect(0);
  };

  const applyFilter = (rows: Card[], subj: string, m: Mode) => {
    const now = Date.now();
    let filtered = subj === "all" ? rows : rows.filter((c) => (c.subject ?? "Autre") === subj);
    if (m === "due") filtered = filtered.filter((c) => new Date(c.next_review).getTime() <= now);
    if (m === "quick") {
      filtered = filtered.filter((c) => new Date(c.next_review).getTime() <= now).slice(0, 10);
    }
    setCards(filtered);
    setIdx(0);
    setFlipped(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilter(allCards, subject, mode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [subject, mode]);

  const current = cards[idx];
  const remaining = cards.length - idx;
  const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : 0;

  // Retention metrics across full deck (matures = interval >= 21d)
  const retention = useMemo(() => {
    const scope = subject === "all" ? allCards : allCards.filter((c) => (c.subject ?? "Autre") === subject);
    if (scope.length === 0) return { mature: 0, learning: 0, due: 0, total: 0, retentionPct: 0 };
    const now = Date.now();
    let mature = 0, learning = 0, due = 0, ratedSum = 0, ratedCount = 0;
    for (const c of scope) {
      if (c.interval_days >= 21) mature++;
      else if (c.repetitions > 0) learning++;
      if (new Date(c.next_review).getTime() <= now) due++;
      if (c.repetitions > 0) {
        // proxy retention via ease_factor normalized (1.3..3.0 -> 0..100)
        ratedSum += Math.max(0, Math.min(100, ((c.ease_factor - 1.3) / 1.7) * 100));
        ratedCount++;
      }
    }
    return {
      mature,
      learning,
      due,
      total: scope.length,
      retentionPct: ratedCount > 0 ? Math.round(ratedSum / ratedCount) : 0,
    };
  }, [allCards, subject]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((c) => set.add(c.subject ?? "Autre"));
    return Array.from(set).sort();
  }, [allCards]);

  const review = async (rating: "again" | "hard" | "good" | "easy") => {
    if (!current) return;
    const q: 0 | 3 | 4 | 5 = rating === "again" ? 0 : rating === "hard" ? 3 : rating === "good" ? 4 : 5;
    const result = sm2(
      {
        repetitions: current.repetitions ?? 0,
        ease_factor: current.ease_factor ?? 2.5,
        interval_days: current.interval_days ?? 0,
      },
      q,
    );
    const nextMs = result.interval_days === 0
      ? Date.now() + 10 * 60 * 1000 // 10 min if failed
      : Date.now() + result.interval_days * 24 * 3600 * 1000;
    const newDiff = Math.max(0, Math.min(5, (current.difficulty ?? 0) + (rating === "again" ? 1 : -1)));
    const patch = {
      difficulty: newDiff,
      next_review: new Date(nextMs).toISOString(),
      interval_days: result.interval_days,
      ease_factor: result.ease_factor,
      repetitions: result.repetitions,
      last_reviewed_at: new Date().toISOString(),
    };
    await supabase.from("flashcards").update(patch).eq("id", current.id);
    setAllCards((arr) => arr.map((c) => (c.id === current.id ? { ...c, ...patch } : c)));
    setReviewed((r) => r + 1);
    if (rating !== "again") setCorrect((c) => c + 1);
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  const done = current === undefined;

  // Format next interval preview for buttons
  const previewInterval = (rating: "again" | "hard" | "good" | "easy") => {
    if (!current) return "";
    const q: 0 | 3 | 4 | 5 = rating === "again" ? 0 : rating === "hard" ? 3 : rating === "good" ? 4 : 5;
    const r = sm2(
      {
        repetitions: current.repetitions ?? 0,
        ease_factor: current.ease_factor ?? 2.5,
        interval_days: current.interval_days ?? 0,
      },
      q,
    );
    if (r.interval_days === 0) return "<10 min";
    if (r.interval_days < 1) return `${Math.round(r.interval_days * 24)} h`;
    if (r.interval_days < 30) return `${Math.round(r.interval_days)} j`;
    if (r.interval_days < 365) return `${Math.round(r.interval_days / 30)} mois`;
    return `${(r.interval_days / 365).toFixed(1)} an`;
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff7a6c]">/ forge</div>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Forge ta mémoire</h1>
          <p className="text-slate-500 mt-2 max-w-xl">Algorithme SM-2 : chaque réponse ajuste l'intervalle et le facteur de facilité pour optimiser la mémorisation à long terme.</p>
        </div>
        <button onClick={load} className="hidden md:inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-[#ff7a6c] px-4 py-2 rounded-full text-sm font-bold">
          <RotateCw className="h-4 w-4" /> Recharger
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-slate-100">
          {(["due", "quick", "all"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${mode === m ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              {m === "due" ? "À réviser" : m === "quick" ? "Rapide (10)" : "Toutes"}
            </button>
          ))}
        </div>
        {subjects.length > 1 && (
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-slate-100 overflow-x-auto max-w-full">
            <button
              onClick={() => setSubject("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${subject === "all" ? "bg-[#ff7a6c] text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              <Layers className="inline h-3 w-3 mr-1" /> Toutes
            </button>
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${subject === s ? "bg-[#ff7a6c] text-white" : "text-slate-500 hover:text-slate-900"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <Clock className="h-4 w-4 text-[#ff7a6c] mb-2" />
          <div className="text-2xl font-black">{retention.due}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Dues</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <Zap className="h-4 w-4 text-[#7c5cff] mb-2" />
          <div className="text-2xl font-black">{retention.learning}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Apprentissage</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <TrendingUp className="h-4 w-4 text-emerald-500 mb-2" />
          <div className="text-2xl font-black">{retention.mature}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Maîtrisées</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <Sparkles className="h-4 w-4 text-amber-500 mb-2" />
          <div className="text-2xl font-black">{retention.retentionPct}%</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Rétention</div>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-[#2a1a18] text-white rounded-2xl p-4 col-span-2 md:col-span-1">
          <Flame className="h-4 w-4 text-[#ff7a6c] mb-2" />
          <div className="text-2xl font-black">{reviewed > 0 ? accuracy + "%" : "—"}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">Session</div>
        </div>
      </div>

      {!done && cards.length > 0 && (
        <div className="text-xs font-mono text-slate-400 mb-3">
          {idx + 1} / {cards.length} · reste {remaining}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Hammer className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <div className="font-bold">
            {mode === "due" ? "Aucune carte à réviser maintenant 🎉" : "Aucune carte"}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {mode === "due" && allCards.length > 0
              ? "Reviens plus tard ou bascule sur « Toutes »."
              : <Link to="/app" className="text-[#ff7a6c] font-bold">Importe un cours pour générer des flashcards →</Link>}
          </div>
        </div>
      ) : done ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-[#ff8a7a] to-[#ff6b5a] rounded-3xl p-10 text-white text-center">
          <Flame className="h-12 w-12 mx-auto mb-3" />
          <div className="text-3xl font-black mb-2">Session forgée !</div>
          <div className="text-white/80 mb-6">{correct}/{reviewed} cartes maîtrisées</div>
          <button onClick={load} className="bg-white text-slate-900 font-bold px-6 py-3 rounded-full inline-flex items-center gap-2">
            Nouvelle session <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <>
          <div className="relative h-[340px] mb-4 perspective-[1200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id + (flipped ? "-b" : "-a")}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => setFlipped((f) => !f)}
                className={`absolute inset-0 rounded-3xl cursor-pointer flex flex-col items-center justify-center p-10 text-center shadow-xl border ${
                  flipped
                    ? "bg-slate-900 text-white border-slate-800"
                    : "bg-white text-slate-900 border-slate-100"
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest opacity-50 mb-4">
                  {flipped ? "Réponse" : "Question"}{current.subject ? ` · ${current.subject}` : ""}
                </div>
                <div className="text-2xl md:text-3xl font-bold max-w-2xl leading-snug">
                  {flipped ? current.answer : current.question}
                </div>
                <div className="text-xs opacity-50 mt-6">
                  {flipped ? "↺ retourner" : "clique pour voir la réponse"}
                  {current.repetitions > 0 && (
                    <span className="ml-2">· vue {current.repetitions}× · ease {current.ease_factor.toFixed(2)}</span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {flipped && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={() => review("again")} className="bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c] font-bold py-3 rounded-xl text-sm flex flex-col items-center justify-center gap-0.5">
                <span className="flex items-center gap-1.5"><X className="h-4 w-4" /> Encore</span>
                <span className="text-[10px] font-mono opacity-70">{previewInterval("again")}</span>
              </button>
              <button onClick={() => review("hard")} className="bg-[#fef3c7] hover:bg-[#fde68a] text-[#a16207] font-bold py-3 rounded-xl text-sm flex flex-col items-center justify-center gap-0.5">
                <span>Difficile</span>
                <span className="text-[10px] font-mono opacity-70">{previewInterval("hard")}</span>
              </button>
              <button onClick={() => review("good")} className="bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1d4ed8] font-bold py-3 rounded-xl text-sm flex flex-col items-center justify-center gap-0.5">
                <span>Bien</span>
                <span className="text-[10px] font-mono opacity-70">{previewInterval("good")}</span>
              </button>
              <button onClick={() => review("easy")} className="bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] font-bold py-3 rounded-xl text-sm flex flex-col items-center justify-center gap-0.5">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Facile</span>
                <span className="text-[10px] font-mono opacity-70">{previewInterval("easy")}</span>
              </button>
            </motion.div>
          )}
          {!flipped && (
            <button onClick={() => setFlipped(true)} className="w-full bg-slate-900 hover:bg-[#ff7a6c] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
              <Sparkles className="h-4 w-4" /> Révéler la réponse
            </button>
          )}
        </>
      )}
    </AppShell>
  );
}