import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFlux, type TaskSpan, type ProfileLite } from "@/lib/flux-store";
import { todayKey } from "@/lib/flux-date";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

interface Props {
  connector: ProfileLite;
  onClose: () => void;
  onSaved?: () => void;
}

type Step = 1 | 2 | 3;

/**
 * 3-step delegation wizard.
 *  1. Date window   — start + end
 *  2. Task mapping  — which of MY tasks this connector gets
 *  3. Confirmation  — writes rows to `active_contracts`
 */
export function DelegationWizard({ connector, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { tasks } = useFlux();
  const myTasks = useMemo<TaskSpan[]>(
    () => tasks.filter((t) => t.user_id === user?.id),
    [tasks, user?.id],
  );

  const today = todayKey();
  const [step, setStep] = useState<Step>(1);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myTasks;
    return myTasks.filter((t) => t.text.toLowerCase().includes(q));
  }, [myTasks, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const datesValid = startDate && endDate && endDate >= startDate;
  const canNext =
    step === 1 ? datesValid : step === 2 ? selected.size > 0 : true;

  const save = async () => {
    if (!user || !datesValid || selected.size === 0) return;
    setSaving(true);
    const rows = [...selected].map((task_id) => ({
      owner_id: user.id,
      connector_id: connector.id,
      task_id,
      start_date: startDate,
      end_date: endDate,
    }));
    const { error } = await supabase
      .from("active_contracts")
      .upsert(rows, { onConflict: "owner_id,connector_id,task_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Couldn't save contract.");
      return;
    }
    toast.success(
      `Contract signed — ${selected.size} task${selected.size === 1 ? "" : "s"} shared`,
    );
    onSaved?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Delegation wizard"
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-border/50 p-4">
            <Avatar
              name={connector.display_name || connector.full_name}
              email={connector.email}
              url={null}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {connector.display_name || connector.full_name || connector.email}
              </p>
              <p className="flex items-center gap-1 text-xs text-primary">
                <ShieldCheck className="h-3 w-3" />
                Delegation contract
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Stepper */}
          <ol className="flex items-center gap-1 border-b border-border/50 px-4 py-3 text-xs">
            {(
              [
                { n: 1, label: "Dates", icon: CalendarDays },
                { n: 2, label: "Tasks", icon: ListTodo },
                { n: 3, label: "Confirm", icon: Check },
              ] as const
            ).map((s, i) => {
              const Icon = s.icon;
              const active = step === s.n;
              const done = step > s.n;
              return (
                <li key={s.n} className="flex flex-1 items-center gap-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      active
                        ? "text-foreground"
                        : done
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < 2 && (
                    <span className="mx-1 h-px flex-1 bg-border/60" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the dates this contract is active. The connector will
                  only see the shared tasks between these dates.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                {!datesValid && (
                  <p className="text-xs text-destructive">
                    End date must be on or after start date.
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your tasks…"
                    className="w-full rounded-lg border border-input bg-background/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <ul>
                  {filtered.length === 0 ? (
                    <li className="py-10 text-center text-sm text-muted-foreground">
                      {myTasks.length === 0
                        ? "You don't have any tasks to share yet."
                        : "No tasks match that search."}
                    </li>
                  ) : (
                    filtered.map((t) => {
                      const active = selected.has(t.id);
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => toggle(t.id)}
                            className={cn(
                              "mb-1.5 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                              active
                                ? "border-primary/60 bg-primary/10"
                                : "border-border bg-card/40 hover:border-primary/40",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                active
                                  ? "border-transparent bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {active && (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              )}
                            </span>
                            <span className="flex-1 truncate text-sm">
                              {t.text}
                            </span>
                            {t.span_days > 1 && (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-glow">
                                {t.span_days}d
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
                  <p className="text-xs font-semibold text-primary">
                    Contract summary
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">
                      {connector.display_name ||
                        connector.full_name ||
                        connector.email}
                    </span>{" "}
                    will see{" "}
                    <span className="font-semibold">{selected.size}</span> task
                    {selected.size === 1 ? "" : "s"} between{" "}
                    <span className="font-semibold">{startDate}</span> and{" "}
                    <span className="font-semibold">{endDate}</span>.
                  </p>
                </div>
                <ul className="space-y-1">
                  {[...selected].map((id) => {
                    const t = myTasks.find((x) => x.id === id);
                    if (!t) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      >
                        <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                        <span className="truncate">{t.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between gap-2 border-t border-border/50 p-3">
            <button
              type="button"
              onClick={() => (step === 1 ? onClose() : setStep(((step - 1) as Step)))}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step < 3 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep(((step + 1) as Step))}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={save}
                disabled={saving || selected.size === 0 || !datesValid}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={3} />
                )}
                Sign contract
              </button>
            )}
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
