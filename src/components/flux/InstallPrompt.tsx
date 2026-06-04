import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "flux:install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-primary/40 bg-popover/95 p-4 shadow-glow backdrop-blur-xl"
          style={{ ["--glow-color" as string]: "oklch(0.63 0.13 295 / 45%)" }}
        >
          <div className="flex items-center gap-3">
            <img
              src={iconMeta.url}
              alt="Flux"
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">
                Install Digital Nervous System App
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Add Flux to your Home Screen
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={install}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Download className="h-4 w-4" /> Install to Home Screen
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
