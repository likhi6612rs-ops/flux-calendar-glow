import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X, Check, Sparkles, Loader2, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useFlux, SPAN_OPTIONS, type TaskSpan } from "@/lib/flux-store";
import { isToday, shortLabel } from "@/lib/flux-date";
import { usePremium } from "@/lib/premium";
import { breakDownTask } from "@/lib/ai.functions";
import { PremiumBadge } from "./PremiumBadge";
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
  } = useFlux();
  const { guard } = usePremium();
  const runBreakdown = useServerFn(breakDownTask);

  const [value, setValue] = useState("");
  const [span, setSpan] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const [breakdownFor, setBreakdownFor] = useState<TaskSpan | null>(null);
  const [subtasks, setSubtasks] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const tasks = tasksForDate(selectedDate);
  const completed = tasks.filter((t) => isCompleted(t.id, selectedDate)).length;
  const total = tasks.length;
  const allDone = total > 0 && completed === total;

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addTask(value, Number(span));
    setValue("");
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditValue(text);
  };

  const commitEdit = () => {
    if (editingId) editTask(editingId, editValue);
    setEditingId(null);
  };

  const openBreakdown = (task: TaskSpan) => {
    guard("AI Task Breakdown", async () => {
      setBreakdownFor(task);
      setSubtasks(null);
      setLoading(true);
      try {
        const res = await runBreakdown({ data: { task: task.text } });
        setSubtasks(res.subtasks);
      } catch (err) {
        const msg = String(err);
        if (msg.includes("429"))
          toast.error("AI is busy — try again in a moment.");
        else if (msg.includes("402"))
          toast.error("AI credits exhausted. Add credits to continue.");
        else toast.error("Couldn't break down this task.");
        setBreakdownFor(null);
      } finally {
        setLoading(false);
      }
    });
  };

  const addAll = async () => {
    if (!subtasks) return;
    for (const s of subtasks) await addTask(s, 1);
    toast.success(`Added ${subtasks.length} steps`);
    setBreakdownFor(null);
    setSubtasks(null);
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
            const multi = task.span_days > 1;
            return (
              <motion.li
                key={task.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.18 }}
                className="group flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-3"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id, selectedDate)}
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                    done
                      ? "border-transparent bg-success text-success-foreground"
                      : "border-muted-foreground/40 hover:border-primary",
                  )}
                >
                  {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>

                {editingId === task.id ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-primary bg-background px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => startEdit(task.id, task.text)}
                    onClick={() => startEdit(task.id, task.text)}
                    className={cn(
                      "flex-1 cursor-text text-left text-sm transition-colors",
                      done && "text-muted-foreground line-through",
                    )}
                    title="Click to edit"
                  >
                    {task.text}
                    {multi && (
                      <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-glow">
                        {task.span_days}d
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openBreakdown(task)}
                  aria-label="Break it down with AI"
                  title="✨ Break it down (Premium)"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-primary-glow/70 transition-colors hover:bg-primary/15 hover:text-primary-glow"
                >
                  <Sparkles className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task span"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.li>
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
        {breakdownFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBreakdownFor(null)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-md sm:items-center"
          >
            <motion.div
              initial={{ scale: 0.92, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-card/70 p-6 shadow-glow backdrop-blur-2xl"
              style={{ ["--glow-color" as string]: "oklch(0.74 0.12 300 / 35%)" }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-glow">
                    <Wand2 className="h-3.5 w-3.5" /> AI Breakdown
                    <PremiumBadge />
                  </p>
                  <h3 className="mt-1 text-base font-bold leading-tight">
                    {breakdownFor.text}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBreakdownFor(null)}
                  aria-label="Close"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Splitting into
                  steps…
                </div>
              )}

              {subtasks && (
                <>
                  <ol className="space-y-2">
                    {subtasks.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary-glow">
                          {i + 1}
                        </span>
                        {s}
                      </motion.li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={addAll}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-glow py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} /> Add all as tasks
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
