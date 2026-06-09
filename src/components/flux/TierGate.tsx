import { motion } from "motion/react";
import { Lock, Sparkles } from "lucide-react";
import { usePremium, planForTier, type Tier } from "@/lib/premium";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Wraps a premium module. If the active tier doesn't meet `requiredTier`,
 * the children are blurred and a glassmorphism upgrade card is shown instead.
 */
export function TierGate({
  requiredTier,
  feature,
  title,
  description,
  children,
}: {
  requiredTier: Tier;
  feature: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { hasTier, openPaywall } = usePremium();
  const unlocked = hasTier(requiredTier);
  const plan = planForTier(requiredTier);

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none blur-md"
        aria-hidden
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "w-full max-w-xs rounded-3xl border border-white/10 bg-card/70 p-6 text-center shadow-glow backdrop-blur-2xl",
          )}
          style={{ ["--glow-color" as string]: "oklch(0.74 0.12 300 / 40%)" }}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 text-sm font-semibold">
            {plan.name} · ₹{plan.inr}
            <span className="text-muted-foreground"> / month</span>
          </p>
          <button
            type="button"
            onClick={() => openPaywall(feature, requiredTier)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Unlock {plan.name}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
