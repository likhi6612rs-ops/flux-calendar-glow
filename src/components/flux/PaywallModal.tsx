import { AnimatePresence, motion } from "motion/react";
import { Check, Crown, Sparkles, X } from "lucide-react";
import {
  usePremium,
  PREMIUM_PERKS,
  PREMIUM_PRICE,
  PREMIUM_CYCLE,
} from "@/lib/premium";

export function PaywallModal() {
  const { paywallFeature, closePaywall, upgrade } = usePremium();
  const open = paywallFeature !== null;

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
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/70 p-7 shadow-glow backdrop-blur-2xl"
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

            <div className="relative">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
                <Crown className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
                Flux Premium
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                Unlock {paywallFeature}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Go beyond the basics. Premium turns Flux into a complete focus
                operating system.
              </p>

              <ul className="mt-5 space-y-3">
                {PREMIUM_PERKS.map((perk) => (
                  <li key={perk.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-glow">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-tight">
                        {perk.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {perk.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-end justify-between rounded-2xl border border-white/10 bg-background/40 px-4 py-3">
                <div>
                  <span className="text-3xl font-extrabold tracking-tight">
                    {PREMIUM_PRICE}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    / {PREMIUM_CYCLE}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Cancel anytime
                </span>
              </div>

              <button
                type="button"
                onClick={upgrade}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Go Premium
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Demo checkout — no card is charged.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
