import { AnimatePresence, motion } from "motion/react";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

/**
 * Floating, non-intrusive "Install App" widget pinned to the right side of the
 * screen. Only appears when the app is not already installed, the browser has
 * offered an install prompt, and the user hasn't chosen "Maybe Later".
 */
export function PWAInstallPrompt() {
  const { canInstall, promptInstall, dismiss } = usePwaInstall();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed right-0 top-1/2 z-50 -translate-y-1/2"
        >
          <div className="flex flex-col items-end gap-2 rounded-l-2xl border border-r-0 border-primary/40 bg-popover/95 py-3 pl-4 pr-3 shadow-glow backdrop-blur-xl">
            <button
              onClick={promptInstall}
              aria-label="Install app"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Download className="h-4 w-4" /> Install App
            </button>
            <button
              onClick={dismiss}
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
