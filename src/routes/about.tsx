import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Heart, Compass, Lightbulb, Users, ArrowRight, Quote } from "lucide-react";
import { SiteShell, SectionLabel } from "@/components/site-shell";
import lightbulb from "@/assets/lightbulb-hand.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — SnapLern, l'IA qui rend l'apprentissage humain" },
      { name: "description", content: "Notre mission : transformer une simple image en chemin vers la maîtrise. L'équipe, les valeurs, la science derrière SnapLern." },
      { property: "og:title", content: "À propos — SnapLern" },
      { property: "og:description", content: "On veut que chaque étudiant apprenne 3× plus vite, sans burnout." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell fullBleed>
      <>
        {/* HERO */}
        <section className="px-5 sm:px-8 md:px-12 pt-10 sm:pt-14 pb-12 sm:pb-20 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#fef8e7] px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider text-slate-700 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a6c] animate-pulse" />
            Notre histoire
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6"
          >
            On croit qu'apprendre devrait être <span className="text-[#ff7a6c]">simple</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            SnapLern est né d'une frustration : on passait des heures à recopier des cours, créer des fiches, refaire des quiz. Et au final, on retenait à peine 40%. L'IA pouvait faire mieux. Alors on l'a construit.
          </motion.p>
        </section>

        {/* MISSION */}
        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <div className="relative bg-gradient-to-br from-[#d4f5c0] to-[#b8eaa0] rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 md:p-16 overflow-hidden">
            <motion.img
              src={lightbulb}
              alt=""
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -right-8 -bottom-12 w-[280px] opacity-90"
            />
            <div className="relative max-w-2xl">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-700">/ Notre mission</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-3 mb-6 leading-tight">
                Diviser par 3 le temps de révision. Multiplier par 2 la rétention.
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Chaque année, 2,9 millions d'étudiants français passent 8h/semaine à bachoter sans méthode. C'est 23 millions d'heures perdues. SnapLern rend ce temps inutile : l'IA fait le travail bête, tu te concentres sur la compréhension.
              </p>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <SectionLabel kicker="Nos valeurs" title="4 principes, zéro compromis" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { i: Heart, t: "Étudiant d'abord", d: "Aucun dark pattern. Pas de pub. Tes données t'appartiennent.", c: "bg-[#ffe4e0]" },
              { i: Compass, t: "Science cognitive", d: "Chaque feature est ancrée dans la recherche (Feynman, Ebbinghaus, SM-2).", c: "bg-[#fef8e7]" },
              { i: Lightbulb, t: "Apprendre, pas tricher", d: "On t'apprend à penser. Pas à recopier des réponses.", c: "bg-[#d4f5c0]" },
              { i: Users, t: "Accessible à tous", d: "Plan gratuit généreux. -50% pour les boursiers. Toujours.", c: "bg-[#e0e7ff]" },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${v.c} rounded-[24px] p-7`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
                  <v.i className="h-5 w-5 text-[#ff7a6c]" />
                </div>
                <div className="font-bold text-slate-900 text-lg mb-2">{v.t}</div>
                <div className="text-sm text-slate-600 leading-relaxed">{v.d}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* TIMELINE */}
        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <SectionLabel kicker="Notre histoire" title="De l'idée à 2 800 étudiants" />
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              { y: "Janvier 2025", t: "L'étincelle", d: "Trois étudiants de l'ENS frustrés par les apps de révision lancent un prototype en weekend." },
              { y: "Mars 2025", t: "Premier MVP", d: "200 testeurs sur 5 facultés. Rétention multipliée par 1,8 sur leurs premiers partiels." },
              { y: "Septembre 2025", t: "SnapLern v1", d: "Lancement public. Tuteur Socratique et mode examen 24h." },
              { y: "2026", t: "SnapLern aujourd'hui", d: "2 847 étudiants actifs, 187 000 images analysées, 4,9/5 sur l'App Store." },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5 items-start"
              >
                <div className="w-24 shrink-0 text-right">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#ff7a6c]">{s.y}</div>
                </div>
                <div className="w-3 h-3 rounded-full bg-[#ff7a6c] mt-1.5 shrink-0 ring-4 ring-[#ff7a6c]/20" />
                <div className="flex-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="font-bold text-slate-900 mb-1">{s.t}</div>
                  <div className="text-sm text-slate-600">{s.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* QUOTE */}
        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <div className="bg-slate-900 rounded-[24px] sm:rounded-[28px] p-8 sm:p-12 md:p-16 relative overflow-hidden text-center">
            <Quote className="absolute top-8 left-8 h-20 w-20 text-white/5" />
            <p className="text-2xl md:text-3xl font-display font-bold text-white max-w-3xl mx-auto leading-tight italic">
              "Si tu peux pas l'expliquer simplement, c'est que tu l'as pas compris."
            </p>
            <div className="mt-6 text-[#ff9a8a] font-mono text-sm">— Richard Feynman, prix Nobel de physique</div>
            <p className="text-slate-300 mt-8 max-w-xl mx-auto">C'est exactement ce que SnapLern fait pour toi : reformuler, simplifier, vérifier que tu as vraiment compris.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 mt-8 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4">
              Rejoindre l'aventure <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </>
    </SiteShell>
  );
}