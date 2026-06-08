import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { Play, Pause, RotateCcw, X, Medal } from "lucide-react";
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
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [showMedal, setShowMedal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const r = 52;
  const circ = 2 * Math.PI * r;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">Focus Timer</h3>
        <span className="text-xs text-muted-foreground">
          {count === null ? "" : `${count} session${count === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="relative mx-auto mb-4 flex h-40 w-40 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="6"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.min(progress, 1))}
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />
        </svg>
        <span className="absolute font-mono text-3xl font-bold tabular-nums">
          {fmt(remaining)}
        </span>
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
          aria-label="Custom minutes"
          className="h-8 w-20 rounded-lg border border-input bg-card/60 px-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((x) => !x)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
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
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {showMedal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
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
              <h3 className="text-xl font-extrabold tracking-tight">
                Focus Medal
              </h3>
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
