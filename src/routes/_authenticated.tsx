import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkOnboarding = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mounted) return false;
      if (!data?.onboarding_completed && window.location.pathname !== "/onboarding") {
        navigate({ to: "/onboarding" });
        return false;
      }
      return true;
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (!session) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) navigate({ to: "/auth" });
      else {
        checkOnboarding(data.session.user.id).then((ok) => {
          if (mounted && ok) setChecking(false);
        });
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return <Outlet />;
}