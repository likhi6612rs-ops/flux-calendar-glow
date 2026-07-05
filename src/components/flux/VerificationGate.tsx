import { useCallback, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Blocks accounts whose email has not been confirmed via the real
 * verification link sent by the backend. The admin account is always
 * considered verified.
 *
 * Verification is handled natively: on sign-up the backend emails a
 * confirmation link. Clicking it activates the account and returns the user
 * to the app with an authenticated session, landing them on the dashboard.
 */
export function VerificationGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const emailVerified = Boolean(user?.email_confirmed_at);

  const resend = useCallback(async () => {
    if (!user?.email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Verification email sent — check your inbox.");
    } catch {
      toast.error("Couldn't resend right now. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (emailVerified || isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
          <MailCheck className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Verify your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-semibold text-foreground">{user?.email}</span>.
          Open it to activate your account — you'll be taken straight to your
          dashboard.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={resend}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Resend verification email
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Already verified? Refresh
          </button>
        </div>
      </motion.div>
    </div>
  );
}
