import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { GraduationCap, BookOpen, Briefcase, Microscope, ArrowRight, Star } from "lucide-react";
import { SiteShell, SectionLabel } from "@/components/site-shell";
import studentPointing from "@/assets/student-pointing.png";

export const Route = createFileRoute("/for-who")({
  head: () => ({
    meta: [
      { title: "Pour qui — SnapLern s'adapte à ton niveau" },
      { name: "description", content: "Lycéens, prépa, fac, médecine, ingé, droit. SnapLern suit le programme officiel et s'adapte à ton niveau d'études." },
      { property: "og:title", content: "Pour qui ? — SnapLern" },
      { property: "og:description", content: "Du lycée au doctorat, SnapLern booste ta façon d'apprendre." },
    ],
  }),
  component: ForWhoPage,
});

const personas = [
  {
    tag: "Lycée",
    title: "Lycéens",
    desc: "Bac, brevet, contrôles. SnapLern transforme tes cours en quiz adaptés au programme officiel de l'Éducation Nationale.",
    perks: ["Programme Bac 2026", "Annales et corrigés IA", "Préparation orale du Bac", "App mobile pour réviser dans le métro"],
    bg: "bg-[#ffe4e0]",
    icon: BookOpen,
    stat: "+3,2 pts",
    statLabel: "moyenne au Bac",
  },
  {
    tag: "Prépa",
    title: "Prépas CPGE",
    desc: "MP, PC, BCPST, ECG. Le tuteur Socratique te prépare aux khôlles et concours. Mode examen synchronisé avec ton calendrier de DS.",
    perks: ["Corrections de copies type", "Méthodo concours intégrée", "Khôlles simulées par IA", "Forum entre khâgneux"],
    bg: "bg-[#e0e7ff]",
    icon: Microscope,
    stat: "1ère étoile",
    statLabel: "au concours en moyenne",
  },
  {
    tag: "Université",
    title: "Fac & Licence",
    desc: "Médecine, droit, sciences, lettres. Importe tes polycopiés, schémas d'amphi, fiches de TD. SnapLern génère ton cours en clair.",
    perks: ["Reconnaissance polycopiés", "Mode partiels 24h", "Bibliographie suggérée", "Flashcards de définitions"],
    bg: "bg-[#d4f5c0]",
    icon: GraduationCap,
    stat: "12 → 16",
    statLabel: "moyenne L1 médecine",
  },
  {
    tag: "Pro",
    title: "Reconversion & Concours",
    desc: "Concours admin, certifs pro, formations continues. Apprends vite, retiens longtemps. Idéal entre boulot et révisions.",
    perks: ["Suivi temps réel", "Sessions 15 min/jour", "Préparation entretiens", "Certifs LinkedIn"],
    bg: "bg-[#fef8e7]",
    icon: Briefcase,
    stat: "78%",
    statLabel: "réussite aux concours",
  },
];

function ForWhoPage() {
  return (
    <SiteShell fullBleed>
      <>
        <section className="px-5 sm:px-8 md:px-12 pt-10 sm:pt-14 pb-10 sm:pb-14 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6 max-w-4xl mx-auto"
          >
            SnapLern s'adapte à <span className="text-[#ff7a6c]">toi</span>. Pas l'inverse.
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Que tu prépares le Bac, médecine, un concours ou une reconversion — l'IA calibre son niveau et son vocabulaire à ton profil.</p>
        </section>

        {personas.map((p, i) => (
          <section key={i} className="px-5 sm:px-8 md:px-12 pb-8 sm:pb-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`${p.bg} rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 md:p-12 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center relative overflow-hidden`}
            >
              <div>
                <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-slate-700 mb-4">
                  <p.icon className="h-3.5 w-3.5" />
                  {p.tag}
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4">{p.title}</h2>
                <p className="text-slate-700 leading-relaxed mb-6">{p.desc}</p>
                <ul className="grid grid-cols-2 gap-2 mb-6">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a6c]" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-full px-6 py-3 font-semibold text-sm hover:bg-slate-800 transition">
                  Essayer mon parcours <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="bg-white rounded-3xl p-8 shadow-2xl text-center"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Résultat moyen</div>
                  <div className="text-6xl font-black font-display text-[#ff7a6c]">{p.stat}</div>
                  <div className="text-sm text-slate-600 mt-2">{p.statLabel}</div>
                  <div className="flex justify-center mt-4">
                    {[...Array(5)].map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-[#ff9a3c] text-[#ff9a3c]" />
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </section>
        ))}

        {/* CTA */}
        <section className="px-5 sm:px-8 md:px-12 pb-10 sm:pb-16">
          <div className="bg-gradient-to-br from-[#d4f5c0] to-[#b8eaa0] rounded-[24px] sm:rounded-[28px] p-8 sm:p-12 md:p-16 text-center relative overflow-hidden">
            <img src={studentPointing} className="absolute -left-8 -bottom-8 w-[200px] opacity-90" alt="" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">Quel que soit ton niveau, SnapLern est prêt.</h2>
              <p className="text-slate-700 mb-8">Indique ton parcours à l'inscription — l'IA s'adapte en 2 questions.</p>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4 shadow-2xl">
                Démarrer mon parcours <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </>
    </SiteShell>
  );
}