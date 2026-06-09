import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Crown, Sparkles, X, Smartphone, ShieldCheck, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  usePremium,
  TIER_PLANS,
  planForTier,
  buildUpiUri,
  type TierPlan,
  type Tier,
} from "@/lib/premium";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Currency = "INR" | "USD";
type Step = "plans" | "verify" | "done";

const UTR_RE = /^\d{12}$/;

export function PaywallModal() {
  const { paywall, closePaywall, refreshProfile } = usePremium();
  const { user } = useAuth();
  const open = paywall !== null;

  const [currency, setCurrency] = useState<Currency>("INR");
  const [selected, setSelected] = useState<TierPlan>(TIER_PLANS[0]);
  const [step, setStep] = useState<Step>("plans");
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset + preselect the tier that triggered the paywall whenever it opens.
  useEffect(() => {
    if (paywall) {
      setSelected(planForTier(paywall.tier as Tier));
      setStep("plans");
      setUtr("");
      setError("");
    }
  }, [paywall]);

  const price = (p: TierPlan) =>
    currency === "INR" ? `₹${p.inr}` : `$${p.usd.toFixed(2)}`;

  const startPayment = () => {
    // Privacy-safe UPI deep link — opens the native intent picker on mobile
    // with the exact amount pre-filled (and non-editable in UPI apps).
    const uri = buildUpiUri(selected.inr, `Flux ${selected.name}`);
    window.location.href = uri;
    setStep("verify");
  };

  const submitUtr = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!UTR_RE.test(utr.trim())) {
      setError("Enter the exact 12-digit UPI reference (UTR) number.");
      return;
    }
    if (!user) {
      setError("You must be signed in to submit a payment.");
      return;
    }
    setBusy(true);
    try {
      const { error: reqError } = await supabase
        .from("subscription_requests")
        .insert({
          user_id: user.id,
          tier: selected.id,
          amount: selected.inr,
          currency: "INR",
          utr: utr.trim(),
          status: "pending",
        });
      if (reqError) throw reqError;
      refreshProfile();
      setStep("done");
    } catch {
      toast.error("Couldn't submit your payment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePaywall}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-md sm:items-center"
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-card/70 p-6 shadow-glow backdrop-blur-2xl sm:p-7"
            style={{ ["--glow-color" as string]: "oklch(0.74 0.12 300 / 45%)" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 60% 100% at 50% 0%, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)",
              }}
              aria-hidden
            />
            <button
              type="button"
              onClick={closePaywall}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ---------------- Plans ---------------- */}
            {step === "plans" && (
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
                  Unlock {paywall?.feature}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                  Choose your plan
                </h2>

                {/* Currency toggle */}
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-background/40 p-1 text-xs font-bold">
                  {(["INR", "USD"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "rounded-full px-4 py-1.5 transition-colors",
                        currency === c
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c === "INR" ? "₹ INR" : "$ USD"}
                    </button>
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {TIER_PLANS.map((plan) => {
                    const active = selected.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelected(plan)}
                        className={cn(
                          "block w-full rounded-2xl border p-4 text-left transition-all",
                          active
                            ? "border-primary bg-primary/10 shadow-glow"
                            : "border-white/10 bg-background/40 hover:border-primary/50",
                        )}
                        style={
                          active
                            ? { ["--glow-color" as string]: "oklch(0.74 0.12 300 / 30%)" }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-extrabold">
                              {plan.name}
                              {plan.id === "ultra" && (
                                <Crown className="h-3.5 w-3.5 text-amber-300" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {plan.tagline}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold tracking-tight">
                              {price(plan)}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              / month
                            </span>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {plan.features.map((f) => (
                            <li
                              key={f}
                              className="flex items-center gap-2 text-xs text-foreground/90"
                            >
                              <Check
                                className="h-3 w-3 shrink-0 text-primary-glow"
                                strokeWidth={3}
                              />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={startPayment}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  <Smartphone className="h-4 w-4" /> Buy Now · Pay ₹{selected.inr}{" "}
                  via UPI
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Opens your UPI app (GPay,
                  PhonePe, Paytm). No card stored, no phone number shared.
                </p>
              </div>
            )}

            {/* ---------------- UTR verification ---------------- */}
            {step === "verify" && (
              <form onSubmit={submitUtr} className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                  <ShieldCheck className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Confirm your payment
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid <span className="font-semibold text-foreground">₹{selected.inr}</span>{" "}
                  for <span className="font-semibold text-foreground">{selected.name}</span>?
                  Enter the 12-digit UPI Transaction Reference (UTR) from your
                  payment app so we can verify it.
                </p>

                <label className="mt-5 block text-xs font-semibold text-muted-foreground">
                  UPI Transaction Ref No. (UTR)
                </label>
                <input
                  value={utr}
                  onChange={(e) =>
                    setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                  inputMode="numeric"
                  placeholder="123456789012"
                  aria-label="12 digit UTR number"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-primary"
                />
                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit for verification
                </button>
                <button
                  type="button"
                  onClick={() => setStep("plans")}
                  className="mt-2 w-full py-1 text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back to plans
                </button>
              </form>
            )}

            {/* ---------------- Pending confirmation ---------------- */}
            {step === "done" && (
              <div className="relative py-2 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                  <Clock className="h-7 w-7 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Pending verification
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                  Thanks! Your <span className="font-semibold text-foreground">{selected.name}</span>{" "}
                  request is now under review. Your features unlock automatically
                  once an admin confirms your payment — usually within a few
                  hours.
                </p>
                <button
                  type="button"
                  onClick={closePaywall}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-bold transition-transform active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" /> Got it
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
