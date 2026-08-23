import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CalendarDays,
  Folder,
  Link as LinkIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  FileText,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFlux } from "@/lib/flux-store";
import { classifyNote } from "@/lib/notes.functions";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  url: string | null;
  note_date: string | null;
  category: string;
  created_at: string;
}

const CATEGORIES = ["Study", "Coursework", "Ideas", "Personal"] as const;
type Category = (typeof CATEGORIES)[number];

const FOLDER_TONE: Record<string, string> = {
  Study: "text-sky-300",
  Coursework: "text-amber-300",
  Ideas: "text-primary-glow",
  Personal: "text-emerald-300",
  Dated: "text-rose-300",
};

const URL_RE = /https?:\/\/[^\s]+/i;

export function Remembrance() {
  const { user } = useAuth();
  const { selectedDate } = useFlux();
  const classify = useServerFn(classifyNote);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachDate, setAttachDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, url, note_date, category, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error("Could not load your notes.");
      setNotes((data ?? []) as Note[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async () => {
    const text = draft.trim();
    if (!text || !user || saving) return;
    setSaving(true);
    let category: string = "Ideas";
    let title = text.split("\n")[0].slice(0, 60);
    try {
      const result = await classify({ data: { text } });
      category = result.category;
      title = result.title || title;
    } catch {
      /* AI is best-effort; fall back to defaults */
    }
    const url = text.match(URL_RE)?.[0] ?? null;
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        content: text,
        url,
        category,
        note_date: attachDate ? selectedDate : null,
      })
      .select("id, title, content, url, note_date, category, created_at")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Could not save that note.");
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
    setDraft("");
    toast.success(`Filed under ${category}`);
  };

  const remove = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { Dated: 0 };
    CATEGORIES.forEach((c) => (map[c] = 0));
    notes.forEach((n) => {
      map[n.category] = (map[n.category] ?? 0) + 1;
      if (n.note_date) map.Dated += 1;
    });
    return map;
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (folder === "Dated" && !n.note_date) return false;
      if (folder && folder !== "Dated" && n.category !== folder) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    });
  }, [notes, folder, query]);

  return (
    <section aria-label="Remembrance" className="space-y-6">
      {/* ---------- Composer ---------- */}
      <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Jot an idea, a link, a reminder…"
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <button
            type="button"
            onClick={() => setAttachDate((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              attachDate
                ? "border-primary/40 bg-primary/15 text-primary-glow"
                : "border-white/10 text-muted-foreground hover:text-foreground",
            )}
          >
            {attachDate ? (
              <CalendarDays className="h-3.5 w-3.5" />
            ) : (
              <Shuffle className="h-3.5 w-3.5" />
            )}
            {attachDate
              ? format(parseISO(selectedDate), "d MMM yyyy")
              : "Random note"}
          </button>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <Sparkles className="h-3 w-3 text-primary-glow" /> Auto-sorted
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim() || saving}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* ---------- Search ---------- */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/40 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your drive"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </div>

      {/* ---------- Drive ---------- */}
      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {folder === null && !query ? (
            <motion.div
              key="folders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 gap-3"
            >
              {[...CATEGORIES, "Dated"].map((name) => (
                <button
                  key={name}
                  onClick={() => setFolder(name)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card/40 p-4 text-left backdrop-blur-sm transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <Folder
                    className={cn("h-6 w-6 shrink-0", FOLDER_TONE[name])}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {counts[name] ?? 0}{" "}
                      {(counts[name] ?? 0) === 1 ? "item" : "items"}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                {folder && (
                  <button
                    onClick={() => setFolder(null)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> All folders
                  </button>
                )}
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {folder ?? "Search results"} · {visible.length}
                </p>
              </div>

              {visible.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">
                  Nothing filed here yet.
                </p>
              )}

              {visible.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm transition-colors hover:border-primary/30"
                >
                  <FileText
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      FOLDER_TONE[note.category] ?? "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{note.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {note.content}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/80">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 font-semibold">
                        {note.category}
                      </span>
                      {note.note_date ? (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(parseISO(note.note_date), "d MMM yyyy")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Shuffle className="h-3 w-3" /> Random
                        </span>
                      )}
                      {note.url && (
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-primary-glow hover:underline"
                        >
                          <LinkIcon className="h-3 w-3" /> Open link
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(note.id)}
                    aria-label="Delete note"
                    className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
