import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { SignedImage } from "@/components/signed-image";
import { motion } from "motion/react";
import { Search, BookOpen, FileText, Filter, Grid3x3, List, Sparkles } from "lucide-react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";

type Doc = {
  id: string;
  title: string;
  subject: string | null;
  image_url: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/codex")({
  head: () => ({ meta: [{ title: "Codex — SnapLern" }] }),
  component: CodexPage,
});

function CodexPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("Tous");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    supabase
      .from("learning_sessions")
      .select("id,title,subject,image_url,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs(data ?? []));
  }, []);

  const subjects = useMemo(() => {
    const s = new Set<string>();
    docs.forEach((d) => d.subject && s.add(d.subject));
    return ["Tous", ...Array.from(s)];
  }, [docs]);

  const filtered = docs.filter(
    (d) =>
      (subject === "Tous" || d.subject === subject) &&
      (q === "" || d.title.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppShell>
      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff7a6c]">/ codex</div>
        <h1 className="text-4xl md:text-5xl font-black mt-2">Ta bibliothèque vivante</h1>
        <p className="text-slate-500 mt-2 max-w-xl">Chaque document que tu importes devient une carte indexée, fouillable, reliée à ton univers.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cherche un titre, un concept…"
            className="w-full pl-11 pr-4 py-2.5 bg-white rounded-full text-sm border border-slate-200 focus:border-[#ff7a6c] outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1">
          <button onClick={() => setView("grid")} className={`p-2 rounded-full ${view === "grid" ? "bg-slate-900 text-white" : "text-slate-500"}`}><Grid3x3 className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} className={`p-2 rounded-full ${view === "list" ? "bg-slate-900 text-white" : "text-slate-500"}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Filter className="h-4 w-4 text-slate-400 self-center" />
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
              subject === s ? "bg-[#ff7a6c] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#ff7a6c]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <div className="font-bold">Aucun document</div>
          <Link to="/app" className="text-[#ff7a6c] text-sm font-bold mt-2 inline-block">Importe ton premier cours →</Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d, i) => {
            const isPdf = /\.pdf($|\?)/i.test(d.image_url);
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to="/session/$id" params={{ id: d.id }} className="block bg-white rounded-2xl border border-slate-100 hover:border-[#ff7a6c] hover:-translate-y-1 transition-all overflow-hidden">
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#fff5f3] to-[#fef8e7] flex items-center justify-center relative">
                    {isPdf ? (
                      <PdfThumbnail src={d.image_url} className="w-full h-full" alt={d.title} />
                    ) : (
                      <SignedImage src={d.image_url} alt={d.title} className="w-full h-full object-cover" />
                    )}
                    {d.status === "analyzing" && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[10px] font-mono uppercase px-2 py-0.5 rounded-full">analyse…</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] mb-1">{d.subject || "autre"}</div>
                    <div className="font-black text-sm line-clamp-2">{d.title}</div>
                    <div className="text-[11px] text-slate-400 mt-2">{new Date(d.created_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Link key={d.id} to="/session/$id" params={{ id: d.id }} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 hover:border-[#ff7a6c] p-3 transition">
              <div className="w-12 h-12 rounded-xl bg-[#fff5f3] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#ff7a6c]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{d.title}</div>
                <div className="text-[11px] text-slate-400">{d.subject || "autre"} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}