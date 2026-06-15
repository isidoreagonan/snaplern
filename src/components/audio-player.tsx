import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, Square, Download, Loader2, Headphones, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { generateAudio } from "@/lib/tts.functions";
import { getBillingStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Link } from "@tanstack/react-router";

const LANGS: { code: string; bcp47: string; label: string; flag: string }[] = [
  { code: "fr", bcp47: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "en", bcp47: "en-US", label: "English", flag: "🇬🇧" },
  { code: "es", bcp47: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "de", bcp47: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", bcp47: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", bcp47: "pt-PT", label: "Português", flag: "🇵🇹" },
  { code: "ar", bcp47: "ar-SA", label: "العربية", flag: "🇸🇦" },
];

export function AudioPlayer({ text, title }: { text: string; title: string }) {
  const tts = useTextToSpeech();
  const gen = useServerFn(generateAudio);
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [lang, setLang] = useState("fr");
  const [openLang, setOpenLang] = useState(false);

  useEffect(() => {
    getBillingStatus({ data: { environment: getStripeEnvironment() } })
      .then((r) => setIsPro(r.plan === "pro" || r.plan === "trial"))
      .catch(() => {});
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  const handlePlay = () => {
    if (tts.playing && !tts.paused) {
      tts.pause();
    } else if (tts.paused) {
      tts.resume();
    } else {
      tts.speak(text, current.bcp47);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await gen({ data: { text, lang: isPro ? lang : "fr" } });
      const bin = atob(res.base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^\w\s-]/g, "").trim() || "cours"}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Audio téléchargé");
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Téléchargement impossible";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff7a6c] to-[#ff9a3c] flex items-center justify-center shadow shrink-0">
        <Headphones className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a6c] font-bold">
          / audio du cours
        </div>
        <div className="text-sm font-bold text-slate-900 truncate">
          {tts.playing ? (tts.paused ? "En pause" : "Lecture en cours…") : "Écoute ton cours"}
        </div>
      </div>

      {/* Language picker — Pro only */}
      <div className="relative">
        <button
          onClick={() => {
            if (!isPro) {
              toast.info("Le choix de la langue est réservé aux abonnés Pro.");
              return;
            }
            setOpenLang((o) => !o);
          }}
          className={`h-10 px-3 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition ${
            isPro
              ? "border-slate-200 text-slate-700 hover:border-[#ff7a6c] hover:text-[#ff7a6c]"
              : "border-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          title={isPro ? "Choisir la langue" : "Réservé aux abonnés Pro"}
        >
          {isPro ? <Globe className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{current.flag} {current.code.toUpperCase()}</span>
          <span className="sm:hidden">{current.flag}</span>
        </button>
        {openLang && isPro && (
          <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpenLang(false);
                  if (tts.playing) tts.stop();
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${
                  l.code === lang ? "bg-[#fff5f3] text-[#ff7a6c] font-bold" : "text-slate-700"
                }`}
              >
                <span className="text-lg">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        )}
        {!isPro && (
          <Link
            to="/pricing"
            className="absolute -top-2 -right-2 bg-[#ff7a6c] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow"
          >
            Pro
          </Link>
        )}
      </div>

      <button
        onClick={handlePlay}
        className="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-slate-700 transition"
        title={tts.playing && !tts.paused ? "Pause" : "Lire"}
      >
        {tts.playing && !tts.paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        <span className="hidden sm:inline">{tts.playing && !tts.paused ? "Pause" : "Lire"}</span>
      </button>
      {tts.playing && (
        <button
          onClick={tts.stop}
          className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
          title="Stop"
        >
          <Square className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5 hover:border-[#ff7a6c] hover:text-[#ff7a6c] transition disabled:opacity-50"
        title="Télécharger en MP3"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="hidden sm:inline">MP3</span>
      </button>
    </div>
  );
}