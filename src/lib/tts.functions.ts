import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBillingStatusForUser } from "@/lib/billing.server";
import { getStripeEnvironment } from "@/lib/stripe";

function chunkText(text: string, maxLen = 190): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return [clean];
  const parts = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    const piece = p.trim();
    if (!piece) continue;
    if (piece.length > maxLen) {
      if (cur) {
        chunks.push(cur.trim());
        cur = "";
      }
      const words = piece.split(" ");
      let buf = "";
      for (const w of words) {
        if ((buf + " " + w).trim().length > maxLen) {
          chunks.push(buf.trim());
          buf = w;
        } else buf = buf ? buf + " " + w : w;
      }
      if (buf) chunks.push(buf.trim());
    } else if ((cur + " " + piece).trim().length > maxLen) {
      chunks.push(cur.trim());
      cur = piece;
    } else {
      cur = cur ? cur + " " + piece : piece;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export const generateAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        text: z.string().min(1).max(20000),
        lang: z.string().min(2).max(8).default("fr"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: auth } = await supabase.auth.getUser();
    const billing = await getBillingStatusForUser({
      environment: getStripeEnvironment(),
      userId,
      email: auth.user?.email ?? undefined,
    });
    const isPro = billing.hasActiveSubscription;

    // Free users: French only + 2 audios per month
    let lang = data.lang;
    if (!isPro) {
      lang = "fr";
      const { data: quota } = await supabase.rpc("consume_audio_quota", { p_limit: 2 });
      const row = Array.isArray(quota) ? quota[0] : quota;
      if (!row?.allowed) {
        throw new Error("Limite atteinte : 2 audios / mois en plan Gratuit. Passe à Pro pour l'illimité et choisir la langue.");
      }
    }

    const chunks = chunkText(data.text);
    const buffers: Uint8Array[] = [];
    for (const ch of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&total=${chunks.length}&idx=${buffers.length}&textlen=${ch.length}&q=${encodeURIComponent(ch)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "https://translate.google.com/",
        },
      });
      if (!res.ok) throw new Error(`TTS chunk failed: ${res.status}`);
      buffers.push(new Uint8Array(await res.arrayBuffer()));
    }
    const total = buffers.reduce((a, b) => a + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const b of buffers) {
      merged.set(b, off);
      off += b.byteLength;
    }
    return {
      base64: Buffer.from(merged).toString("base64"),
      mime: "audio/mpeg",
    };
  });
