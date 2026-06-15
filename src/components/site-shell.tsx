import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/logo";

const NAV = [
  { to: "/", label: "SnapLern" },
  { to: "/about", label: "Manifeste" },
  { to: "/features", label: "Studio" },
  { to: "/for-who", label: "Tribu" },
  { to: "/subjects", label: "Univers" },
] as const;

export function SiteShell({ children, fullBleed = false }: { children: React.ReactNode; fullBleed?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className={fullBleed ? "w-full" : "mx-auto max-w-[1300px] p-0 sm:p-3 md:p-5"}>
        <div className={fullBleed ? "min-h-screen bg-[#fdfbf3] overflow-hidden text-slate-900 relative" : "min-h-screen bg-[#fdfbf3] rounded-none sm:rounded-[28px] overflow-hidden text-slate-900 relative"}>
          {/* NAV */}
          <nav className={fullBleed ? "flex items-center justify-between px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-5 sm:pt-7" : "flex items-center justify-between px-5 sm:px-8 md:px-12 pt-5 sm:pt-7"}>
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Logo variant="compact" className="h-9 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-9 text-[15px] text-slate-700">
              {NAV.map((n) => {
                const active = path === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`relative transition-colors ${active ? "text-slate-900 font-bold" : "hover:text-slate-900"}`}
                  >
                    {n.label}
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#ff7a6c]" />
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="hidden md:block">
              <Link
                to="/auth"
                className="inline-block rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-semibold px-6 py-2.5 shadow-[0_8px_24px_-8px_rgba(255,107,90,0.6)] hover:-translate-y-0.5 transition-all"
              >
                Connexion
              </Link>
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="md:hidden p-2.5 rounded-full bg-white border border-slate-200 text-slate-700"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>

          {children}

          {/* FOOTER */}
          <SiteFooter />
        </div>
      </div>
      {/* Mobile menu drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 inset-x-0 z-50 md:hidden bg-[#fdfbf3] rounded-none md:rounded-b-[28px] p-6 pt-7 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <Logo variant="compact" className="h-9 w-auto" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le menu"
                  className="p-2.5 rounded-full bg-white border border-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 mb-5">
                {NAV.map((n, i) => {
                  const active = path === n.to;
                  return (
                    <motion.div
                      key={n.to}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i }}
                    >
                      <Link
                        to={n.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between py-3.5 px-4 rounded-2xl text-lg font-bold transition ${
                          active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
                        }`}
                      >
                        <span>{n.label}</span>
                        <ArrowRight className={`h-4 w-4 ${active ? "text-[#ff7a6c]" : "text-slate-300"}`} />
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block w-full text-center rounded-full bg-gradient-to-r from-[#ff8a7a] to-[#ff6b5a] text-white font-bold py-3.5 shadow-lg"
              >
                Connexion
              </Link>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="px-6 md:px-12 pt-12 pb-8 border-t border-slate-200/60 mt-4">
      <div className="grid md:grid-cols-4 gap-8 mb-10">
        <div>
          <Logo variant="compact" className="h-9 w-auto mb-3" />
          <p className="text-sm text-slate-500 leading-relaxed">L'IA qui transforme tes images en parcours d'apprentissage. Pour les étudiants qui veulent vraiment retenir.</p>
        </div>
        {[
          { t: "Produit", l: [["/features", "Fonctionnalités"], ["/subjects", "Matières"], ["/for-who", "Pour qui"]] },
          { t: "Entreprise", l: [["/about", "À propos"], ["/about", "Notre mission"], ["/about", "Recrutement"]] },
          { t: "Compte", l: [["/auth", "Se connecter"], ["/auth", "Créer un compte"]] },
        ].map((col) => (
          <div key={col.t}>
            <div className="font-mono text-xs uppercase tracking-wider text-slate-400 mb-3">{col.t}</div>
            <ul className="space-y-2">
              {col.l.map(([to, lbl]) => (
                <li key={lbl}>
                  <Link to={to} className="text-sm text-slate-600 hover:text-[#ff7a6c]">{lbl}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500 pt-6 border-t border-slate-200/60">
        <div className="font-mono text-xs">© 2026 SnapLern · apprendre par l'image</div>
        <Link to="/auth" className="inline-flex items-center gap-1 text-[#ff7a6c] font-semibold hover:gap-2 transition-all">
          Commencer gratuitement <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </footer>
  );
}

/* Section title used across marketing pages */
export function SectionLabel({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-12">
      <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#ff7a6c]">/ {kicker}</span>
      <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-3 leading-tight">{title}</h2>
      {sub && <p className="text-slate-500 mt-3 max-w-md mx-auto">{sub}</p>}
    </div>
  );
}