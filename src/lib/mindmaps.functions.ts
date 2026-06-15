import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateInput = z.object({
  sessionId: z.string().uuid().optional(),
  sourceText: z.string().min(20).max(40000).optional(),
  title: z.string().min(1).max(200).optional(),
});

const GenInput = z.object({ mindmapId: z.string().uuid() });

export type MindmapNode = {
  id: string;
  label: string;
  description?: string;
  category: "root" | "main" | "sub" | "detail" | "example";
  parent?: string;
};

export type MindmapData = {
  title: string;
  subject: string;
  nodes: MindmapNode[];
};

const SYSTEM = `Tu es un expert pédagogue qui crée des cartes mentales (mindmaps) parfaitement structurées en français.

À partir d'un texte de cours, génère une mindmap hiérarchique RICHE et utile pour mémoriser.

Règles :
- 1 nœud racine (category "root") = le sujet central, court (max 4 mots)
- 4 à 7 branches principales (category "main") couvrant les grands thèmes
- Chaque branche principale a 2 à 5 sous-nœuds (category "sub")
- Optionnellement, ajoute des détails (category "detail") ou exemples concrets (category "example") sous les sous-nœuds
- Labels COURTS (max 6 mots) — c'est une mindmap, pas un paragraphe
- "description" optionnelle (1 phrase) pour les nœuds importants
- Identifiants stables (ex: "root", "m1", "m1-s1", "m1-s1-d1")
- "parent" = id du parent (sauf pour root)
- Couvre TOUT le contenu fourni, sans inventer

Réponds UNIQUEMENT avec un JSON valide :
{
  "title": "titre court",
  "subject": "matière",
  "nodes": [
    { "id": "root", "label": "Sujet", "category": "root" },
    { "id": "m1", "label": "Branche 1", "category": "main", "parent": "root", "description": "..." },
    { "id": "m1-s1", "label": "Sous-point", "category": "sub", "parent": "m1" }
  ]
}`;

export const createMindmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let sourceText = data.sourceText ?? "";
    let title = data.title ?? "Mindmap";
    let subject: string | null = null;

    if (data.sessionId) {
      const { data: s } = await supabase
        .from("learning_sessions")
        .select("title,subject,analysis")
        .eq("id", data.sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!s) throw new Error("Parcours introuvable");
      title = s.title ?? title;
      subject = s.subject;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a: any = s.analysis;
      if (a) {
        const parts: string[] = [];
        if (a.summary) parts.push(`Résumé: ${a.summary}`);
        if (Array.isArray(a.keyConcepts))
          parts.push(
            "Concepts clés:\n" +
              a.keyConcepts.map((k: { term: string; definition: string }) => `- ${k.term}: ${k.definition}`).join("\n"),
          );
        if (Array.isArray(a.lesson))
          parts.push(
            "Cours:\n" +
              a.lesson.map((l: { heading: string; content: string }) => `## ${l.heading}\n${l.content}`).join("\n\n"),
          );
        sourceText = parts.join("\n\n");
      }
    }

    if (!sourceText || sourceText.length < 20) throw new Error("Contenu trop court pour générer une mindmap");

    const { data: row, error } = await supabase
      .from("mindmaps")
      .insert({
        user_id: userId,
        session_id: data.sessionId ?? null,
        title: title.slice(0, 200),
        subject,
        source_text: sourceText.slice(0, 40000),
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Création impossible");
    return { id: row.id as string };
  });

export const generateMindmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    const { data: m } = await supabase
      .from("mindmaps")
      .select("id,source_text,status")
      .eq("id", data.mindmapId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!m) throw new Error("Mindmap introuvable");
    if (m.status === "ready") return { ok: true as const };

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Crée une mindmap riche à partir de ce cours:\n\n${m.source_text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Trop de requêtes, réessaie dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    if (!res.ok) throw new Error("IA indisponible");
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Réponse IA vide");
    let parsed: MindmapData;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }
    if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length < 2) {
      throw new Error("Mindmap vide");
    }

    await supabase
      .from("mindmaps")
      .update({
        title: parsed.title?.slice(0, 200) ?? "Mindmap",
        subject: parsed.subject ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: parsed as any,
        status: "ready",
      })
      .eq("id", data.mindmapId)
      .eq("user_id", userId);
    return { ok: true as const };
  });
