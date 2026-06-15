import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Camera, Upload, Sparkles, ArrowRight, Loader2, FileImage, Calculator } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-sidebar";
import { CameraCapture } from "@/components/camera-capture";
import { createSolve, solveExercise } from "@/lib/solver.functions";

export const Route = createFileRoute("/_authenticated/solver")({
  component: SolverIndex,
});

type Row = { id: string; title: string; subject: string | null; status: string; created_at: string };

function SolverIndex() {
  const navigate = useNavigate();
  const create = useServerFn(createSolve);
  const solve = useServerFn(solveExercise);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exercise_solves")
        .select("id,title,subject,status,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  const startWithBlob = async (blob: Blob) => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Non connecté");
      const path = `${uid}/solver/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("learning-images").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("learning-images").getPublicUrl(path);
      const created = await create({ data: { imageUrl: pub.publicUrl } });
      navigate({ to: "/solver/$id", params: { id: created.id } });
      solve({ data: { solveId: created.id } }).catch((e) => console.error(e));
    } catch (e) {
      console.error(e);
      toast.error("Upload impossible");
    } finally {
      setBusy(false);
      setCameraOpen(false);
    }
  };

  const onFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo trop lourde (15 Mo max)");
      return;
    }
    await startWithBlob(file);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff7a6c] to-[#ff9a3c] flex items-center justify-center shadow">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold">
            / résolveur d'exercice
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">Bloqué·e sur un exo ?</h1>
        <p className="text-slate-600 mt-3 max-w-xl">
          Prends en photo l'énoncé. L'IA te déroule la solution étape par étape, avec tableaux, schémas et points clés.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => setCameraOpen(true)}
            disabled={busy}
            className="group relative bg-slate-900 hover:bg-[#ff7a6c] text-white rounded-3xl p-6 text-left transition-colors overflow-hidden disabled:opacity-60"
          >
            <Camera className="h-7 w-7 mb-3" />
            <div className="font-display font-black text-xl">Prendre une photo</div>
            <div className="text-sm text-white/70 mt-1">Caméra intégrée, capture rapide</div>
            <ArrowRight className="h-5 w-5 absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <label className="group relative bg-white hover:bg-[#fff5f3] border-2 border-dashed border-slate-200 hover:border-[#ff7a6c] rounded-3xl p-6 text-left transition cursor-pointer">
            <Upload className="h-7 w-7 mb-3 text-[#ff7a6c]" />
            <div className="font-display font-black text-xl text-slate-900">Importer une image</div>
            <div className="text-sm text-slate-500 mt-1">JPG, PNG · 15 Mo max</div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            {busy && <Loader2 className="h-5 w-5 animate-spin absolute top-6 right-6 text-[#ff7a6c]" />}
          </label>
        </div>

        <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={startWithBlob} />

        {rows.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-[#ff7a6c]" />
              <h2 className="font-display font-black text-xl">Tes exercices résolus</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  to="/solver/$id"
                  params={{ id: r.id }}
                  className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-[#ff7a6c] transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#fff5f3] flex items-center justify-center shrink-0">
                    <FileImage className="h-5 w-5 text-[#ff7a6c]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{r.title}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {r.subject ?? (r.status === "ready" ? "résolu" : "en cours…")}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#ff7a6c]" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
