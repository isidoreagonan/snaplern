import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  sessionIds: z.array(z.string().uuid()).min(1).max(20),
  durationMinutes: z.number().int().min(5).max(240),
  questionCount: z.number().int().min(5).max(40),
});

const StartInput = z.object({ examId: z.string().uuid() });

const SubmitInput = z.object({
  examId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([z.string().max(4000), z.number().int().min(0).max(20)]),
    }),
  ),
});

export type ExamQuestion = {
  id: string;
  type: "mcq" | "open";
  topic: string;
  question: string;
  choices?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  explanation?: string;
  points: number;
};

export type ExamAnswer = {
  questionId: string;
  value: string | number;
  awarded?: number;
  feedback?: string;
  correct?: boolean;
};

const SYSTEM_GEN = `Tu es un examinateur expert. Tu génères des examens stricts et progressifs en français.
À partir d'un ou plusieurs cours fournis, génère un examen équilibré :
- ~60% QCM (4 choix, 1 seule bonne réponse, distracteurs plausibles)
- ~40% questions ouvertes (réponse courte, 1 à 4 phrases attendues)
- Couvre l'ensemble des chapitres, du plus simple au plus difficile
- Chaque question a un "topic" court (le concept testé) — utile pour identifier les points faibles
- Identifiants stables "q1", "q2", ...
- Points: 1 pour QCM simple, 2 pour ouvertes, 3 pour ouvertes complexes

Réponds UNIQUEMENT en JSON valide :
{
  "questions": [
    { "id": "q1", "type": "mcq", "topic": "Dérivée", "question": "...", "choices": ["A","B","C","D"], "correctIndex": 2, "explanation": "...", "points": 1 },
    { "id": "q2", "type": "open", "topic": "Intégration", "question": "...", "expectedAnswer": "réponse modèle concise", "points": 2 }
  ]
}`;

const SYSTEM_GRADE = `Tu es un correcteur juste et bienveillant. Pour chaque réponse ouverte, attribue un score (0 à points max) et un feedback bref (1-2 phrases). Sois strict sur le fond mais tolérant sur la formulation. Réponds UNIQUEMENT en JSON :
{ "grades": [ { "questionId": "q2", "awarded": 1.5, "feedback": "..." } ] }`;

const SYSTEM_WEAK = `Tu es un tuteur. À partir d'un récap d'examen (questions + topic + correct/incorrect), identifie 2 à 5 points faibles concrets et donne pour chacun un conseil de révision actionnable. Réponds UNIQUEMENT en JSON :
{ "weakPoints": [ { "topic": "...", "diagnosis": "...", "advice": "..." } ], "strengths": ["..."] }`;

async function callAI(apiKey: string, system: string, user: string) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Réponse IA invalide");
  }
}

export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("id,title,subject,analysis")
      .in("id", data.sessionIds)
      .eq("user_id", userId);

    if (!sessions || sessions.length === 0) throw new Error("Aucun parcours sélectionné");

    const subjects = Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean))) as string[];
    const titles = sessions.map((s) => s.title).join(" · ");

    const parts: string[] = [];
    for (const s of sessions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a: any = s.analysis;
      if (!a) continue;
      parts.push(`### ${s.title}${s.subject ? ` (${s.subject})` : ""}`);
      if (a.summary) parts.push(`Résumé: ${a.summary}`);
      if (Array.isArray(a.keyConcepts))
        parts.push(
          a.keyConcepts
            .map((k: { term: string; definition: string }) => `- ${k.term}: ${k.definition}`)
            .join("\n"),
        );
      if (Array.isArray(a.lesson))
        parts.push(
          a.lesson
            .map((l: { heading: string; content: string }) => `## ${l.heading}\n${l.content}`)
            .join("\n\n"),
        );
    }
    const corpus = parts.join("\n\n").slice(0, 30000);
    if (corpus.length < 100) throw new Error("Pas assez de contenu dans les parcours sélectionnés");

    const ai = await callAI(
      apiKey,
      SYSTEM_GEN,
      `Génère EXACTEMENT ${data.questionCount} questions pour un examen de ${data.durationMinutes} minutes sur :\n\n${corpus}`,
    );
    const questions: ExamQuestion[] = Array.isArray(ai.questions) ? ai.questions : [];
    if (questions.length < 3) throw new Error("Génération insuffisante, réessaie");

    const total = questions.reduce((s, q) => s + (q.points || 1), 0);
    const title = (data.title ?? `Examen — ${titles}`).slice(0, 200);

    const { data: row, error } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: userId,
        title,
        subjects,
        source_session_ids: data.sessionIds,
        duration_minutes: data.durationMinutes,
        question_count: questions.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: questions as any,
        total,
        status: "ready",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Création impossible");
    return { id: row.id as string };
  });

export const startExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StartInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const startedAt = new Date().toISOString();
    await supabase
      .from("exam_sessions")
      .update({ status: "in_progress", started_at: startedAt })
      .eq("id", data.examId)
      .eq("user_id", userId)
      .is("started_at", null);
    return { startedAt };
  });

export const submitExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    const { data: exam } = await supabase
      .from("exam_sessions")
      .select("id,questions,total,status")
      .eq("id", data.examId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!exam) throw new Error("Examen introuvable");
    const questions = (exam.questions as unknown as ExamQuestion[]) ?? [];

    const answersById = new Map(data.answers.map((a) => [a.questionId, a]));
    const graded: ExamAnswer[] = [];
    const openToGrade: { q: ExamQuestion; a: string }[] = [];

    for (const q of questions) {
      const ans = answersById.get(q.id);
      const points = q.points || 1;
      if (!ans) {
        graded.push({ questionId: q.id, value: "", awarded: 0, correct: false, feedback: "Non répondu" });
        continue;
      }
      if (q.type === "mcq") {
        const ok = Number(ans.value) === q.correctIndex;
        graded.push({
          questionId: q.id,
          value: ans.value,
          awarded: ok ? points : 0,
          correct: ok,
          feedback: ok ? "✓ Bonne réponse" : `Réponse attendue : ${q.choices?.[q.correctIndex ?? 0] ?? ""}`,
        });
      } else {
        const txt = String(ans.value ?? "").trim();
        if (!txt) {
          graded.push({ questionId: q.id, value: "", awarded: 0, correct: false, feedback: "Non répondu" });
        } else {
          openToGrade.push({ q, a: txt });
          graded.push({ questionId: q.id, value: txt }); // placeholder, filled after AI
        }
      }
    }

    if (openToGrade.length > 0) {
      const payload = openToGrade.map(({ q, a }) => ({
        questionId: q.id,
        topic: q.topic,
        points: q.points || 2,
        question: q.question,
        expectedAnswer: q.expectedAnswer ?? "",
        studentAnswer: a,
      }));
      const gradeRes = await callAI(
        apiKey,
        SYSTEM_GRADE,
        `Corrige ces réponses ouvertes :\n${JSON.stringify(payload)}`,
      );
      const grades: { questionId: string; awarded: number; feedback: string }[] = gradeRes.grades ?? [];
      const gradeMap = new Map(grades.map((g) => [g.questionId, g]));
      for (const g of graded) {
        if (g.awarded !== undefined) continue;
        const found = gradeMap.get(g.questionId);
        const q = questions.find((x) => x.id === g.questionId);
        const max = q?.points || 2;
        const awarded = Math.max(0, Math.min(max, Number(found?.awarded ?? 0)));
        g.awarded = awarded;
        g.correct = awarded >= max * 0.7;
        g.feedback = found?.feedback ?? "";
      }
    }

    const score = Math.round(graded.reduce((s, g) => s + (g.awarded ?? 0), 0));
    const total = exam.total || questions.reduce((s, q) => s + (q.points || 1), 0);

    // Weak points analysis
    let weakPoints: unknown = null;
    try {
      const recap = questions.map((q) => {
        const g = graded.find((x) => x.questionId === q.id);
        return {
          topic: q.topic,
          type: q.type,
          correct: g?.correct ?? false,
          awarded: g?.awarded ?? 0,
          max: q.points || 1,
        };
      });
      const wp = await callAI(
        apiKey,
        SYSTEM_WEAK,
        `Analyse ces résultats (score ${score}/${total}) :\n${JSON.stringify(recap)}`,
      );
      weakPoints = wp;
    } catch {
      // optional
    }

    await supabase
      .from("exam_sessions")
      .update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answers: graded as any,
        score,
        total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weak_points: weakPoints as any,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.examId)
      .eq("user_id", userId);

    return { score, total };
  });
