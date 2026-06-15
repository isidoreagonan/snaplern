import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { signForAI } from "@/lib/learning-images.server";

const apiKey = () => {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY manquante");
  return k;
};

const SYSTEM_SOLVE = `Tu es un professeur expert qui résout des exercices en détail pour un étudiant francophone.
On te fournit une photo d'un exercice. Tu dois :
1. Lire l'énoncé.
2. Identifier la matière.
3. Produire une solution COMPLÈTE et PÉDAGOGIQUE avec étapes, formules, justifications.
4. Si l'exercice nécessite un tableau, RENDS-LE comme un vrai tableau structuré.
5. Si un schéma aide à comprendre, GÉNÈRE-LE comme un SVG inline (largeur 100%, viewBox propre).
6. Souligne les MOMENTS CLÉS (concept ou astuce critique).

Tu DOIS répondre UNIQUEMENT avec un JSON valide qui suit STRICTEMENT ce schéma :

{
  "title": "titre court de l'exercice",
  "subject": "matière",
  "statement": "énoncé reformulé de l'exercice",
  "blocks": [
    { "type": "text", "content": "paragraphe explicatif en markdown (utilise **gras** pour les moments clés)" },
    { "type": "key", "content": "moment clé essentiel à retenir" },
    { "type": "formula", "content": "formule en LaTeX-like ou texte clair" },
    { "type": "table", "headers": ["col1", "col2"], "rows": [["a", "b"], ["c", "d"]] },
    { "type": "schema", "svg": "<svg viewBox='0 0 400 200' xmlns='http://www.w3.org/2000/svg'>...</svg>", "caption": "description du schéma" },
    { "type": "step", "title": "Étape 1 — ...", "content": "explication détaillée en markdown" }
  ],
  "final_answer": "réponse finale claire"
}

Règles :
- 5 à 12 blocks. Mélange step, text, table, schema, key, formula selon le besoin.
- Les SVG doivent être valides (pas de balises non fermées), simples mais lisibles.
- Markdown autorisé dans content : **gras**, listes, retours à la ligne.`;

const SYSTEM_EXPLAIN = `Tu es un tuteur qui ré-explique un concept à un étudiant francophone qui n'a PAS compris.
On te donne le contexte de l'exercice et la phrase/concept incompris.

Tu DOIS répondre UNIQUEMENT avec un JSON valide :
{
  "definition": "définition claire et accessible (2-4 phrases)",
  "intuition": "métaphore ou image mentale pour comprendre",
  "applications": [
    { "title": "exemple court", "content": "explication de l'application concrète" }
  ]
}

Donne 2-4 applications concrètes différentes.`;

export const createSolve = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ imageUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("exercise_solves")
      .insert({ user_id: userId, image_url: data.imageUrl, status: "pending", title: "Analyse en cours…" })
      .select("id")
      .single();
    if (error || !row) throw new Error("Création impossible");
    return { id: row.id as string };
  });

export const solveExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ solveId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: solve } = await supabase
      .from("exercise_solves")
      .select("image_url, status")
      .eq("id", data.solveId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!solve) throw new Error("Introuvable");
    if (solve.status === "ready") return { ok: true as const };

    const signedImage = await signForAI(supabase, solve.image_url);

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_SOLVE },
          {
            role: "user",
            content: [
              { type: "text", text: "Résous cet exercice en détail pour que l'étudiant comprenne tout." },
              { type: "image_url", image_url: { url: signedImage } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Trop de requêtes, réessaie dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés.");
    if (!res.ok) throw new Error("Résolution impossible");
    const json = await res.json();
    const solution = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");

    await supabase
      .from("exercise_solves")
      .update({
        title: solution.title?.slice(0, 200) ?? "Exercice résolu",
        subject: solution.subject ?? null,
        solution,
        status: "ready",
      })
      .eq("id", data.solveId)
      .eq("user_id", userId);

    return { ok: true as const };
  });

export const explainConcept = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        context: z.string().max(4000),
        concept: z.string().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_EXPLAIN },
          {
            role: "user",
            content: `Contexte de l'exercice :\n${data.context}\n\nL'étudiant n'a pas compris :\n"${data.concept}"\n\nRé-explique-lui.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error("Explication impossible");
    const json = await res.json();
    const out = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      definition?: string;
      intuition?: string;
      applications?: { title: string; content: string }[];
    };
    return {
      definition: out.definition ?? "",
      intuition: out.intuition ?? "",
      applications: out.applications ?? [],
    };
  });
