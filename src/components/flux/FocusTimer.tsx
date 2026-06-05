import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { Timer, Play, Pause, RotateCcw, X, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "25m", seconds: 25 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "1h", seconds: 60 * 60 },
  { label: "2h", seconds: 120 * 60 },
];

const MEDAL_THRESHOLD = 5;

function fmt(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function FocusTimer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(25 * 60); // seconds
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [showMedal, setShowMedal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the user's completed-timer counter.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("timer_completion_count")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setCount(data?.timer_completion_count ?? 0));
  }, [user]);

  const onComplete = useCallback(async () => {
    setRunning(false);
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.4 },
      colors: ["#B39DDB", "#9575CD", "#7E57C2", "#ffffff"],
    });
    if (!user) return;
    const next = (count ?? 0) + 1;
    setCount(next);
    await supabase
      .from("profiles")
      .update({ timer_completion_count: next })
      .eq("id", user.id);
    if (next === MEDAL_THRESHOLD) setShowMedal(true);
  }, [user, count]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onComplete]);

  const setPreset = (seconds: number) => {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(duration);
  };

  const progress = duration > 0 ? 1 - remaining / duration : 0;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
          open
            ? "border-primary/50 bg-primary/10"
            : "border-border bg-card/40 hover:border-primary/40",
        )}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Timer className="h-4 w-4 text-primary" /> Focus Timer
        </span>
        <span className="text-xs text-muted-foreground">
          {count === null ? "" : `${count} session${count === 1 ? "" : "s"}`}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-border bg-card/40 p-4">
              <div className="mb-3 text-center">
                <div className="font-mono text-4xl font-bold tracking-tight tabular-nums">
                  {fmt(remaining)}
                </div>
                <div className="mx-auto mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPreset(p.seconds)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                      duration === p.seconds
                        ? "border-primary bg-primary/15 text-primary-glow"
                        : "border-border bg-card/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Custom (min)</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={Math.round(duration / 60)}
                  onChange={(e) => {
                    const mins = Math.max(1, Math.min(600, Number(e.target.value) || 1));
                    setPreset(mins * 60);
                  }}
                  className="h-8 w-20 rounded-lg border border-input bg-card/60 px-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  {running ? (
                    <>
                      <Pause className="h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Start
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset timer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMedal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
            onClick={() => setShowMedal(false)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-3xl border border-primary/50 bg-card p-7 text-center glow-soft"
            >
              <button
                type="button"
                onClick={() => setShowMedal(false)}
                aria-label="Close"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <motion.div
                initial={{ rotate: -15, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
              >
                <Medal className="h-10 w-10 text-primary-glow" />
              </motion.div>
              <h3 className="text-xl font-extrabold tracking-tight">Focus Medal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You've completed 5 focus sessions. Discipline unlocked — keep the
                deep work flowing.
              </p>
              <button
                type="button"
                onClick={() => setShowMedal(false)}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Claim badge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
