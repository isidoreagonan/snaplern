import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  HelpCircle,
  X,
  Loader2,
  Calculator,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { explainConcept } from "@/lib/solver.functions";
import { SignedImage } from "@/components/signed-image";

export const Route = createFileRoute("/_authenticated/solver/$id")({
  component: SolverDetail,
});

type Block =
  | { type: "text"; content: string }
  | { type: "key"; content: string }
  | { type: "formula"; content: string }
  | { type: "step"; title?: string; content: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "schema"; svg: string; caption?: string };

type Solution = {
  title: string;
  subject?: string;
  statement?: string;
  blocks: Block[];
  final_answer?: string;
};

type Row = { id: string; title: string; subject: string | null; image_url: string; solution: Solution | null; status: string };

function SolverDetail() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askInput, setAskInput] = useState("");

  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      const { data } = await supabase.from("exercise_solves").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      setRow(data as Row | null);
    };
    fetchOnce();
    const t = setInterval(() => {
      if (row?.status !== "ready") fetchOnce();
      else clearInterval(t);
    }, 2500);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id, row?.status]);

  const contextString = useMemo(() => {
    if (!row?.solution) return "";
    return [
      row.solution.title,
      row.solution.statement,
      ...row.solution.blocks.map((b) => {
        if (b.type === "text" || b.type === "key" || b.type === "formula") return b.content;
        if (b.type === "step") return `${b.title ?? ""} ${b.content}`;
        if (b.type === "table") return `Tableau: ${b.headers.join(" | ")}`;
        return "";
      }),
      row.solution.final_answer,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 3500);
  }, [row]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] lg:p-0">
      <div className="w-full p-3 md:p-4 lg:p-0">
        <div className="bg-[#fdfbf3] rounded-[28px] overflow-hidden text-slate-900 lg:rounded-none lg:min-h-screen">
          <header className="flex items-center justify-between px-6 md:px-12 pt-7 pb-2">
            <Link to="/solver" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#ff7a6c]">
              <ArrowLeft className="h-4 w-4" /> Résolveur
            </Link>
            <div className="flex items-center gap-2 bg-[#fff5f3] px-3 py-1.5 rounded-full">
              <Calculator className="h-3.5 w-3.5 text-[#ff7a6c]" />
              <span className="text-xs font-bold text-[#ff7a6c]">Solution IA</span>
            </div>
          </header>

          {!row ? (
            <div className="p-12 text-center">Chargement…</div>
          ) : row.status !== "ready" || !row.solution ? (
            <div className="px-6 md:px-12 py-12 flex flex-col items-center gap-4 text-center">
              <SignedImage src={row.image_url} alt="" className="max-h-72 rounded-2xl shadow" />
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="h-4 w-4 text-[#ff7a6c] animate-pulse" />
                <span className="font-bold">L'IA résout ton exercice…</span>
              </div>
              <p className="text-xs font-mono text-slate-400">~15 secondes</p>
            </div>
          ) : (
            <SolutionView solution={row.solution} imageUrl={row.image_url} onAsk={(seed) => {
              setAskInput(seed);
              setAskOpen(true);
            }} />
          )}
        </div>
      </div>

      <AskModal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        defaultValue={askInput}
        context={contextString}
      />
    </div>
  );
}

function SolutionView({
  solution,
  imageUrl,
  onAsk,
}: {
  solution: Solution;
  imageUrl: string;
  onAsk: (seed: string) => void;
}) {
  return (
    <div className="px-5 sm:px-8 md:px-12 pt-2 pb-12 max-w-4xl mx-auto">
      <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start mb-8">
        <img src={imageUrl} alt="" className="rounded-2xl shadow border-4 border-white" />
        <div>
          {solution.subject && (
            <span className="inline-block text-[10px] px-2.5 py-1 bg-[#ff7a6c] text-white rounded-full font-mono uppercase tracking-wider font-bold">
              / {solution.subject}
            </span>
          )}
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight mt-3 leading-tight">
            {solution.title}
          </h1>
          {solution.statement && (
            <p className="text-slate-600 mt-3 leading-relaxed italic">{solution.statement}</p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {solution.blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} index={i} onAsk={onAsk} />
        ))}
      </div>

      {solution.final_answer && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 bg-gradient-to-br from-[#5a8a3a] to-[#4a7a2a] rounded-[24px] p-8 text-white relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">/ réponse finale</span>
          </div>
          <div className="text-xl md:text-2xl font-display font-black leading-snug">
            {solution.final_answer}
          </div>
        </motion.div>
      )}

      <button
        onClick={() => onAsk("")}
        className="mt-6 w-full bg-white border-2 border-dashed border-[#ff7a6c] hover:bg-[#fff5f3] text-[#ff7a6c] font-display font-bold py-5 rounded-2xl transition flex items-center justify-center gap-2"
      >
        <HelpCircle className="h-5 w-5" /> Je n'ai pas compris quelque chose
      </button>
    </div>
  );
}

function BlockRenderer({ block, index, onAsk }: { block: Block; index: number; onAsk: (s: string) => void }) {
  if (block.type === "key") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative bg-gradient-to-r from-[#fff5f3] to-white border-l-4 border-[#ff7a6c] rounded-2xl p-5 flex gap-3"
      >
        <Lightbulb className="h-5 w-5 text-[#ff7a6c] shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold mb-1">
            / moment clé
          </div>
          <div className="text-slate-900 font-bold leading-snug">{block.content}</div>
        </div>
        <button
          onClick={() => onAsk(block.content)}
          className="ml-auto self-start text-xs text-slate-500 hover:text-[#ff7a6c] flex items-center gap-1"
        >
          <HelpCircle className="h-3.5 w-3.5" /> expliquer
        </button>
      </motion.div>
    );
  }

  if (block.type === "step") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-black">
            {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="font-display font-black text-lg leading-tight">{block.title ?? `Étape ${index + 1}`}</h3>
          <button
            onClick={() => onAsk(block.title ?? block.content.slice(0, 80))}
            className="ml-auto text-xs text-slate-400 hover:text-[#ff7a6c] flex items-center gap-1"
          >
            <HelpCircle className="h-3.5 w-3.5" /> aide
          </button>
        </div>
        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 text-slate-700 leading-relaxed prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
      </div>
    );
  }

  if (block.type === "formula") {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-5 font-mono text-center text-lg overflow-x-auto">
        {block.content}
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-bold text-slate-700 border-b border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-4 py-3 text-slate-700">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block.type === "schema") {
    return (
      <figure className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-[#ff7a6c]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold">/ schéma</span>
        </div>
        <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: sanitizeSvg(block.svg) }} />
        {block.caption && (
          <figcaption className="text-xs text-slate-500 mt-3 text-center italic">{block.caption}</figcaption>
        )}
      </figure>
    );
  }

  return null;
}

function sanitizeSvg(svg: string): string {
  // Strip <script> tags and on* handlers — basic safety for AI-generated SVG.
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "");
}

function AskModal({
  open,
  onClose,
  defaultValue,
  context,
}: {
  open: boolean;
  onClose: () => void;
  defaultValue: string;
  context: string;
}) {
  const explain = useServerFn(explainConcept);
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    definition: string;
    intuition: string;
    applications: { title: string; content: string }[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setResult(null);
    }
  }, [open, defaultValue]);

  const submit = async () => {
    if (!value.trim()) {
      toast.error("Dis-moi ce que tu n'as pas compris");
      return;
    }
    setLoading(true);
    try {
      const r = await explain({ data: { concept: value.trim(), context } });
      setResult(r);
    } catch (e) {
      console.error(e);
      toast.error("Explication impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-3 bottom-3 top-10 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[85vh] bg-[#fdfbf3] rounded-3xl z-[91] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#ff7a6c]" />
                <div className="font-display font-black">Je n'ai pas compris</div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Quel mot, formule ou idée n'est pas clair ?"
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#ff7a6c]"
              />
              <button
                onClick={submit}
                disabled={loading}
                className="w-full bg-[#ff7a6c] hover:bg-[#ff6b5a] text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Demande une explication
              </button>

              {result && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold mb-1">
                      / définition
                    </div>
                    <div className="text-slate-800 leading-relaxed">{result.definition}</div>
                  </div>
                  {result.intuition && (
                    <div className="bg-gradient-to-r from-[#fff5f3] to-white rounded-2xl p-4 border-l-4 border-[#ff7a6c]">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold mb-1">
                        / intuition
                      </div>
                      <div className="text-slate-800 italic leading-relaxed">{result.intuition}</div>
                    </div>
                  )}
                  {result.applications.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                        / applications concrètes
                      </div>
                      {result.applications.map((a, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100">
                          <div className="font-bold text-slate-900 mb-1">{a.title}</div>
                          <div className="text-sm text-slate-600 leading-relaxed">{a.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
