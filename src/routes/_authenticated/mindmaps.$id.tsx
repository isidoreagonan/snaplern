import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";
import { ArrowLeft, Download, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { generateMindmap, type MindmapData, type MindmapNode } from "@/lib/mindmaps.functions";

export const Route = createFileRoute("/_authenticated/mindmaps/$id")({
  head: () => ({ meta: [{ title: "Mindmap — SnapLern" }] }),
  component: MindmapView,
});

type Row = {
  id: string;
  title: string;
  subject: string | null;
  status: string;
  data: MindmapData | null;
};

const CATEGORY_STYLES: Record<MindmapNode["category"], { bg: string; border: string; text: string; size: number }> = {
  root:    { bg: "#0f172a", border: "#0f172a", text: "#ffffff", size: 18 },
  main:    { bg: "#ff7a6c", border: "#ff5a4a", text: "#ffffff", size: 14 },
  sub:     { bg: "#ffffff", border: "#c4b5fd", text: "#1e293b", size: 13 },
  detail:  { bg: "#fef9c3", border: "#facc15", text: "#713f12", size: 12 },
  example: { bg: "#dcfce7", border: "#22c55e", text: "#14532d", size: 12 },
};

/** Radial layout: place children around their parent, scaling radius by depth. */
function layoutNodes(data: MindmapData): { nodes: Node[]; edges: Edge[] } {
  const byId = new Map<string, MindmapNode>();
  const childrenOf = new Map<string, string[]>();
  for (const n of data.nodes) {
    byId.set(n.id, n);
    if (n.parent) {
      if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
      childrenOf.get(n.parent)!.push(n.id);
    }
  }
  const root = data.nodes.find((n) => n.category === "root") ?? data.nodes[0];
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(root.id, { x: 0, y: 0 });

  const place = (id: string, centerAngle: number, spread: number, radius: number, depth: number) => {
    const kids = childrenOf.get(id) ?? [];
    if (!kids.length) return;
    const parentPos = positions.get(id)!;
    const step = kids.length > 1 ? spread / (kids.length - 1) : 0;
    const start = centerAngle - spread / 2;
    kids.forEach((kid, i) => {
      const angle = kids.length === 1 ? centerAngle : start + step * i;
      const x = parentPos.x + Math.cos(angle) * radius;
      const y = parentPos.y + Math.sin(angle) * radius;
      positions.set(kid, { x, y });
      const childSpread = depth === 0 ? Math.PI / 2.2 : Math.PI / 3;
      const nextRadius = depth === 0 ? 280 : depth === 1 ? 200 : 150;
      place(kid, angle, childSpread, nextRadius, depth + 1);
    });
  };
  place(root.id, 0, Math.PI * 2, 360, 0);

  const nodes: Node[] = data.nodes.map((n) => {
    const s = CATEGORY_STYLES[n.category] ?? CATEGORY_STYLES.sub;
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      position: pos,
      data: { label: n.label },
      type: "default",
      style: {
        background: s.bg,
        color: s.text,
        border: `2px solid ${s.border}`,
        borderRadius: 14,
        padding: "8px 14px",
        fontWeight: n.category === "root" ? 800 : n.category === "main" ? 700 : 600,
        fontSize: s.size,
        maxWidth: 220,
        textAlign: "center",
        boxShadow:
          n.category === "root"
            ? "0 12px 30px rgba(0,0,0,0.18)"
            : n.category === "main"
              ? "0 6px 18px rgba(255,122,108,0.35)"
              : "0 2px 6px rgba(15,23,42,0.06)",
      },
    };
  });

  const edges: Edge[] = data.nodes
    .filter((n) => n.parent)
    .map((n) => {
      const s = CATEGORY_STYLES[n.category] ?? CATEGORY_STYLES.sub;
      return {
        id: `${n.parent}-${n.id}`,
        source: n.parent!,
        target: n.id,
        type: "smoothstep",
        animated: n.category === "main",
        style: { stroke: s.border, strokeWidth: n.category === "main" ? 2.5 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: s.border },
      };
    });

  return { nodes, edges };
}

function MindmapView() {
  const { id } = Route.useParams();
  const gen = useServerFn(generateMindmap);
  const [row, setRow] = useState<Row | null>(null);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mindmaps")
      .select("id,title,subject,status,data")
      .eq("id", id)
      .maybeSingle();
    if (data) setRow(data as Row);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (row?.status === "ready" || polling) return;
    if (!row) return;
    setPolling(true);
    const interval = setInterval(load, 2500);
    return () => clearInterval(interval);
  }, [row, polling, load]);

  const regen = async () => {
    if (!row) return;
    await supabase.from("mindmaps").update({ status: "pending" }).eq("id", row.id);
    setRow({ ...row, status: "pending" });
    try {
      await gen({ data: { mindmapId: row.id } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (!row) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-[#ff7a6c]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/mindmaps" className="p-2 rounded-full bg-white border border-slate-200 hover:border-[#ff7a6c]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#7c5cff]">/ mindmap</div>
            <h1 className="text-xl md:text-2xl font-display font-black truncate">{row.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={regen}
            className="bg-white border border-slate-200 hover:border-[#ff7a6c] px-3 py-2 rounded-full text-xs font-bold flex items-center gap-2"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Régénérer
          </button>
        </div>
      </div>

      {row.status !== "ready" || !row.data ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-[#ff7a6c] mb-3 animate-pulse" />
          <div className="font-bold text-slate-900">Génération en cours…</div>
          <div className="text-sm text-slate-500 mt-1">L'IA structure ton cours en mindmap.</div>
        </div>
      ) : (
        <ReactFlowProvider>
          <MindmapCanvas data={row.data} title={row.title} />
        </ReactFlowProvider>
      )}
    </AppShell>
  );
}

function MindmapCanvas({ data, title }: { data: MindmapData; title: string }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => layoutNodes(data), [data]);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(async () => {
    const el = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    const container = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    const target = container ?? el;
    if (!target) return;
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: "#fdfbf3",
        pixelRatio: 2,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return !node.classList?.contains("react-flow__minimap") &&
                 !node.classList?.contains("react-flow__controls");
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "mindmap"}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      toast.error("Export impossible");
    }
  }, [title]);

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={exportPng}
          className="bg-slate-900 hover:bg-[#ff7a6c] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition shadow-lg"
        >
          <Download className="h-3.5 w-3.5" /> Exporter PNG
        </button>
      </div>
      <div ref={wrapperRef} className="h-[75vh] rounded-3xl overflow-hidden border border-slate-100 bg-[#fdfbf3]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} color="#e5e7eb" />
          <MiniMap pannable zoomable className="!bg-white/80 !rounded-xl !border !border-slate-200" />
          <Controls className="!rounded-xl !border !border-slate-200 !shadow-md" />
        </ReactFlow>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-900" /> sujet</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ff7a6c]" /> branches</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-[#c4b5fd] bg-white" /> sous-points</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fef9c3] border border-[#facc15]" /> détails</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dcfce7] border border-[#22c55e]" /> exemples</span>
      </div>
    </div>
  );
}