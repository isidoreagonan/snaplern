import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Camera, Sparkles, Brain, MessageSquare, Trophy, Zap, Target, Clock, BookOpen, Layers, BarChart3, ArrowRight } from "lucide-react";
import { SiteShell, SectionLabel } from "@/components/site-shell";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Fonctionnalités — SnapLern, l'arsenal complet" },
      { name: "description", content: "Capture image, leçon IA, quiz adaptatif, flashcards SM-2, tuteur Socratique, mode examen 24h, knowledge graph." },
      { property: "og:title", content: "Fonctionnalités SnapLern" },
      { property: "og:description", content: "Tout ce dont tu as besoin pour apprendre 3× plus vite." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <SiteShell fullBleed>
      <>
        {/* HERO */}
        <section className="px-5 sm:px-8 md:px-12 pt-10 sm:pt-14 pb-10 sm:pb-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6 max-w-4xl mx-auto"
          >
            Sept armes pour <span className="text-[#ff7a6c]">cracker</span> n'importe quel examen.
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Chaque fonctionnalité est conçue pour résoudre un problème précis d'apprentissage. Pas de gadget.</p>
        </section>

        {/* BIG FEATURE 1 */}
        <BigFeature
          tag="01 · Capture"
          title="Snap. C'est tout."
          desc="Photo de cours, capture YouTube, schéma manuscrit, formule au tableau. SnapLern reconnaît tout — y compris l'écriture manuscrite la plus brouillonne de ton prof de maths."
          icon={Camera}
          bg="bg-[#ffe4e0]"
          mock={<MockCapture />}
        />

        <BigFeature
          tag="02 · Analyse IA"
          title="Gemini Vision décompose ton image en savoir."
          desc="Notre IA identifie sujet, concepts clés, prérequis et niveau de difficulté. Puis génère leçon structurée, exemples, anti-pièges."
          icon={Sparkles}
          bg="bg-[#d4f5c0]"
          reverse
          mock={<MockAnalysis />}
        />

        <BigFeature
          tag="03 · Flashcards SM-2"
          title="Mémorise sans effort."
          desc="Algorithme de répétition espacée amélioré par IA. Les cartes reviennent au moment optimal pour gravage long terme. Méthode Anki, mais sans le boulot."
          icon={Brain}
          bg="bg-[#e0e7ff]"
          mock={<MockFlashcards />}
        />

        <BigFeature
          tag="04 · Tuteur Socratique"
          title="Un prof de prépa dans ta poche, 24/7."
          desc="Ne te donne pas les réponses : te pose les bonnes questions. Méthode Feynman appliquée par IA. Tu comprends vraiment, pas seulement par cœur."
          icon={MessageSquare}
          bg="bg-[#fef8e7]"
          reverse
          mock={<MockChat />}
        />

        {/* GRID OF SECONDARY FEATURES */}
        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <SectionLabel kicker="Et aussi" title="3 super-pouvoirs en bonus" />
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { i: Trophy, t: "Mode Examen 24h", d: "Active le compte à rebours. SnapLern reformule tout ton historique en fiches de révision optimisées pour les dernières 24h.", c: "from-[#ff7a6c] to-[#ff9a3c]" },
              { i: BarChart3, t: "Knowledge Graph", d: "Visualise tous tes savoirs connectés. Trous, ponts, dépendances. Comme un cerveau extérieur.", c: "from-[#c4b5fd] to-[#f0abfc]" },
              { i: Zap, t: "Streak & XP", d: "Gamification non-toxique. Récompenses pour la régularité, pas pour le bachotage. Streaks pausables.", c: "from-[#a3d97a] to-[#7dd3fc]" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[24px] p-7 border border-slate-100 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.c} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.i className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold text-slate-900 text-lg mb-2">{f.t}</div>
                <div className="text-sm text-slate-600 leading-relaxed">{f.d}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 sm:px-8 md:px-12 pb-10 sm:pb-16">
          <div className="relative bg-slate-900 rounded-[24px] sm:rounded-[28px] p-8 sm:p-12 md:p-16 overflow-hidden text-center">
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#ff7a6c]/30 blur-3xl" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Prêt à tester ces 7 super-pouvoirs ?</h2>
            <p className="text-slate-300 mb-8 max-w-lg mx-auto">5 analyses gratuites par jour. Sans carte bancaire.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4 shadow-2xl">
              Activer mes super-pouvoirs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </>
    </SiteShell>
  );
}

function BigFeature({ tag, title, desc, icon: Icon, bg, reverse, mock }: { tag: string; title: string; desc: string; icon: any; bg: string; reverse?: boolean; mock: React.ReactNode }) {
  return (
    <section className="px-5 sm:px-8 md:px-12 pb-8 sm:pb-12">
      <div className={`grid md:grid-cols-2 gap-8 items-center ${reverse ? "md:[direction:rtl]" : ""}`}>
        <motion.div
          initial={{ opacity: 0, x: reverse ? 30 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="[direction:ltr]"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#ff7a6c] mb-4">
            <Icon className="h-3.5 w-3.5" />
            {tag}
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4">{title}</h2>
          <p className="text-slate-600 leading-relaxed text-lg">{desc}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`${bg} rounded-[28px] p-8 h-[400px] flex items-center justify-center [direction:ltr] relative overflow-hidden`}
        >
          {mock}
        </motion.div>
      </div>
    </section>
  );
}

function MockCapture() {
  return (
    <div className="relative w-full max-w-sm">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="bg-white rounded-2xl p-4 shadow-2xl"
      >
        <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center relative overflow-hidden">
          <Camera className="h-10 w-10 text-slate-400" />
          <motion.div
            animate={{ y: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-1 bg-[#ff7a6c] shadow-[0_0_20px_#ff7a6c]"
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a6c] animate-pulse" />
          Analyse en cours…
        </div>
      </motion.div>
    </div>
  );
}

function MockAnalysis() {
  const items = ["Sujet : Photosynthèse", "Niveau : L1 Biologie", "12 concepts clés", "5 prérequis détectés"];
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
      <div className="text-xs font-mono text-slate-400 mb-3">/ Analyse Gemini Vision</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3d97a]" />
            {it}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MockFlashcards() {
  return (
    <div className="relative w-full max-w-xs h-[280px]">
      {[2, 1, 0].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0], rotate: i === 0 ? 0 : (i - 1) * 4 }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.3 }}
          className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-6 flex flex-col justify-between"
          style={{ transform: `translate(${i * 8}px, ${i * 8}px) rotate(${(i - 1) * 4}deg)`, zIndex: 10 - i }}
        >
          <div className="text-[10px] font-mono uppercase text-slate-400">Biologie · J+3</div>
          <div className="font-bold text-slate-900 text-lg">Mitochondrie : rôle principal ?</div>
          <div className="flex gap-2">
            <button className="flex-1 py-1.5 rounded-full bg-[#ffe4e0] text-[10px] font-bold text-[#c44]">Dur</button>
            <button className="flex-1 py-1.5 rounded-full bg-[#d4f5c0] text-[10px] font-bold text-[#4a4]">Facile</button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MockChat() {
  return (
    <div className="w-full max-w-sm space-y-2">
      {[
        { from: "me", t: "C'est quoi la dérivée ?" },
        { from: "ai", t: "Avant de répondre — peux-tu me dire ce qu'est une pente sur un graphique ?" },
        { from: "me", t: "Ah… c'est l'inclinaison ?" },
        { from: "ai", t: "Exactement ! La dérivée, c'est ça : la pente à un point précis. 🎯" },
      ].map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.3 }}
          className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.from === "me" ? "bg-[#ff7a6c] text-white ml-auto rounded-br-sm" : "bg-white text-slate-800 shadow rounded-bl-sm"}`}
        >
          {m.t}
        </motion.div>
      ))}
    </div>
  );
}