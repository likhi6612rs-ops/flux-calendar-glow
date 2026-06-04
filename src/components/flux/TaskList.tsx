import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X, Check } from "lucide-react";
import { useFlux } from "@/lib/flux-store";
import { isToday, shortLabel } from "@/lib/flux-date";
import { cn } from "@/lib/utils";

export function TaskList() {
  const { tasks, addTask, toggleTask, deleteTask, selectedDate } = useFlux();
  const [value, setValue] = useState("");

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addTask(value);
    setValue("");
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

      <form onSubmit={onSubmit} className="relative mb-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type an objective, press Enter…"
          className="w-full rounded-xl border border-input bg-card/60 py-3 pl-4 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Add task"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-90"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.18 }}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-3"
            >
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                  task.completed
                    ? "border-transparent bg-success text-success-foreground"
                    : "border-muted-foreground/40 hover:border-primary",
                )}
              >
                {task.completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm transition-colors",
                  task.completed && "text-muted-foreground line-through",
                )}
              >
                {task.text}
              </span>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                aria-label="Delete task"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {total === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground/60">
          A frictionless space. Add, check, and delete as your day shifts.
        </p>
      )}
    </section>
  );
}
