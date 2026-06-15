import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Network, Plus, Loader2, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { createMindmap, generateMindmap } from "@/lib/mindmaps.functions";

export const Route = createFileRoute("/_authenticated/mindmaps")({
  head: () => ({ meta: [{ title: "Mindmaps — SnapLern" }] }),
  component: MindmapsPage,
});

type Row = { id: string; title: string; subject: string | null; status: string; created_at: string };

function MindmapsPage() {
  const navigate = useNavigate();
  const create = useServerFn(createMindmap);
  const gen = useServerFn(generateMindmap);
  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("mindmaps")
      .select("id,title,subject,status,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const startFromText = async () => {
    if (text.trim().length < 20) {
      toast.error("Colle au moins quelques lignes de cours");
      return;
    }
    setBusy(true);
    try {
      const { id } = await create({ data: { sourceText: text, title: "Mindmap" } });
      navigate({ to: "/mindmaps/$id", params: { id } });
      gen({ data: { mindmapId: id } }).catch((e) => toast.error(e.message ?? "Génération impossible"));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("mindmaps").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7dd3fc] to-[#c4b5fd] flex items-center justify-center shadow">
            <Network className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7c5cff] font-bold">/ mindmaps</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">Cartes mentales</h1>
        <p className="text-slate-600 mt-3 max-w-xl">
          Transforme n'importe quel cours en mindmap interactive. Hiérarchie colorée, zoom, export PNG.
        </p>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white rounded-3xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#ff7a6c]" />
            <div className="font-bold">Générer depuis un texte</div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Colle ici un chapitre, des notes, un résumé…"
            className="w-full h-36 resize-none rounded-2xl border border-slate-200 focus:border-[#ff7a6c] outline-none p-4 text-sm"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs font-mono text-slate-400">{text.length} caractères</span>
            <button
              onClick={startFromText}
              disabled={busy}
              className="bg-slate-900 hover:bg-[#ff7a6c] text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Générer la mindmap
            </button>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">
            Astuce : tu peux aussi générer une mindmap depuis un parcours existant (bouton sur la page du parcours).
          </div>
        </motion.div>

        {rows.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display font-black text-xl mb-4">Tes mindmaps</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-[#7c5cff] transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7dd3fc] to-[#c4b5fd] flex items-center justify-center shrink-0">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <Link to="/mindmaps/$id" params={{ id: r.id }} className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{r.title}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {r.subject ?? (r.status === "ready" ? "prêt" : "en cours…")}
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Supprimer"
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#7c5cff]" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}