import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, Sparkles, X } from "lucide-react";

/** True when we must NOT run update logic (Lovable editor preview / iframe / dev). */
function isPreviewContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true; // inside an iframe
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

/** Extracts a stable signature of the deployed build from index.html. */
function signatureFromHtml(html: string): string {
  const matches = html.match(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g) ?? [];
  return Array.from(new Set(matches)).sort().join("|");
}

const POLL_MS = 60_000;

export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    if (isPreviewContext()) return;
    let active = true;

    const fetchSignature = async (): Promise<string | null> => {
      try {
        const res = await fetch(`/?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        return signatureFromHtml(await res.text());
      } catch {
        return null;
      }
    };

    fetchSignature().then((sig) => {
      if (active && sig) baseline.current = sig;
    });

    const id = window.setInterval(async () => {
      if (!baseline.current || !active) return;
      const sig = await fetchSignature();
      if (active && sig && sig !== baseline.current) {
        setReady(true);
      }
    }, POLL_MS);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const update = () => {
    // Hard reload to pick up the freshly deployed assets.
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {ready && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          role="status"
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-popover/90 p-3 pl-4 shadow-glow backdrop-blur-xl"
          style={{ ["--glow-color" as string]: "oklch(0.7 0.12 300 / 40%)" }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium leading-tight">
            A fresh update is ready to boost your focus.
          </p>
          <button
            type="button"
            onClick={update}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Update Now
          </button>
          <button
            type="button"
            onClick={() => setReady(false)}
            aria-label="Dismiss update"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
