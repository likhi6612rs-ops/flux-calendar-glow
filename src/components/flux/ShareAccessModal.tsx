import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Loader2, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFlux, type TaskSpan, type ProfileLite } from "@/lib/flux-store";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

interface Props {
  connector: ProfileLite;
  onClose: () => void;
}

/** Owner-side modal to choose which of MY tasks a given connected user can see. */
export function ShareAccessModal({ connector, onClose }: Props) {
  const { user } = useAuth();
  const { tasks } = useFlux();
  const myTasks = useMemo<TaskSpan[]>(
    () => tasks.filter((t) => t.user_id === user?.id),
    [tasks, user?.id],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("task_permissions")
      .select("task_id")
      .eq("owner_id", user.id)
      .eq("connector_id", connector.id)
      .then(({ data }) => {
        setSelected(new Set((data ?? []).map((r) => r.task_id)));
        setLoading(false);
      });
  }, [user, connector.id]);

  const toggle = (taskId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myTasks;
    return myTasks.filter((t) => t.text.toLowerCase().includes(q));
  }, [myTasks, query]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    // Diff against current server state to avoid nuking unrelated rows.
    const { data: current } = await supabase
      .from("task_permissions")
      .select("task_id")
      .eq("owner_id", user.id)
      .eq("connector_id", connector.id);
    const existing = new Set((current ?? []).map((r) => r.task_id));
    const toAdd = [...selected].filter((id) => !existing.has(id));
    const toRemove = [...existing].filter((id) => !selected.has(id));

    if (toAdd.length > 0) {
      const rows = toAdd.map((task_id) => ({
        owner_id: user.id,
        connector_id: connector.id,
        task_id,
      }));
      const { error } = await supabase.from("task_permissions").insert(rows);
      if (error) {
        setSaving(false);
        toast.error("Couldn't grant access.");
        return;
      }
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("task_permissions")
        .delete()
        .eq("owner_id", user.id)
        .eq("connector_id", connector.id)
        .in("task_id", toRemove);
      if (error) {
        setSaving(false);
        toast.error("Couldn't revoke some access.");
        return;
      }
    }
    setSaving(false);
    toast.success(
      selected.size === 0
        ? `${connector.display_name || connector.full_name || "Access"} revoked`
        : `Shared ${selected.size} task${selected.size === 1 ? "" : "s"}`,
    );
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
          className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Configure shared task access"
        >
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
                Sharing access
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

          <div className="border-b border-border/50 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your tasks…"
                className="w-full rounded-lg border border-input bg-background/60 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <li className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </li>
            ) : filtered.length === 0 ? (
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
                      <span className="flex-1 truncate text-sm">{t.text}</span>
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

          <footer className="flex items-center justify-between gap-3 border-t border-border/50 p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {selected.size}
              </span>{" "}
              of {myTasks.length} shared
            </p>
            <button
              onClick={save}
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" strokeWidth={3} />
              )}
              Save access
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
