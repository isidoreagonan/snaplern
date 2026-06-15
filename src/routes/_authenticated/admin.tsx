import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Shield, Crown, Trash2, RefreshCw, Search, Users, Sparkles,
  GraduationCap, Bot, Library, ScrollText, Loader2, ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { AppShell } from "@/components/app-sidebar";
import {
  checkIsAdmin,
  getAdminOverview,
  grantRole,
  revokeRole,
  setUserPlan,
  resetUserQuotas,
  deleteUser,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SnapLern" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkIsAdmin()
      .then((r) => {
        if (!r.isAdmin) {
          toast.error("Accès réservé aux administrateurs");
          navigate({ to: "/app" });
        } else setAuthorized(true);
      })
      .catch(() => navigate({ to: "/app" }));
  }, [navigate]);

  if (authorized !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Vérification…
      </div>
    );
  }

  return (
    <AppShell>
      <AdminDashboard />
    </AppShell>
  );
}

function AdminDashboard() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getAdminOverview(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "overview"] });

  const grant = useMutation({
    mutationFn: (vars: { targetUserId: string; role: "admin" | "moderator" | "user" }) =>
      grantRole({ data: vars }),
    onSuccess: () => { toast.success("Rôle attribué"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (vars: { targetUserId: string; role: "admin" | "moderator" | "user" }) =>
      revokeRole({ data: vars }),
    onSuccess: () => { toast.success("Rôle révoqué"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setPlan = useMutation({
    mutationFn: (vars: { targetUserId: string; plan: "free" | "trial" | "pro"; trialDays?: number }) =>
      setUserPlan({ data: vars }),
    onSuccess: () => { toast.success("Plan mis à jour"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetQuotas = useMutation({
    mutationFn: (vars: { targetUserId: string }) => resetUserQuotas({ data: vars }),
    onSuccess: () => { toast.success("Quotas réinitialisés"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (vars: { targetUserId: string }) => deleteUser({ data: vars }),
    onSuccess: () => { toast.success("Compte supprimé"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!data?.users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.school?.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement du panel admin…
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full">
            <Shield className="h-3 w-3" /> Administration
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-display mt-3">
            Contrôle total du site
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Gère les utilisateurs, les rôles, les abonnements et les quotas.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-400 rounded-full px-4 py-2 text-sm font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Utilisateurs" value={stats?.users ?? 0} accent="bg-slate-900" />
        <StatCard icon={Crown} label="Admins" value={stats?.admins ?? 0} accent="bg-[#ff7a6c]" />
        <StatCard icon={Sparkles} label="Pro / Trial" value={stats?.pro ?? 0} accent="bg-emerald-600" />
        <StatCard icon={GraduationCap} label="Sessions" value={stats?.sessions ?? 0} accent="bg-indigo-600" />
        <StatCard icon={Bot} label="Discussions Oracle" value={stats?.oracleChats ?? 0} accent="bg-violet-600" />
        <StatCard icon={Library} label="Flashcards" value={stats?.flashcards ?? 0} accent="bg-amber-600" />
        <StatCard icon={ScrollText} label="Quiz" value={stats?.quizzes ?? 0} accent="bg-rose-600" />
      </div>

      {/* Users table */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between gap-3 border-b border-slate-100">
          <h2 className="text-lg font-black font-display">Utilisateurs ({filtered.length})</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher email, nom, école…"
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((u) => (
            <UserRow
              key={u.userId}
              user={u}
              onGrantAdmin={() => grant.mutate({ targetUserId: u.userId, role: "admin" })}
              onRevokeAdmin={() => revoke.mutate({ targetUserId: u.userId, role: "admin" })}
              onSetPlan={(plan) => setPlan.mutate({ targetUserId: u.userId, plan })}
              onReset={() => resetQuotas.mutate({ targetUserId: u.userId })}
              onDelete={() => {
                if (confirm(`Supprimer définitivement ${u.email ?? u.userId} ?`)) {
                  remove.mutate({ targetUserId: u.userId });
                }
              }}
              pending={
                grant.isPending || revoke.isPending || setPlan.isPending ||
                resetQuotas.isPending || remove.isPending
              }
            />
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              Aucun utilisateur trouvé.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: typeof Users; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`${accent} text-white rounded-xl p-2.5`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{label}</div>
        <div className="text-xl font-black">{value.toLocaleString("fr-FR")}</div>
      </div>
    </div>
  );
}

type AdminUser = NonNullable<Awaited<ReturnType<typeof getAdminOverview>>>["users"][number];

function UserRow({
  user, onGrantAdmin, onRevokeAdmin, onSetPlan, onReset, onDelete, pending,
}: {
  user: AdminUser;
  onGrantAdmin: () => void;
  onRevokeAdmin: () => void;
  onSetPlan: (plan: "free" | "trial" | "pro") => void;
  onReset: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const isAdmin = user.roles.includes("admin");
  const planColor =
    user.plan === "pro" ? "bg-emerald-100 text-emerald-700"
    : user.plan === "trial" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";

  return (
    <div className="p-4 md:p-5 hover:bg-slate-50/60">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate">
              {user.displayName ?? user.email ?? user.userId.slice(0, 8)}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[10px] font-mono uppercase px-2 py-0.5 rounded-full">
                <Crown className="h-3 w-3" /> Admin
              </span>
            )}
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${planColor}`}>
              {user.plan}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {user.email ?? "—"} · {user.school ?? "Aucune école"} · {user.studyLevel ?? "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Uploads ce mois : <b>{user.monthlyUploads}</b> · Oracle aujourd'hui : <b>{user.dailyOracle}</b>
            {user.subscription && (
              <> · Stripe : {user.subscription.status} ({user.subscription.environment})</>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <select
            value={user.plan ?? "free"}
            disabled={pending}
            onChange={(e) => onSetPlan(e.target.value as "free" | "trial" | "pro")}
            className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            <option value="free">Free</option>
            <option value="trial">Trial 7j</option>
            <option value="pro">Pro</option>
          </select>

          {isAdmin ? (
            <button
              onClick={onRevokeAdmin}
              disabled={pending}
              className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-700 rounded-full px-3 py-1.5 text-xs font-bold"
            >
              <ShieldOff className="h-3 w-3" /> Retirer admin
            </button>
          ) : (
            <button
              onClick={onGrantAdmin}
              disabled={pending}
              className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white rounded-full px-3 py-1.5 text-xs font-bold"
            >
              <ShieldCheck className="h-3 w-3" /> Promouvoir admin
            </button>
          )}

          <button
            onClick={onReset}
            disabled={pending}
            className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-400 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            <RefreshCw className="h-3 w-3" /> Quotas
          </button>

          <button
            onClick={onDelete}
            disabled={pending}
            className="inline-flex items-center gap-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            <Trash2 className="h-3 w-3" /> Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}