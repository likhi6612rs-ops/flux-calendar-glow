import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Check } from "lucide-react";
import { useFlux, SPAN_OPTIONS, MAX_TRANSFERS, type TaskSpan } from "@/lib/flux-store";
import { isToday, isPast, shortLabel } from "@/lib/flux-date";
import { usePremium } from "@/lib/premium";
import { GeminiCoach } from "./GeminiCoach";
import { TaskItem } from "./TaskItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TaskList() {
  const {
    selectedDate,
    tasksForDate,
    isCompleted,
    addTask,
    toggleTask,
    editTask,
    deleteTask,
    shiftTask,
    isMine,
  } = useFlux();
  const { guard } = usePremium();

  const [value, setValue] = useState("");
  const [span, setSpan] = useState("1");

  const [coachFor, setCoachFor] = useState<TaskSpan | null>(null);

  const tasks = tasksForDate(selectedDate);
  const completed = tasks.filter((t) => isCompleted(t.id, selectedDate)).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addTask(value, Number(span));
    setValue("");
  };

  // ✨ Ask Gemini — strictly locked behind the Premium Ultra Pro tier.
  const askGemini = (task: TaskSpan) => {
    guard("AI Task Coach", "ultra", () => setCoachFor(task));
  };

  return (
    <section aria-label="Daily tasks" className="flex flex-col">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {isToday(selectedDate) ? "Today's Flow" : shortLabel(selectedDate)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {total === 0
              ? "Add your first objective"
              : `${completed} of ${total} complete`}
          </p>
        </div>
        {allDone && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-primary-glow"
          >
            <Check className="h-3 w-3" strokeWidth={3} /> Day cleared
          </motion.span>
        )}
      </div>

      <form onSubmit={onSubmit} className="mb-4 space-y-2">
        <div className="relative">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type an objective…"
            aria-label="New objective"
            className="w-full rounded-xl border border-input bg-card/60 py-3 pl-4 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
          />
          <button
            type="submit"
            aria-label="Add task"
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-90"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Repeats for</span>
          <Select value={span} onValueChange={setSpan}>
            <SelectTrigger
              aria-label="Repeat frequency"
              className="h-9 flex-1 rounded-xl border-input bg-card/60 text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPAN_OPTIONS.map((o) => (
                <SelectItem key={o.days} value={String(o.days)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => {
            const done = isCompleted(task.id, selectedDate);
            const owner = isMine(task.id);
            const rolloverEligible =
              owner &&
              !done &&
              task.status === "active" &&
              (isToday(selectedDate) || isPast(selectedDate)) &&
              task.transfer_count < MAX_TRANSFERS;

            return (
              <TaskItem
                key={task.id}
                task={task}
                selectedDate={selectedDate}
                done={done}
                owner={owner}
                rolloverEligible={rolloverEligible}
                onToggle={() => toggleTask(task.id, selectedDate)}
                onDelete={() => deleteTask(task.id)}
                onShift={() => shiftTask(task.id)}
                onAskGemini={askGemini}
                onEdit={editTask}
              />
            );
          })}
        </AnimatePresence>
      </ul>

      {total === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground/60">
          A frictionless space. Add an objective, pick its lifespan, and Flux
          clones it across every day automatically.
        </p>
      )}

      <AnimatePresence>
        {coachFor && (
          <GeminiCoach
            task={coachFor.text}
            onClose={() => setCoachFor(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
