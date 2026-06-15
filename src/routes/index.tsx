import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, Play, Phone, Video, Plus, Palette, Code2, Rocket, Upload, Camera, Sparkles, Brain, Trophy, Star, Quote, ChevronLeft, ChevronRight, Zap, Target, TrendingUp, Check, Clock, Users, Flame, Award, BookOpen, GraduationCap, HelpCircle, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { SiteShell, SectionLabel } from "@/components/site-shell";
import studentHero from "@/assets/student-hero.webp";
import studentPointing from "@/assets/student-pointing.webp";
import lightbulb from "@/assets/lightbulb-hand.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapLern — Apprends à partir d'une image" },
      { name: "description", content: "Photo de cours, schéma, formule. L'IA crée ton mini-cours, ton quiz et tes flashcards en 10 secondes." },
      { property: "og:title", content: "SnapLern — Apprends à partir d'une image" },
      { property: "og:description", content: "Transforme n'importe quelle image en parcours d'apprentissage interactif." },
    ],
    links: [
      { rel: "preload", as: "image", href: studentHero, fetchpriority: "high" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Choisis une image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image trop lourde (10 Mo max)");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem("lumen_pending_image", reader.result as string);
        sessionStorage.setItem("lumen_pending_name", file.name);
        toast.success("Image prête ! Crée ton compte pour voir l'analyse.");
        navigate({ to: "/auth" });
      } catch { toast.error("Image trop volumineuse"); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <SiteShell fullBleed>
      <div className="min-h-screen">
          <svg className="absolute top-32 left-[42%] w-[260px] opacity-60 pointer-events-none hidden md:block" viewBox="0 0 200 200" fill="none">
            <path d="M20 100 Q 50 30, 120 60 T 180 140" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 4" />
          </svg>

          {/* HERO */}
          <section className="grid md:grid-cols-2 gap-8 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-10 sm:pt-14 pb-12 sm:pb-20 items-center relative min-h-[calc(100vh-88px)] lg:min-h-[calc(100vh-104px)]">
            <motion.div
              initial={false}
              className="relative z-10"
            >
              <h1 className="text-[36px] sm:text-[44px] md:text-[64px] font-black tracking-tight leading-[1.05] mb-5 sm:mb-6 text-slate-900">
                Apprends depuis
                <br />
                une image{" "}
                <span className="relative inline-block">
                  facilement
                  <svg className="absolute -right-8 top-1/2 -translate-y-1/2 w-12 h-12 text-[#ff9a3c]" viewBox="0 0 50 50" fill="none">
                    <motion.path
                      d="M10 25 Q 25 5, 40 25 Q 25 45, 10 25"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, delay: 0.4 }}
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-slate-500 text-base sm:text-[17px] leading-relaxed max-w-md mb-7 sm:mb-8">
                Snap n'importe quel cours, schéma ou formule. SnapLern génère ton mini-cours, ton quiz et tes flashcards en 10 secondes pour que tu retiennes vraiment.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4 shadow-[0_14px_30px_-10px_rgba(255,107,90,0.6)] hover:shadow-[0_18px_36px_-10px_rgba(255,107,90,0.8)] hover:-translate-y-0.5 transition-all"
              >
                <Upload className="h-4 w-4" />
                Uploader une image
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex flex-wrap items-center gap-5 sm:gap-8 mt-10 sm:mt-12 opacity-80">
                <span className="font-bold text-slate-400 text-lg">Google</span>
                <span className="font-bold text-slate-400 text-lg flex items-center gap-1.5">
                  <span className="inline-block w-4 h-4 bg-[#4a154b] rounded-sm" />
                  slack
                </span>
                <span className="font-bold text-slate-400 text-lg">monday<span className="text-[#ff7a6c]">.com</span></span>
              </div>
            </motion.div>

            {/* Right: photo + floating cards */}
            <div className="relative h-[360px] sm:h-[460px] md:h-[520px] flex items-center justify-center -mx-2 sm:mx-0">
              {/* Green blob */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute right-4 top-8 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px] rounded-full"
                style={{ background: "radial-gradient(circle at 40% 40%, #d4f5c0, #b0e89a)" }}
              />
              {/* Photo */}
              <motion.img
                src={studentHero}
                alt="Étudiante avec ordinateur"
                width={560}
                height={620}
                initial={false}
                loading="eager"
                fetchPriority="high"
                className="relative z-10 w-[300px] sm:w-[380px] md:w-[440px] drop-shadow-2xl"
              />

              {/* Chat bubble card */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute left-2 top-12 sm:top-20 z-20 hidden sm:block"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-xl border border-slate-100"
                >
                  <MessageSquare className="h-6 w-6 text-[#a3d97a]" />
                </motion.div>
              </motion.div>

              {/* Active students card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="absolute right-0 top-6 sm:top-16 z-20 bg-white rounded-2xl p-3 shadow-2xl border border-slate-100 w-[180px] sm:w-[210px] md:w-[230px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-3.5 bg-slate-900 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-2.5 h-2.5 bg-[#ff7a6c] rounded-full" />
                    </div>
                    <span className="text-xs font-bold">2k+ Étudiants actifs</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Tom", note: "A commenté", color: "from-amber-400 to-orange-500", initial: "T" },
                    { name: "Amy", note: "Veut apprendre", color: "from-pink-400 to-rose-500", initial: "A" },
                  ].map((u, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center text-white text-xs font-bold`}>
                        {u.initial}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a3d97a]" />
                          {u.note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Video play card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute right-2 sm:right-4 bottom-6 sm:bottom-24 z-20 bg-white rounded-2xl p-3 shadow-2xl border border-slate-100 flex items-center gap-3 w-[200px] sm:w-[220px] md:w-[240px]"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <Video className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 leading-tight">La plus grande</div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">plateforme IA</div>
                </div>
                <button className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                </button>
              </motion.div>
            </div>
          </section>

          {/* SECOND ROW: pointing guy + green platform card */}
          <section id="features" className="grid md:grid-cols-[1fr_1.4fr] gap-4 sm:gap-6 px-5 sm:px-8 md:px-12 pb-12 sm:pb-16">
            {/* Pointing person card */}
            <div className="relative bg-[#fef8e7] rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 h-[320px] sm:h-[360px] overflow-hidden">
              {/* Pink/yellow blob */}
              <div className="absolute left-8 top-6 w-[260px] h-[260px] rounded-full bg-[#fde047]/60" />
              <div className="absolute left-16 top-10 w-[220px] h-[220px] rounded-full bg-[#fbcfe8]" />

              <img
                src={studentPointing}
                alt=""
                width={400}
                height={460}
                loading="lazy"
                className="absolute left-4 bottom-0 w-[280px] z-10"
              />
              {/* Orange dots trail */}
              <div className="absolute right-32 top-16 flex flex-col gap-3">
                {[1, 0.85, 0.7, 0.55, 0.4].map((o, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                    className="w-3 h-3 rounded-full bg-[#ff9a3c]"
                    style={{ opacity: o }}
                  />
                ))}
              </div>
              {/* Master Skill card */}
              <div className="absolute bottom-6 right-6 bg-white rounded-2xl p-3.5 shadow-xl w-[180px] z-20">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff9a3c]" />
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-[#ff9a3c] to-[#ff7a6c] rounded-full" />
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900">Maîtrise</div>
                <div className="text-[11px] text-slate-400">Progression</div>
              </div>
            </div>

            {/* Platform card */}
            <div className="relative bg-gradient-to-br from-[#d4f5c0] to-[#b8eaa0] rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 pt-32 sm:pt-10 overflow-hidden">
              <img
                src={lightbulb}
                alt=""
                width={300}
                height={300}
                loading="lazy"
                className="absolute -left-2 top-2 w-[140px] sm:w-[180px] md:w-[200px]"
              />
              <div className="relative sm:ml-[160px] md:ml-[180px] pt-2 sm:pt-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-2">
                  La plus grande<br className="hidden sm:inline" /> plateforme d'apprentissage
                </h2>
                <p className="text-slate-600 text-sm mb-6 max-w-md">Quatre piliers qui rendent l'apprentissage par image vraiment efficace.</p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md">
                  {[
                    { icon: Palette, label: "Schémas & UX", bg: "bg-[#ff9a8a]" },
                    { icon: Code2, label: "Formules & code", bg: "bg-[#7dd3fc]" },
                    { icon: Rocket, label: "Quiz adaptatif", bg: "bg-[#c4b5fd]" },
                    { icon: Plus, label: "Plus", bg: "bg-white border border-slate-200" },
                  ].map((c, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl p-3 shadow-md cursor-pointer text-center"
                    >
                      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-2 mx-auto`}>
                        <c.icon className={`h-4 w-4 ${c.bg.includes("white") ? "text-slate-500" : "text-white"}`} />
                      </div>
                      <div className="text-[10px] font-semibold text-slate-700 leading-tight">{c.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Teacher card */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:block absolute -top-2 -right-2 bg-white rounded-2xl p-4 shadow-2xl w-[170px] md:w-[180px]"
              >
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-md bg-[#c4b5fd] flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-white" />
                  </div>
                  <div className="w-6 h-6 rounded-md bg-[#86efac] flex items-center justify-center">
                    <Phone className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold ring-4 ring-white -mt-2">
                    M
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-2">Marc Philippe</div>
                  <div className="text-[11px] text-slate-400">Tuteur IA</div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 w-full justify-center">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sujets</div>
                      <div className="text-sm font-bold">423</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Élèves</div>
                      <div className="text-sm font-bold">112</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* HOW */}
          <section id="how" className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#ff7a6c]">/ Workflow</span>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-3">Simple comme 1, 2, 3</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto">Du cliché au cours complet en quelques secondes.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { n: "01", t: "Upload", d: "Prends en photo ton cours, un schéma, une formule.", bg: "bg-[#fef8e7]" },
                { n: "02", t: "Analyse IA", d: "Gemini Vision identifie le sujet et génère leçon, quiz et flashcards.", bg: "bg-[#d4f5c0]" },
                { n: "03", t: "Mémorise", d: "Quiz interactif et flashcards en répétition espacée. Tu retiens vraiment.", bg: "bg-[#ffe4e0]" },
              ].map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`${s.bg} rounded-[24px] p-8`}
                >
                  <div className="text-xs font-mono text-slate-500 mb-4">{s.n}</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{s.t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.d}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* PROCESS ANIMATION — Image becomes a course */}
          <ProcessAnimation />

          {/* FLIP CARDS DEMO */}
          <FlipCardsDemo />

          {/* STATS / GRAPH */}
          <StatsGraph />

          {/* REVIEWS SLIDER */}
          <ReviewsSlider />

          {/* FINAL CTA */}
          <section id="pricing" className="px-5 sm:px-8 md:px-12 pb-10 sm:pb-16">
            <div className="relative bg-slate-900 rounded-[24px] sm:rounded-[28px] p-8 sm:p-12 md:p-16 overflow-hidden text-center">
              <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#ff7a6c]/30 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full bg-[#a3d97a]/20 blur-3xl" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                  Ton prochain cours commence par <span className="text-[#ff7a6c]">un cliché</span>.
                </h2>
                <p className="text-slate-300 mb-8 max-w-lg mx-auto">Gratuit, sans carte bancaire. 5 analyses par jour offertes.</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4 shadow-[0_14px_30px_-10px_rgba(255,107,90,0.8)] hover:-translate-y-0.5 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  Essayer maintenant
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>


          {/* BIG NUMBERS */}
          <BigNumbers />

          {/* COMPARISON TABLE */}
          <ComparisonTable />

          {/* SUBJECTS GRID */}
          <SubjectsTeaser />

          {/* TIMELINE STORY */}
          <TimelineStory />

          {/* PRICING TEASER */}
          <PricingTeaser />

          {/* FAQ */}
          <FAQ />
      </div>
    </SiteShell>
  );
}

/* ───────────────────────── PROCESS ANIMATION ───────────────────────── */
function ProcessAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(i);
  }, []);
  const steps = [
    { icon: Camera, label: "Capture", color: "#ff7a6c" },
    { icon: Sparkles, label: "Analyse IA", color: "#c4b5fd" },
    { icon: Brain, label: "Mémorise", color: "#7dd3fc" },
    { icon: Trophy, label: "Maîtrise", color: "#a3d97a" },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <div className="text-center mb-12">
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#ff7a6c]">/ En direct</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-3">Vois ton cerveau apprendre</h2>
        <p className="text-slate-500 mt-3 max-w-md mx-auto">Une image, quatre étapes. SnapLern orchestre tout pour toi.</p>
      </div>
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 md:p-14 overflow-hidden">
        {/* glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#ff7a6c]/20 blur-3xl" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map((s, i) => {
            const active = step === i;
            const done = step > i;
            return (
              <div key={i} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#ff7a6c] to-[#ff9a3c]"
                      animate={{ width: step > i ? "100%" : active ? "60%" : "0%" }}
                      transition={{ duration: 1.5 }}
                    />
                  </div>
                )}
                <motion.div
                  animate={{ scale: active ? 1.05 : 1, y: active ? -6 : 0 }}
                  transition={{ duration: 0.5 }}
                  className={`relative bg-white/5 backdrop-blur border ${active ? "border-white/30" : "border-white/10"} rounded-2xl p-6`}
                >
                  <motion.div
                    animate={{ rotate: active ? [0, 8, -8, 0] : 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}
                  >
                    <s.icon className="h-7 w-7 text-white" />
                  </motion.div>
                  <div className="text-[10px] font-mono text-white/40 mb-1">0{i + 1}</div>
                  <div className="text-lg font-bold text-white">{s.label}</div>
                  {active && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-[#a3d97a] font-mono"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a3d97a] animate-pulse" />
                      LIVE
                    </motion.div>
                  )}
                  {done && (
                    <div className="absolute top-3 right-3 text-[#a3d97a] text-sm">✓</div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── BIG NUMBERS ───────────────────────── */
function BigNumbers() {
  const stats = [
    { v: "2 847", l: "étudiants actifs", i: Users, c: "from-[#ff7a6c] to-[#ff9a3c]" },
    { v: "187k", l: "images analysées", i: Camera, c: "from-[#a3d97a] to-[#7dd3fc]" },
    { v: "96%", l: "rétention moyenne", i: Brain, c: "from-[#c4b5fd] to-[#f0abfc]" },
    { v: "+3,4", l: "points de moyenne", i: TrendingUp, c: "from-[#fde047] to-[#ff9a3c]" },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <div className="bg-[#fef8e7] rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 md:p-14 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#ff7a6c]/10 blur-3xl" />
        <div className="relative grid md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.c} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <s.i className="h-6 w-6 text-white" />
              </div>
              <div className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight font-display">{s.v}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mt-2">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── COMPARISON ───────────────────────── */
function ComparisonTable() {
  const rows = [
    { f: "Apprendre depuis une image", lumen: true, others: false },
    { f: "Quiz adaptatif par IA", lumen: true, others: "partial" },
    { f: "Tuteur Socratique 24/7", lumen: true, others: false },
    { f: "Répétition espacée (SM-2)", lumen: true, others: "partial" },
    { f: "Mode examen 24h", lumen: true, others: false },
    { f: "Reconnaissance d'écriture manuscrite", lumen: true, others: false },
    { f: "Gratuit pour démarrer", lumen: true, others: "partial" },
  ];
  const cell = (v: boolean | string) =>
    v === true ? (
      <Check className="h-5 w-5 text-[#a3d97a] mx-auto" />
    ) : v === "partial" ? (
      <span className="text-slate-400 font-mono text-xs">partiel</span>
    ) : (
      <span className="text-slate-300 text-xl">—</span>
    );
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <SectionLabel kicker="Comparaison" title="Pourquoi SnapLern écrase la concurrence" sub="Les autres apps de révision sont bloquées en 2019. SnapLern est née de l'IA visuelle." />
      <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)] border border-slate-100">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-0 bg-slate-50 px-6 py-4 font-mono text-xs uppercase tracking-wider text-slate-500">
          <div>Fonctionnalité</div>
          <div className="text-center text-[#ff7a6c] font-bold">SnapLern</div>
          <div className="text-center">Autres apps</div>
        </div>
        {rows.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[2fr_1fr_1fr] gap-0 px-6 py-4 border-t border-slate-100 items-center hover:bg-slate-50/50"
          >
            <div className="text-sm font-semibold text-slate-800">{r.f}</div>
            <div className="text-center bg-[#fff5f3]/60 py-2 rounded-lg">{cell(r.lumen)}</div>
            <div className="text-center">{cell(r.others)}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── SUBJECTS TEASER ───────────────────────── */
function SubjectsTeaser() {
  const subs = [
    { n: "Médecine", e: "🧬", c: "bg-[#ffe4e0]" },
    { n: "Mathématiques", e: "∑", c: "bg-[#d4f5c0]" },
    { n: "Histoire", e: "📜", c: "bg-[#fef8e7]" },
    { n: "Physique", e: "⚛️", c: "bg-[#e0e7ff]" },
    { n: "Droit", e: "⚖️", c: "bg-[#fce7f3]" },
    { n: "Code", e: "{ }", c: "bg-[#cffafe]" },
    { n: "Langues", e: "🗣", c: "bg-[#fef3c7]" },
    { n: "Biologie", e: "🌿", c: "bg-[#dcfce7]" },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <SectionLabel kicker="Toutes les matières" title="Du collège au doctorat" sub="Notre IA est calibrée sur les programmes officiels et la littérature universitaire." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {subs.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -8, rotate: -2 }}
            className={`${s.c} rounded-[24px] p-6 h-[160px] flex flex-col justify-between cursor-pointer shadow-sm border border-white/40`}
          >
            <div className="text-5xl font-display font-black text-slate-900">{s.e}</div>
            <div>
              <div className="font-bold text-slate-900">{s.n}</div>
              <div className="text-[11px] text-slate-500 font-mono">+ 12 sous-domaines</div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link to="/subjects" className="inline-flex items-center gap-2 text-[#ff7a6c] font-bold hover:gap-3 transition-all">
          Voir toutes les matières <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ───────────────────────── TIMELINE STORY ───────────────────────── */
function TimelineStory() {
  const steps = [
    { t: "Lundi 8h12", h: "Tu rates un schéma au tableau", d: "Tu prends une photo discrète depuis ton téléphone." },
    { t: "Lundi 8h12", h: "SnapLern génère ton mini-cours", d: "Texte clair, concepts clés, exemples. En 10 secondes." },
    { t: "Lundi 22h", h: "5 flashcards programmées", d: "L'algo SM-2 te les présentera J+1, J+3, J+7." },
    { t: "Mardi 19h", h: "Quiz adaptatif", d: "10 questions ciblées sur tes lacunes — pas les acquis." },
    { t: "Vendredi", h: "Score 18/20 au contrôle", d: "Tu n'as révisé que 35 min cumulées. Marathon évité." },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <SectionLabel kicker="Une semaine type" title="De la photo au 18/20" sub="Pas de bachotage. Juste de la science cognitive bien orchestrée." />
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#ff7a6c] via-[#ff9a3c] to-[#a3d97a]" />
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative flex gap-6 pb-8 last:pb-0"
          >
            <div className="relative z-10 w-14 h-14 rounded-full bg-white border-4 border-[#ff7a6c] flex items-center justify-center shadow-lg shrink-0">
              <span className="font-display font-black text-[#ff7a6c]">{i + 1}</span>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">{s.t}</div>
              <div className="font-bold text-slate-900 mb-1">{s.h}</div>
              <div className="text-sm text-slate-600">{s.d}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── PRICING TEASER ───────────────────────── */
function PricingTeaser() {
  const plans = [
    { n: "Découverte", p: "0€", per: "/ toujours", l: ["5 analyses / jour", "Flashcards illimitées", "Quiz adaptatif"], cta: "Commencer", featured: false },
    { n: "Étudiant", p: "9€", per: "/ mois", l: ["Analyses illimitées", "Tuteur Socratique 24/7", "Mode examen 24h", "Knowledge Graph", "Export PDF"], cta: "Essai 7 jours", featured: true },
    { n: "Campus", p: "49€", per: "/ mois / classe", l: ["Tout Étudiant", "Tableau de bord prof", "Suivi anonymisé", "Support prioritaire"], cta: "Nous contacter", featured: false },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <SectionLabel kicker="Tarifs" title="Gratuit pour démarrer." sub="Aucune carte requise. Étudiants vérifiés : -50% à vie." />
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {plans.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-[24px] p-8 ${p.featured ? "bg-slate-900 text-white shadow-2xl scale-105 z-10" : "bg-white border border-slate-200"}`}
          >
            {p.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                ⭐ Le + populaire
              </div>
            )}
            <div className={`text-sm font-mono uppercase tracking-wider mb-2 ${p.featured ? "text-[#ff9a8a]" : "text-slate-500"}`}>{p.n}</div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black font-display">{p.p}</span>
              <span className={`text-sm ${p.featured ? "text-slate-400" : "text-slate-500"}`}>{p.per}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {p.l.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm">
                  <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.featured ? "text-[#a3d97a]" : "text-[#ff7a6c]"}`} />
                  <span className={p.featured ? "text-slate-200" : "text-slate-700"}>{line}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth">
              <button className={`w-full py-3 rounded-full font-semibold transition-all hover:-translate-y-0.5 ${p.featured ? "bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white shadow-xl" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}>
                {p.cta}
              </button>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const qs = [
    { q: "Comment SnapLern analyse mes images ?", a: "On utilise Gemini Vision (Google DeepMind) pour identifier le contenu — schéma, formule, texte manuscrit ou imprimé. L'IA reconstitue le contexte et génère leçon, quiz et flashcards en quelques secondes." },
    { q: "Mes photos sont-elles privées ?", a: "Tes images sont stockées chiffrées sur nos serveurs européens. Elles ne sont jamais utilisées pour entraîner un modèle. Tu peux supprimer ton compte et toutes tes données en un clic." },
    { q: "Sur quelles matières ça marche ?", a: "Toutes les matières scolaires et universitaires : sciences (maths, physique, chimie, bio, médecine), lettres (histoire, philo, langues, droit), tech (code, ingénierie). Si c'est dans une image, SnapLern le traite." },
    { q: "C'est différent d'Anki ou Quizlet ?", a: "Anki nécessite de créer tes cartes à la main. Quizlet propose des listes statiques. SnapLern génère tout depuis une image, et adapte les révisions en fonction de tes erreurs (méthode Feynman + SM-2)." },
    { q: "Combien ça coûte ?", a: "5 analyses gratuites par jour, sans carte bancaire. Le plan Étudiant à 9€/mois débloque l'illimité, le tuteur IA et le mode examen. -50% pour les étudiants vérifiés." },
    { q: "SnapLern remplace un professeur ?", a: "Non. SnapLern accélère ta révision et te fait gagner 60% de temps. Mais le bon prof reste irremplaçable pour la méthode, l'inspiration et l'évaluation humaine." },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <SectionLabel kicker="FAQ" title="On répond avant que tu poses la question." />
      <div className="max-w-3xl mx-auto space-y-3">
        {qs.map((item, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-bold text-slate-900">{item.q}</span>
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0">
                  <Plus className={`h-5 w-5 ${isOpen ? "text-[#ff7a6c]" : "text-slate-400"}`} />
                </motion.div>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── FLIP CARDS ───────────────────────── */
function FlipCardsDemo() {
  const [flipped, setFlipped] = useState<number | null>(null);
  const cards = [
    { q: "Mitochondrie ?", a: "Centrale énergétique de la cellule. Produit l'ATP via la respiration cellulaire.", tag: "Biologie", color: "from-[#d4f5c0] to-[#b8eaa0]" },
    { q: "Théorème de Pythagore", a: "Dans un triangle rectangle : a² + b² = c² où c est l'hypoténuse.", tag: "Mathématiques", color: "from-[#fde7d0] to-[#fbc99a]" },
    { q: "Révolution française", a: "1789 — Prise de la Bastille le 14 juillet. Fin de la monarchie absolue.", tag: "Histoire", color: "from-[#e0e7ff] to-[#c7d2fe]" },
    { q: "useState() en React", a: "Hook qui ajoute un état local à un composant fonctionnel. Retourne [valeur, setValeur].", tag: "Code", color: "from-[#ffe4e0] to-[#ffc4bc]" },
  ];
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <div className="text-center mb-12">
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#ff7a6c]">/ Flashcards</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-3">Clique. Retourne. Retiens.</h2>
        <p className="text-slate-500 mt-3 max-w-md mx-auto">Répétition espacée intégrée — l'algorithme programme les révisions au bon moment.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <button
            key={i}
            onClick={() => setFlipped(flipped === i ? null : i)}
            className="relative h-[220px] [perspective:1200px] group"
          >
            <motion.div
              animate={{ rotateY: flipped === i ? 180 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full h-full [transform-style:preserve-3d]"
            >
              {/* front */}
              <div className={`absolute inset-0 bg-gradient-to-br ${c.color} rounded-[24px] p-6 flex flex-col justify-between [backface-visibility:hidden] shadow-xl border border-white/40`}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600">{c.tag}</div>
                <div className="text-xl font-black text-slate-900 text-left leading-tight">{c.q}</div>
                <div className="text-[11px] text-slate-500 font-mono">tap pour révéler →</div>
              </div>
              {/* back */}
              <div className="absolute inset-0 bg-slate-900 rounded-[24px] p-6 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-xl">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff7a6c]">Réponse</div>
                <div className="text-sm font-medium text-white text-left leading-relaxed">{c.a}</div>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white font-mono">⭐ Facile</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white font-mono">⚡ Dur</span>
                </div>
              </div>
            </motion.div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── STATS / GRAPH ───────────────────────── */
function StatsGraph() {
  const data = [40, 55, 48, 70, 65, 82, 78, 92, 88, 96];
  const max = 100;
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Left: chart */}
        <div className="bg-[#fef8e7] rounded-[28px] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">Progression</div>
              <div className="text-2xl font-black text-slate-900">Courbe de mémoire</div>
            </div>
            <div className="flex items-center gap-1 text-[#a3d97a] font-bold text-sm">
              <TrendingUp className="h-4 w-4" />
              +142%
            </div>
          </div>
          <div className="relative h-[200px]">
            <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7a6c" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ff7a6c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((g) => (
                <line key={g} x1="0" x2="300" y1={g * 50} y2={g * 50} stroke="#00000010" strokeDasharray="2 4" />
              ))}
              <motion.path
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeOut" }}
                d={`M ${data.map((v, i) => `${(i * 300) / (data.length - 1)},${200 - (v / max) * 180}`).join(" L ")}`}
                stroke="#ff7a6c"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <motion.path
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5, duration: 1 }}
                d={`M 0,200 L ${data.map((v, i) => `${(i * 300) / (data.length - 1)},${200 - (v / max) * 180}`).join(" L ")} L 300,200 Z`}
                fill="url(#grad)"
              />
              {data.map((v, i) => (
                <motion.circle
                  key={i}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  cx={(i * 300) / (data.length - 1)}
                  cy={200 - (v / max) * 180}
                  r="3"
                  fill="#ff7a6c"
                />
              ))}
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { l: "Rétention", v: "96%" },
              { l: "Sessions", v: "247" },
              { l: "Streak", v: "32j" },
            ].map((s) => (
              <div key={s.l} className="bg-white rounded-xl p-3 text-center">
                <div className="text-xl font-black text-slate-900">{s.v}</div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: pillars */}
        <div className="bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] rounded-[28px] p-8 relative overflow-hidden">
          <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-1">/ Pourquoi ça marche</div>
          <h3 className="text-3xl font-black text-slate-900 mb-6">La science<br />derrière SnapLern</h3>
          <div className="space-y-3">
            {[
              { i: Zap, t: "Répétition espacée", d: "Algorithme SM-2 amélioré par IA", v: 96 },
              { i: Target, t: "Apprentissage actif", d: "Quiz génératifs sur tes lacunes", v: 88 },
              { i: Brain, t: "Méthode Feynman", d: "Le tuteur te pose les bonnes questions", v: 92 },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white/80 backdrop-blur rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff7a6c] to-[#ff9a3c] flex items-center justify-center shrink-0">
                  <p.i className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">{p.t}</div>
                    <div className="text-xs font-mono text-slate-500">{p.v}%</div>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1.5">{p.d}</div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p.v}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3 + i * 0.15 }}
                      className="h-full bg-gradient-to-r from-[#ff7a6c] to-[#ff9a3c]"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── REVIEWS SLIDER ───────────────────────── */
function ReviewsSlider() {
  const reviews = [
    { n: "Léa M.", r: "L3 Médecine", t: "Sorbonne", q: "J'ai pris en photo les schémas du prof, en 10 sec j'avais un quiz adapté. J'ai validé mon partiel d'anatomie avec 17/20.", c: "from-amber-400 to-orange-500", i: "L" },
    { n: "Théo R.", r: "Prépa MP", t: "Louis-le-Grand", q: "Les formules de physique compliquées deviennent des flashcards interactives. Mon Khôlleur n'en revient pas.", c: "from-pink-400 to-rose-500", i: "T" },
    { n: "Amina B.", r: "Master Droit", t: "Assas", q: "Le tuteur IA répond à mes questions sur les arrêts comme un chargé de TD. Et il est dispo à 3h du mat.", c: "from-violet-400 to-indigo-500", i: "A" },
    { n: "Marc L.", r: "École d'ingé", t: "INSA Lyon", q: "Mode examen 24h avant le partiel = vraiment cracké. J'ai gagné 3 points sur ma moyenne d'algèbre.", c: "from-emerald-400 to-teal-500", i: "M" },
    { n: "Sarah K.", r: "Terminale S", t: "Lycée Henri IV", q: "Je photographie le tableau et hop, mini-cours. C'est devenu mon rituel après chaque journée de cours.", c: "from-sky-400 to-blue-500", i: "S" },
  ];
  const [i, setI] = useState(0);
  const next = () => setI((p) => (p + 1) % reviews.length);
  const prev = () => setI((p) => (p - 1 + reviews.length) % reviews.length);
  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
      <div className="text-center mb-12">
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#ff7a6c]">/ Témoignages</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-3">Ils ont arrêté de bachoter.</h2>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="flex">
            {[...Array(5)].map((_, k) => (
              <Star key={k} className="h-5 w-5 fill-[#ff9a3c] text-[#ff9a3c]" />
            ))}
          </div>
          <span className="text-slate-700 font-bold">4.9/5</span>
          <span className="text-slate-400 text-sm">· 2 847 étudiants</span>
        </div>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <div className="relative bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 md:p-14 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] border border-slate-100 min-h-[280px] overflow-hidden">
          <Quote className="absolute top-6 right-6 h-16 w-16 text-[#ff7a6c]/10" />
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-[#ff9a3c] text-[#ff9a3c]" />
                ))}
              </div>
              <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed mb-6">
                « {reviews[i].q} »
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${reviews[i].c} flex items-center justify-center text-white font-bold ring-4 ring-white shadow-lg`}>
                  {reviews[i].i}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{reviews[i].n}</div>
                  <div className="text-xs text-slate-500">{reviews[i].r} · <span className="font-mono">{reviews[i].t}</span></div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={prev} className="w-11 h-11 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-sm transition">
            <ChevronLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div className="flex gap-2">
            {reviews.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-[#ff7a6c]" : "w-1.5 bg-slate-300"}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-11 h-11 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-sm transition">
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </button>
        </div>
      </div>
    </section>
  );
}
