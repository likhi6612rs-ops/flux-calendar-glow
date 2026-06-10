import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAppConfig } from "@/lib/app-config";

/**
 * Admin-driven update banner. When the administrator pushes a newer
 * `appVersion` from the Feature Control Panel, every connected client sees
 * this lavender banner and can reload to pick up the new modules/layout.
 */
export function FeatureUpdateBanner() {
  const { updateReady, applyUpdate } = useAppConfig();

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          role="status"
          className="fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3"
        >
          <div
            className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/25 via-popover/90 to-primary-glow/20 p-3 pl-4 shadow-glow backdrop-blur-xl"
            style={{ ["--glow-color" as string]: "oklch(0.7 0.13 300 / 45%)" }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">
              ✨ A brand new feature update is available!
              <span className="block text-xs font-normal text-muted-foreground">
                Click to apply updates and unlock new tools.
              </span>
            </p>
            <button
              type="button"
              onClick={applyUpdate}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-lg transition-transform active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Update Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
