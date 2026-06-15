import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { SiteShell, SectionLabel } from "@/components/site-shell";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Matières — Toutes celles couvertes par SnapLern" },
      { name: "description", content: "Maths, physique, médecine, droit, code, langues, histoire. 48 matières et 580 sous-domaines couverts." },
      { property: "og:title", content: "Toutes les matières — SnapLern" },
      { property: "og:description", content: "Du primaire au doctorat. 48 matières, 580 sous-domaines." },
    ],
  }),
  component: SubjectsPage,
});

const SUBJECTS = [
  { cat: "Sciences", c: "bg-[#d4f5c0]", e: "🧪", items: ["Mathématiques", "Physique", "Chimie", "Biologie", "Sciences de l'ingénieur", "Statistiques"] },
  { cat: "Médecine & Santé", c: "bg-[#ffe4e0]", e: "🧬", items: ["Anatomie", "Physiologie", "Pharmacologie", "PASS / LAS", "Internat", "Kiné"] },
  { cat: "Lettres & Sciences Humaines", c: "bg-[#fef8e7]", e: "📜", items: ["Histoire", "Géographie", "Philosophie", "Littérature", "Sociologie", "Psycho"] },
  { cat: "Droit & Économie", c: "bg-[#fce7f3]", e: "⚖️", items: ["Droit civil", "Droit pénal", "Économie", "Gestion", "Comptabilité", "Marketing"] },
  { cat: "Tech & Code", c: "bg-[#cffafe]", e: "{ }", items: ["JavaScript", "Python", "Algo & structures", "Bases de données", "Réseaux", "Cybersécurité"] },
  { cat: "Langues", c: "bg-[#e0e7ff]", e: "🗣", items: ["Anglais", "Espagnol", "Allemand", "Italien", "Chinois", "Japonais"] },
  { cat: "Arts", c: "bg-[#fef3c7]", e: "🎨", items: ["Histoire de l'art", "Musique", "Cinéma", "Design", "Architecture", "Théâtre"] },
  { cat: "Concours & Certifs", c: "bg-[#dcfce7]", e: "🏆", items: ["TOEIC / TOEFL", "Concours admin", "Permis", "Code de la route", "AWS / Azure", "Google Ads"] },
];

function SubjectsPage() {
  const [q, setQ] = useState("");
  const filtered = SUBJECTS.map((cat) => ({
    ...cat,
    items: cat.items.filter((it) => it.toLowerCase().includes(q.toLowerCase())),
  })).filter((cat) => cat.items.length > 0);

  return (
    <SiteShell fullBleed>
      <>
        <section className="px-5 sm:px-8 md:px-12 pt-10 sm:pt-14 pb-8 sm:pb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6"
          >
            48 matières. <span className="text-[#ff7a6c]">580 sous-domaines.</span>
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">Si tu peux le photographier, SnapLern peut te l'expliquer. Du primaire au doctorat.</p>

          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cherche ta matière…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full bg-white border-2 border-slate-200 focus:border-[#ff7a6c] outline-none text-sm font-medium shadow-sm"
            />
          </div>
        </section>

        <section className="px-5 sm:px-8 md:px-12 pb-12 sm:pb-20">
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((cat, i) => (
              <motion.div
                key={cat.cat}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`${cat.c} rounded-[28px] p-8 relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-500">/ {String(i + 1).padStart(2, "0")}</div>
                    <h2 className="text-2xl font-black text-slate-900">{cat.cat}</h2>
                  </div>
                  <div className="text-5xl font-display font-black opacity-80">{cat.e}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {cat.items.map((it) => (
                    <Link
                      key={it}
                      to="/auth"
                      className="bg-white/70 backdrop-blur-sm hover:bg-white rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition flex items-center justify-between group"
                    >
                      <span>{it}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🤔</div>
              <p className="text-slate-500">Aucune matière trouvée pour "{q}".<br />Demande-nous de l'ajouter — on le fait en 48h.</p>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="px-5 sm:px-8 md:px-12 pb-10 sm:pb-16">
          <div className="bg-slate-900 rounded-[24px] sm:rounded-[28px] p-8 sm:p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full bg-[#a3d97a]/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#ff7a6c]/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Ta matière n'est pas dans la liste ?</h2>
              <p className="text-slate-300 mb-8 max-w-lg mx-auto">Photographie ton cours quand même. L'IA généraliste de SnapLern comprend 99% des contenus académiques.</p>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-8 py-4 shadow-2xl">
                Tester sur ton cours <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </>
    </SiteShell>
  );
}