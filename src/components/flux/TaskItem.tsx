import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_TRANSFERS, type TaskSpan } from "@/lib/flux-store";

interface TaskItemProps {
  task: TaskSpan;
  selectedDate: string;
  done: boolean;
  owner: boolean;
  rolloverEligible: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onShift: () => void;
  onAskGemini: (task: TaskSpan) => void;
  onEdit: (id: string, text: string) => void;
}

export function TaskItem({
  task,
  selectedDate,
  done,
  owner,
  rolloverEligible,
  onToggle,
  onDelete,
  onShift,
  onAskGemini,
  onEdit,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.text);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) editRef.current?.focus();
  }, [isEditing]);

  const handleCommit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.text) {
      onEdit(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(task.text);
    setIsEditing(false);
  };

  const multi = task.span_days > 1;
  const attemptLabel =
    task.transfer_count === 0
      ? null
      : task.transfer_count === 1
        ? "1st Attempt"
        : task.transfer_count === 2
          ? "Final Attempt"
          : "Expired";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all duration-300",
        done
          ? "border-success/25 bg-success/10"
          : task.status === "expired"
            ? "border-destructive/30 bg-destructive/5 opacity-70"
            : task.transfer_count >= 2
              ? "border-destructive/40 bg-destructive/10"
              : task.transfer_count === 1
                ? "border-amber-400/40 bg-amber-500/5"
                : "border-border bg-card/40",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-300",
          done
            ? "border-transparent bg-success text-success-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      {isEditing ? (
        <input
          ref={editRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommit();
            if (e.key === "Escape") handleCancel();
          }}
          className="flex-1 rounded-md border border-primary bg-background px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex-1 cursor-text text-left text-sm text-foreground transition-all duration-300"
          title="Click to edit"
        >
          <span className="leading-relaxed">{task.text}</span>
          {multi && (
            <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-glow">
              {task.span_days}d
            </span>
          )}
          {attemptLabel && (
            <span
              className={cn(
                "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                task.status === "expired"
                  ? "bg-destructive/20 text-destructive"
                  : task.transfer_count >= 2
                    ? "bg-destructive/20 text-destructive"
                    : "bg-amber-500/20 text-amber-500",
              )}
            >
              {attemptLabel}
            </span>
          )}
        </button>
      )}

      {rolloverEligible && (
        <button
          type="button"
          onClick={onShift}
          aria-label="Shift to tomorrow"
          title={`Shift to tomorrow (${MAX_TRANSFERS - task.transfer_count} left)`}
          className="flex h-7 items-center gap-1 shrink-0 rounded-md px-2 text-[11px] font-semibold text-primary-glow/80 transition-colors hover:bg-primary/15 hover:text-primary-glow"
        >
          Tomorrow <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}

      <button
        type="button"
        onClick={() => onAskGemini(task)}
        aria-label="Ask Gemini to break it down"
        title="✨ Ask Gemini (Ultra Pro)"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-primary-glow/70 transition-colors hover:bg-primary/15 hover:text-primary-glow"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete task span"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.li>
  );
}
