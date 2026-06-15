import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Throws if the caller is not an admin. Use at the top of every admin server fn.
 */
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Vérification du rôle impossible");
  if (data !== true) throw new Error("Accès réservé aux administrateurs");
}

/* ---------- Overview ---------- */

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [
      { data: profiles },
      { data: subs },
      { data: roles },
      { count: sessionsCount },
      { count: oracleCount },
      { count: flashcardsCount },
      { count: quizCount },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "user_id, display_name, plan, trial_ends_at, stripe_customer_id, monthly_uploads_count, daily_oracle_count, school, study_level, created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("subscriptions")
        .select(
          "user_id, status, current_period_end, cancel_at_period_end, environment, stripe_subscription_id",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("learning_sessions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("oracle_chats").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("flashcards").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("quiz_attempts").select("*", { count: "exact", head: true }),
    ]);

    // Fetch emails via admin auth API.
    const emailsByUser: Record<string, string> = {};
    let page = 1;
    // Limit to 1000 users to keep this snappy. Most apps are well under.
    while (page <= 10) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error) break;
      for (const u of data.users) {
        if (u.email) emailsByUser[u.id] = u.email;
      }
      if (data.users.length < 100) break;
      page += 1;
    }

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    const subsByUser = new Map<string, typeof subs extends (infer U)[] | null ? U : never>();
    for (const s of subs ?? []) {
      if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, s as never);
    }

    const users = (profiles ?? []).map((p) => ({
      userId: p.user_id,
      email: emailsByUser[p.user_id] ?? null,
      displayName: p.display_name,
      plan: p.plan,
      trialEndsAt: p.trial_ends_at,
      stripeCustomerId: p.stripe_customer_id,
      monthlyUploads: p.monthly_uploads_count,
      dailyOracle: p.daily_oracle_count,
      school: p.school,
      studyLevel: p.study_level,
      createdAt: p.created_at,
      roles: rolesByUser.get(p.user_id) ?? [],
      subscription: subsByUser.get(p.user_id) ?? null,
    }));

    return {
      stats: {
        users: users.length,
        admins: users.filter((u) => u.roles.includes("admin")).length,
        pro: users.filter((u) => u.plan === "pro" || u.plan === "trial").length,
        sessions: sessionsCount ?? 0,
        oracleChats: oracleCount ?? 0,
        flashcards: flashcardsCount ?? 0,
        quizzes: quizCount ?? 0,
      },
      users,
    };
  });

/* ---------- Role management ---------- */

const RoleInput = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["admin", "moderator", "user"]),
});

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RoleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.targetUserId, role: data.role },
        { onConflict: "user_id,role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RoleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Prevent admin from removing their own admin role (lock-out safety).
    if (data.role === "admin" && data.targetUserId === context.userId) {
      throw new Error("Tu ne peux pas révoquer ton propre rôle admin");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.targetUserId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Plan override ---------- */

const SetPlanInput = z.object({
  targetUserId: z.string().uuid(),
  plan: z.enum(["free", "trial", "pro"]),
  trialDays: z.number().int().min(0).max(365).optional(),
});

export const setUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetPlanInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const trialEndsAt =
      data.plan === "trial" && data.trialDays
        ? new Date(Date.now() + data.trialDays * 86_400_000).toISOString()
        : data.plan === "trial"
          ? new Date(Date.now() + 7 * 86_400_000).toISOString()
          : null;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan, trial_ends_at: trialEndsAt })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Quota reset ---------- */

export const resetUserQuotas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ monthly_uploads_count: 0, daily_oracle_count: 0 })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Delete user ---------- */

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("Tu ne peux pas supprimer ton propre compte ici");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Caller self-check ---------- */

export const checkIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });
