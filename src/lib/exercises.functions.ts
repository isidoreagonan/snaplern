import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const apiKey = () => {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY manquante");
  return k;
};

const SYSTEM_GEN = `Tu es un professeur particulier. À partir d'un cours, génère une série d'exercices progressifs (du plus simple au plus difficile) en français.

Tu DOIS répondre UNIQUEMENT avec un JSON valide :
{
  "exercises": [
    { "level": 1, "title": "court titre", "statement": "énoncé clair de l'exercice", "expected_answer": "réponse modèle détaillée", "hints": ["indice 1", "indice 2"] }
  ]
}

Règles :
- 5 exercices, du niveau 1 (très simple, application directe) au niveau 5 (synthèse / problème).
- Énoncés courts et auto-suffisants. Évite les questions à choix.
- expected_answer = solution complète qu'un prof attendrait.`;

const SYSTEM_GRADE = `Tu es un correcteur bienveillant et précis. On te donne un exercice, la réponse attendue, et la réponse de l'étudiant (texte ou image manuscrite). Tu dois :
1. Évaluer si la réponse est correcte, partiellement correcte ou fausse.
2. Donner un score sur 100.
3. Donner un feedback pédagogique en français (3-6 phrases) : ce qui est bon, ce qui manque, comment progresser.

Tu DOIS répondre UNIQUEMENT avec un JSON valide :
{ "score": 0, "is_correct": false, "feedback": "..." }

is_correct = true uniquement si score >= 70.`;

export const generateSessionExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("session_exercises")
      .select("id")
      .eq("session_id", data.sessionId)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true as const, alreadyGenerated: true };
    }

    const { data: session } = await supabase
      .from("learning_sessions")
      .select("title, subject, analysis")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Parcours introuvable");

    const a = session.analysis as {
      summary?: string;
      lesson?: { heading: string; content: string }[];
      keyConcepts?: { term: string; definition: string }[];
    } | null;
    const courseText = [
      `Titre : ${session.title}`,
      session.subject ? `Matière : ${session.subject}` : "",
      a?.summary ? `Résumé : ${a.summary}` : "",
      ...(a?.keyConcepts ?? []).map((c) => `• ${c.term} : ${c.definition}`),
      ...(a?.lesson ?? []).map((l) => `## ${l.heading}\n${l.content}`),
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_GEN },
          { role: "user", content: `Génère les exercices à partir de ce cours :\n\n${courseText}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error("Génération impossible");
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      exercises?: { level: number; title: string; statement: string; expected_answer: string; hints?: string[] }[];
    };
    const exercises = parsed.exercises ?? [];
    if (!exercises.length) throw new Error("Aucun exercice généré");

    await supabase.from("session_exercises").insert(
      exercises.map((e) => ({
        session_id: data.sessionId,
        user_id: userId,
        level: e.level,
        title: e.title?.slice(0, 200) ?? "Exercice",
        statement: e.statement,
        expected_answer: e.expected_answer ?? null,
        hints: e.hints ?? [],
      })),
    );
    return { ok: true as const, count: exercises.length };
  });

export const submitExerciseAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        exerciseId: z.string().uuid(),
        submissionType: z.enum(["text", "image"]),
        text: z.string().max(8000).optional(),
        imageUrl: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ex } = await supabase
      .from("session_exercises")
      .select("statement, expected_answer")
      .eq("id", data.exerciseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ex) throw new Error("Exercice introuvable");

    const userContent: unknown[] = [
      {
        type: "text",
        text: `EXERCICE :\n${ex.statement}\n\nRÉPONSE ATTENDUE :\n${ex.expected_answer ?? "(aucune)"}\n\nRÉPONSE DE L'ÉTUDIANT :\n${data.text ?? "(voir image)"}`,
      },
    ];
    if (data.submissionType === "image" && data.imageUrl) {
      const { signForAI } = await import("@/lib/learning-images.server");
      const signedImage = await signForAI(supabase, data.imageUrl);
      userContent.push({ type: "image_url", image_url: { url: signedImage } });
    }

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_GRADE },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error("Correction IA indisponible");
    const json = await res.json();
    const grade = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      score?: number;
      is_correct?: boolean;
      feedback?: string;
    };
    const score = Math.max(0, Math.min(100, Math.round(grade.score ?? 0)));
    const is_correct = !!grade.is_correct && score >= 70;

    const { data: attempt } = await supabase
      .from("exercise_attempts")
      .insert({
        exercise_id: data.exerciseId,
        user_id: userId,
        submission_type: data.submissionType,
        submission_text: data.text ?? null,
        submission_image_url: data.imageUrl ?? null,
        feedback: grade.feedback ?? "",
        score,
        is_correct,
      })
      .select("*")
      .single();
    return { ok: true as const, attempt, score, is_correct, feedback: grade.feedback ?? "" };
  });
