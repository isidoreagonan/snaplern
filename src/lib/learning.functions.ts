import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getBillingStatusForUser } from "@/lib/billing.server";
import { getStripeEnvironment } from "@/lib/stripe";
import { signForAI } from "@/lib/learning-images.server";

const AnalyzeInput = z.object({
  sessionId: z.string().uuid(),
  imageUrl: z.string().url(),
  fileType: z.enum(["image", "pdf"]).optional().default("image"),
});

type AnalysisResult = {
  title: string;
  subject: string;
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  lesson: { heading: string; content: string }[];
  quiz: {
    question: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
  }[];
  flashcards: { question: string; answer: string }[];
};

const SYSTEM_PROMPT = `Tu es un professeur particulier expert et pédagogue. À partir d'un document fourni par un étudiant (photo de cours, schéma, formule, diagramme, ou PDF complet de plusieurs pages), tu dois produire un parcours d'apprentissage structuré et de haut niveau, en français.

Si on te fournit un PDF, tu DOIS lire l'INTÉGRALITÉ du document (toutes les pages) avant de produire le parcours. Couvre tous les chapitres, exemples et formules présentés.

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide qui suit STRICTEMENT ce schéma (aucun texte avant ou après) :

{
  "title": "titre court et précis du sujet (max 80 caractères)",
  "subject": "matière principale (ex: Biologie, Mathématiques, Histoire...)",
  "summary": "résumé pédagogique de 3-5 phrases qui explique ce que couvre le document et pourquoi c'est important",
  "keyConcepts": [
    { "term": "concept clé", "definition": "définition claire et concise" }
  ],
  "lesson": [
    { "heading": "titre de section", "content": "explication détaillée en 3-6 phrases" }
  ],
  "quiz": [
    {
      "question": "question claire",
      "choices": ["choix A", "choix B", "choix C", "choix D"],
      "answerIndex": 0,
      "explanation": "pourquoi cette réponse est correcte"
    }
  ],
  "flashcards": [
    { "question": "question recto", "answer": "réponse verso" }
  ]
}

Règles :
- Pour une image : 4-6 concepts, 3-5 sections, 5 questions de quiz, 6-10 flashcards
- Pour un PDF complet : 6-12 concepts, 5-10 sections (une par chapitre/thème), 8-12 questions de quiz, 12-25 flashcards couvrant TOUT le document
- Chaque question de quiz a exactement 4 choix
- Vulgarise sans simplifier à l'excès
- Couvre TOUT le contenu fourni — ne saute aucune section importante d'un PDF`;

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    // Enforce free tier limits: 3 uploads/month, 15 MB max
    const { data: auth } = await supabase.auth.getUser();
    const billing = await getBillingStatusForUser({
      environment: getStripeEnvironment(),
      userId,
      email: auth.user?.email ?? undefined,
    });
    const isPro = billing.hasActiveSubscription;
    const signedImage = await signForAI(supabase, data.imageUrl);
    if (!isPro) {
      const headRes = await fetch(signedImage, { method: "HEAD" });
      const size = Number(headRes.headers.get("content-length") ?? "0");
      if (size > 15 * 1024 * 1024) {
        throw new Error("Fichier > 15 Mo : passe à Pro pour téléverser jusqu'à 100 Mo.");
      }
      const { data: quota } = await supabase.rpc("consume_upload_quota", { p_limit: 3 });
      const row = Array.isArray(quota) ? quota[0] : quota;
      if (!row?.allowed) {
        throw new Error("Limite atteinte : 3 analyses / mois en plan Gratuit. Passe à Pro pour l'illimité.");
      }
    }

    // Build user content using native Gemini format
    let parts: any[];
    if (data.fileType === "pdf") {
      const fileRes = await fetch(signedImage);
      if (!fileRes.ok) throw new Error("Impossible de télécharger le PDF");
      const buf = await fileRes.arrayBuffer();
      if (buf.byteLength > 100 * 1024 * 1024) {
        throw new Error("PDF trop volumineux (100 Mo max)");
      }
      const base64 = Buffer.from(buf).toString("base64");
      parts = [
        { text: "Lis ce PDF en entier (toutes les pages) et génère un parcours d'apprentissage complet couvrant l'intégralité du document." },
        { inlineData: { mimeType: "application/pdf", data: base64 } }
      ];
    } else {
      const fileRes = await fetch(signedImage);
      if (!fileRes.ok) throw new Error("Impossible de télécharger l'image");
      const buf = await fileRes.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const mimeType = signedImage.toLowerCase().includes(".png") ? "image/png" : 
                       signedImage.toLowerCase().includes(".webp") ? "image/webp" : "image/jpeg";
      parts = [
        { text: "Analyse cette image et génère un parcours d'apprentissage complet." },
        { inlineData: { mimeType, data: base64 } }
      ];
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (response.status === 429) throw new Error("Limite atteinte. Réessaie dans un moment.");
    if (response.status === 402) throw new Error("Crédits IA épuisés. Recharge ton espace.");
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Erreur IA: ${txt.slice(0, 200)}`);
    }

    const json = await response.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Réponse IA vide");

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    await supabase
      .from("learning_sessions")
      .update({
        title: analysis.title?.slice(0, 200) ?? "Sans titre",
        subject: analysis.subject ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        analysis: analysis as any,
        status: "ready",
      })
      .eq("id", data.sessionId)
      .eq("user_id", userId);

    // Seed flashcards
    if (analysis.flashcards?.length) {
      await supabase.from("flashcards").insert(
        analysis.flashcards.map((f) => ({
          user_id: userId,
          session_id: data.sessionId,
          question: f.question,
          answer: f.answer,
        })),
      );
    }

    return { ok: true as const, analysis };
  });
