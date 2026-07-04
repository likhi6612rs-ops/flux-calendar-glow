import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Sparkles, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "flux:pwa-install-dismissed-at";
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function dismissedRecently(): boolean {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_WINDOW_MS;
}

/**
 * Lavender-themed modal that captures the browser's `beforeinstallprompt`
 * event and lets the user install the PWA. Rendered inside the authenticated
 * app, so it only appears after sign-in. If the user cancels, it stays hidden
 * for 24 hours.
 */
export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (dismissedRecently()) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

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

  const cancel = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={cancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Install Flux"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/40 bg-popover/95 p-6 shadow-glow backdrop-blur-xl"
            style={{ ["--glow-color" as string]: "oklch(0.63 0.13 295 / 45%)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
            />

            <button
              onClick={cancel}
              aria-label="Cancel"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="Flux app icon"
                width={52}
                height={52}
                className="h-13 w-13 rounded-2xl border border-primary/30"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Install app
                </p>
                <h2 className="text-lg font-bold leading-tight">
                  Add Flux to your device
                </h2>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Install Flux for instant access, full-screen focus, and your
              calendar right on your home screen — no browser tabs.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={install}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Install
              </button>
              <button
                onClick={cancel}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
