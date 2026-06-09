import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { usePremium } from "@/lib/premium";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Blocks unverified accounts from the app canvas until they enter the 6-digit
 * verification code. The admin account is always considered verified.
 *
 * NOTE: no external email provider is configured, so the code is generated
 * client-side and surfaced in a demo banner. Swap this for a real OTP email
 * later without changing the gate.
 */
export function VerificationGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { emailVerified, loadingProfile, isAdmin, markEmailVerified } =
    usePremium();
  const [code, setCode] = useState(generateCode);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const resend = useCallback(() => {
    const next = generateCode();
    setCode(next);
    setEntry("");
    setError("");
    toast.success("A new verification code was generated.");
  }, []);

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (emailVerified || isAdmin) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (entry.trim() !== code) {
      setError("That code doesn't match. Check the banner and try again.");
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);
      if (upErr) throw upErr;
      markEmailVerified();
      toast.success("Email verified — welcome to Flux ✨");
    } catch {
      toast.error("Couldn't verify right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <MailCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-foreground">{user?.email}</span>.
            Enter it below to unlock your dashboard.
          </p>
        </div>

        {/* Demo banner — replace with a real OTP email later */}
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm">
          <p className="text-xs uppercase tracking-wide text-primary-glow">
            Demo mode
          </p>
          <p className="mt-1 font-mono text-lg font-bold tracking-[0.4em]">
            {code}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={entry}
            onChange={(e) =>
              setEntry(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            placeholder="••••••"
            aria-label="6 digit verification code"
            className="w-full rounded-xl border border-input bg-card/60 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] outline-none transition-colors focus:border-primary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Verify & continue
          </button>
        </form>

        <button
          onClick={resend}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Didn't get it? Resend code
        </button>
      </motion.div>
    </div>
  );
}
