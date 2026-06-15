import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import {
  Sparkles, Plus, Settings, HelpCircle, Crown, LogOut,
  Compass, Library, Bot, Hammer, LineChart, ScrollText,
  Menu, Shield, Calculator, Home, BookOpen, User, Network, Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getBillingStatus } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const APP_NAV = [
  { to: "/app", label: "Constellation", icon: Compass, hint: "vue d'ensemble" },
  { to: "/codex", label: "Codex", icon: Library, hint: "bibliothèque" },
  { to: "/oracle", label: "Oracle", icon: Bot, hint: "assistant IA", badge: "IA" },
  { to: "/solver", label: "Résolveur", icon: Calculator, hint: "résous un exo", badge: "NEW" },
  { to: "/mindmaps", label: "Mindmaps", icon: Network, hint: "cartes mentales", badge: "NEW" },
  { to: "/exams", label: "Examens", icon: Timer, hint: "partiels chronos", badge: "NEW" },
  { to: "/forge", label: "Forge", icon: Hammer, hint: "révision active" },
  { to: "/trajectoire", label: "Trajectoire", icon: LineChart, hint: "analytics" },
  { to: "/memoire", label: "Mémoire", icon: ScrollText, hint: "journal" },
] as const;

export function AppSidebar({ onNew, onNavigate }: { onNew?: () => void; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkIsAdmin()
      .then((r) => { if (mounted) setIsAdmin(r.isAdmin); })
      .catch(() => {});
    getBillingStatus({ data: { environment: getStripeEnvironment() } })
      .then((r) => { if (mounted) setIsPro(r.plan === "pro" || r.plan === "trial"); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <aside className="bg-[#fdfbf3] rounded-[28px] p-5 flex flex-col gap-5 h-full overflow-y-auto lg:rounded-none lg:p-6 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-black/5">
      <Link to="/app" onClick={onNavigate} className="flex items-center gap-2 px-2">
        <Logo variant="full" showTagline className="h-12 w-auto" />
      </Link>

      <Link
        to="/new"
        onClick={() => { onNew?.(); onNavigate?.(); }}
        className="group flex items-center justify-between gap-2 bg-slate-900 hover:bg-[#ff7a6c] text-white rounded-2xl px-4 py-3 transition-all"
      >
        <span className="flex items-center gap-2 font-bold text-sm">
          <Plus className="h-4 w-4" /> Nouveau parcours
        </span>
        <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘N</kbd>
      </Link>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 mb-2">Univers SnapLern</div>
        <nav className="space-y-1">
          {APP_NAV.map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={onNavigate}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? "text-[#ff7a6c]" : ""}`} />
                  <span className="flex flex-col leading-tight">
                    <span>{n.label}</span>
                    <span className="text-[10px] font-mono font-normal text-slate-400 normal-case">{n.hint}</span>
                  </span>
                </span>
                {"badge" in n && n.badge && (
                  <span className="text-[10px] font-mono bg-[#fff5f3] text-[#ff7a6c] px-1.5 py-0.5 rounded-full font-bold">
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-2">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-[#ff7a6c]"
          >
            <Shield className="h-4 w-4" /> Admin
          </Link>
        )}
        <Link
          to="/settings"
          onClick={onNavigate}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white/60"
        >
          <Settings className="h-4 w-4" /> Paramètres
        </Link>
        <Link
          to="/pricing"
          onClick={onNavigate}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white/60"
        >
          <HelpCircle className="h-4 w-4" /> Centre d'aide
        </Link>

        {!isPro && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#2a1a18] to-[#ff6b5a] p-4 text-white">
            <motion.div
              className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <Crown className="h-5 w-5 mb-2" />
            <div className="text-sm font-black">SnapLern Aura</div>
            <div className="text-[11px] text-white/70 mt-0.5">PDF illimités · Oracle prioritaire</div>
            <Link
              to="/pricing"
              onClick={onNavigate}
              className="mt-3 block text-center bg-white text-slate-900 text-xs font-bold rounded-full py-1.5 hover:scale-[1.02] transition-transform"
            >
              Activer →
            </Link>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white/60"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

/**
 * MobileAppBar — visible only on < lg. Logo + new + menu trigger.
 * Use inside any authenticated route that does NOT use <AppShell>.
 */
export function MobileAppBar({ onNew, onMenu }: { onNew?: () => void; onMenu: () => void }) {
  return (
    <div className="lg:hidden px-4 sm:px-5 pt-4 sm:pt-5 pb-3 flex items-center justify-between">
      <Link to="/app" className="flex items-center gap-2 pl-1">
        <Logo variant="compact" className="h-8 w-auto" />
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          to="/new"
          onClick={onNew}
          aria-label="Nouveau parcours"
          className="bg-slate-900 hover:bg-[#ff7a6c] text-white rounded-full p-2.5 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </Link>
        <button
          onClick={onMenu}
          aria-label="Ouvrir le menu"
          className="bg-white border border-slate-200 rounded-full p-2.5 text-slate-700"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * MobileDrawer — slide-in panel that hosts <AppSidebar> on small screens.
 */
export function MobileDrawer({
  open,
  onClose,
  onNew,
}: {
  open: boolean;
  onClose: () => void;
  onNew?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.6, right: 0 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80 || info.velocity.x < -400) onClose();
            }}
            className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[88vw] lg:hidden touch-pan-y shadow-2xl"
          >
            <div className="relative h-full">
              <AppSidebar onNew={onNew} onNavigate={onClose} />
              {/* Drag handle — tirer vers la gauche pour fermer */}
              <div className="pointer-events-none absolute inset-y-0 -right-1 flex items-center">
                <div className="w-1 h-16 rounded-full bg-slate-300/70" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * MobileBottomNav — fixed bottom bar on small screens.
 */
export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/app", label: "Accueil", icon: Home, match: (p: string) => p === "/app" },
    { to: "/codex", label: "Parcours", icon: BookOpen, match: (p: string) => p === "/codex" },
    { to: "/solver", label: "Solver", icon: Calculator, match: (p: string) => p.startsWith("/solver") },
    { to: "/profile", label: "Profil", icon: User, match: (p: string) => p === "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = item.match(path);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                active ? "text-[#ff7a6c]" : "text-slate-400"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ff7a6c]" />
                )}
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-[#ff7a6c]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  children,
  onNew,
}: {
  children: React.ReactNode;
  onNew?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a]">
      <div className="w-full p-0 sm:p-3 md:p-4 lg:p-0">
        <div className="grid min-h-screen lg:min-h-screen lg:grid-cols-[290px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <AppSidebar onNew={onNew} />
          </div>
          <div className="bg-[#fdfbf3] rounded-none text-slate-900 w-full overflow-hidden min-h-screen lg:min-h-screen flex flex-col">
            <MobileAppBar onNew={onNew} onMenu={() => setOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden lg:p-8 xl:p-10 pb-20 lg:pb-8">
              {children}
            </main>
          </div>
        </div>
        <MobileDrawer open={open} onClose={() => setOpen(false)} onNew={onNew} />
        <MobileBottomNav />
      </div>
    </div>
  );
}