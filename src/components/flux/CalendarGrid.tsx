import { motion } from "motion/react";
import { Check } from "lucide-react";
import { getMonthInfo, dayNumber, isToday } from "@/lib/flux-date";
import { useFlux } from "@/lib/flux-store";
import { cn } from "@/lib/utils";

export function CalendarGrid() {
  const month = getMonthInfo();
  const { selectedDate, setSelectedDate, isDayComplete, hasTasks, dayRatio } =
    useFlux();

  return (
    <section aria-label="Monthly consistency grid">
      <div
        className="grid gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {month.dayKeys.map((key, i) => {
          const complete = isDayComplete(key);
          const partial = !complete && hasTasks(key) && dayRatio(key) > 0;
          const selected = key === selectedDate;
          const today = isToday(key);

          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.012, duration: 0.25 }}
              whileTap={{ scale: 0.9 }}
              aria-pressed={selected}
              aria-label={`Day ${dayNumber(key)}${complete ? ", completed" : ""}`}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-xl border text-sm font-semibold transition-colors duration-300",
                complete
                  ? "border-transparent bg-success text-success-foreground glow-soft"
                  : "border-border bg-card/40 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                selected && !complete && "border-primary text-foreground",
                today && !complete && "ring-1 ring-primary/50",
              )}
            >
              {partial && (
                <span
                  className="absolute inset-0 rounded-xl bg-primary/15"
                  style={{ opacity: dayRatio(key) }}
                  aria-hidden
                />
              )}
              {complete ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : (
                <span className="relative">{dayNumber(key)}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
