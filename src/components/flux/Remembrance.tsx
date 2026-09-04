import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Folder,
  FolderPlus,
  Link as LinkIcon,
  Loader2,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  FileText,
  FolderInput,
  Shuffle,
  X,
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

const LINKS_FOLDER = "Links";

const CATEGORIES = [
  "Study",
  "Coursework",
  "Ideas",
  "Personal",
  LINKS_FOLDER,
] as const;

const FOLDER_TONE: Record<string, string> = {
  Study: "text-sky-300",
  Coursework: "text-amber-300",
  Ideas: "text-primary-glow",
  Personal: "text-emerald-300",
  Dated: "text-rose-300",
  Links: "text-cyan-300",
};

const URL_RE = /https?:\/\/[^\s]+/i;
const BARE_URL_RE = /^(https?:\/\/\S+|www\.\S+\.\S+)$/i;
const CUSTOM_FOLDERS_KEY = "flux-remembrance-folders";

/** Strips protocol/trailing slash so bookmarks read cleanly. */
function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}


const FOLDER_COLORS = [
  { id: "lavender", label: "Lavender", tone: "text-primary-glow" },
  { id: "sky", label: "Sky", tone: "text-sky-300" },
  { id: "emerald", label: "Emerald", tone: "text-emerald-300" },
  { id: "amber", label: "Amber", tone: "text-amber-300" },
  { id: "rose", label: "Rose", tone: "text-rose-300" },
  { id: "violet", label: "Violet", tone: "text-violet-300" },
] as const;

interface CustomFolder {
  name: string;
  color: string;
}

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
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [draftFolder, setDraftFolder] = useState<string>("auto");

  /* ---------- link naming prompt ---------- */
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkName, setLinkName] = useState("");
  const [savingLink, setSavingLink] = useState(false);



  /* ---------- create-folder modal ---------- */
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState<string>("lavender");

  /* ---------- long-press context menu ---------- */
  const [menuNote, setMenuNote] = useState<Note | null>(null);
  const [menuMode, setMenuMode] = useState<"actions" | "move" | "new">(
    "actions",
  );
  const [newFolder, setNewFolder] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as (string | CustomFolder)[];
      setCustomFolders(
        parsed.map((f) =>
          typeof f === "string" ? { name: f, color: "lavender" } : f,
        ),
      );
    } catch {
      /* ignore malformed cache */
    }
  }, []);

  const persistFolders = (next: CustomFolder[]) => {
    setCustomFolders(next);
    try {
      localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  };

  const addFolder = (name: string, color = "lavender") => {
    if (customFolders.some((f) => f.name === name)) return;
    persistFolders([...customFolders, { name, color }]);
  };

  const toneFor = (name: string) => {
    const custom = customFolders.find((f) => f.name === name);
    if (custom)
      return (
        FOLDER_COLORS.find((c) => c.id === custom.color)?.tone ??
        "text-primary-glow"
      );
    return FOLDER_TONE[name] ?? "text-primary-glow";
  };


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, url, note_date, category, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error("Could not load your Remembrance vault.");
      setNotes((data ?? []) as Note[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allFolders = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    customFolders.forEach((f) => set.add(f.name));
    notes.forEach((n) => set.add(n.category));
    return Array.from(set);
  }, [customFolders, notes]);

  const save = async () => {
    const text = draft.trim();
    if (!text || !user || saving) return;
    setSaving(true);
    let category: string = "Ideas";
    let title = text.split("\n")[0].slice(0, 60);
    const manual = draftFolder !== "auto";
    try {
      const result = await classify({ data: { text, folders: allFolders } });
      category = result.category;
      title = result.title || title;
    } catch {
      /* AI is best-effort; fall back to defaults */
    }
    if (manual) category = draftFolder;
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
      toast.error("Could not save to your Remembrance vault.");
      return;
    }
    setNotes((prev) => [data as Note, ...prev]);
    setDraft("");
    toast.success(`Filed under ${category}`);
  };

  const remove = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setMenuNote(null);
    await supabase.from("notes").delete().eq("id", id);
  };

  /** Moves a note and records the correction so the AI learns the preference. */
  const moveNote = async (note: Note, target: string) => {
    const to = target.trim();
    if (!to || !user || to === note.category) {
      setMenuNote(null);
      return;
    }
    const from = note.category;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, category: to } : n)),
    );
    setMenuNote(null);
    setNewFolder("");

    const { error } = await supabase
      .from("notes")
      .update({ category: to })
      .eq("id", note.id);
    if (error) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, category: from } : n)),
      );
      toast.error("Could not move that memory.");
      return;
    }

    await supabase.from("note_category_corrections").insert({
      user_id: user.id,
      note_id: note.id,
      note_text: note.content.slice(0, 500),
      from_category: from,
      to_category: to,
    });

    toast.success(`Moved to ${to}`, {
      description: "Remembrance learned your filing preference.",
    });
  };

  const shareNote = async (note: Note) => {
    const text = [note.title, note.content, note.url].filter(Boolean).join("\n");
    setMenuNote(null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: note.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const openMenu = (note: Note) => {
    setMenuNote(note);
    setMenuMode("actions");
    setNewFolder("");
  };

  const startPress = (note: Note) => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      openMenu(note);
    }, 450);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { Dated: 0 };
    allFolders.forEach((c) => (map[c] = 0));
    notes.forEach((n) => {
      map[n.category] = (map[n.category] ?? 0) + 1;
      if (n.note_date) map.Dated += 1;
    });
    return map;
  }, [notes, allFolders]);

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
          placeholder="Remember an idea, a link, a moment…"
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
              : "Unbound memory"}
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary-glow" />
            <select
              value={draftFolder}
              onChange={(e) => setDraftFolder(e.target.value)}
              aria-label="File this memory in"
              className="bg-transparent text-[11px] font-semibold text-foreground focus:outline-none"
            >
              <option value="auto">Auto-sort</option>
              {allFolders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

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
            Remember
          </button>
        </div>
      </div>

      {/* ---------- Search ---------- */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/40 px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your Remembrance vault"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </div>

      {/* ---------- Vault ---------- */}
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
              {[...allFolders, "Dated"].map((name) => (
                <button
                  key={name}
                  onClick={() => setFolder(name)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card/40 p-4 text-left backdrop-blur-sm transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <Folder
                    className={cn("h-6 w-6 shrink-0", toneFor(name))}
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

              <button
                type="button"
                onClick={() => {
                  setCreateName("");
                  setCreateColor("lavender");
                  setCreating(true);
                }}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-all hover:border-primary/70 hover:bg-primary/10 active:scale-[0.98]"
              >
                <FolderPlus className="h-6 w-6 shrink-0 text-primary-glow" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-primary-glow">
                    New Folder
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Organise your vault
                  </p>
                </div>
              </button>
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
                  Nothing remembered here yet.
                </p>
              )}

              {visible.map((note) => (
                <div
                  key={note.id}
                  onPointerDown={() => startPress(note)}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onPointerCancel={endPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(note);
                  }}
                  className="group flex select-none items-start gap-3 rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm transition-colors hover:border-primary/30 active:border-primary/50"
                >
                  <FileText
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      toneFor(note.category),
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
                          <Shuffle className="h-3 w-3" /> Unbound
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
                    onClick={() => openMenu(note)}
                    aria-label="Note actions"
                    title="Long-press for actions"
                    className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary-glow"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ---------- Long-press action sheet ---------- */}
      <AnimatePresence>
        {menuNote && (
          <motion.div
            key="sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center"
            onClick={() => setMenuNote(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-white/10 bg-card/90 p-5 backdrop-blur-xl sm:rounded-3xl"
            >
              <div className="flex items-start gap-3 border-b border-white/5 pb-4">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{menuNote.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    In {menuNote.category}
                  </p>
                </div>
                <button
                  onClick={() => setMenuNote(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {menuMode === "actions" && (
                <div className="mt-3 space-y-1">
                  <SheetAction
                    icon={FolderInput}
                    label="Move to another folder"
                    onClick={() => setMenuMode("move")}
                  />
                  <SheetAction
                    icon={FolderPlus}
                    label="Create a new folder and add to it"
                    onClick={() => setMenuMode("new")}
                  />
                  <SheetAction
                    icon={Share2}
                    label="Share / export"
                    onClick={() => shareNote(menuNote)}
                  />
                  <SheetAction
                    icon={Trash2}
                    label="Delete memory"
                    tone="danger"
                    onClick={() => remove(menuNote.id)}
                  />
                </div>
              )}

              {menuMode === "move" && (
                <div className="mt-3 space-y-1">
                  {allFolders
                    .filter((f) => f !== menuNote.category)
                    .map((f) => (
                      <SheetAction
                        key={f}
                        icon={Folder}
                        label={f}
                        onClick={() => moveNote(menuNote, f)}
                      />
                    ))}
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    Moving a memory teaches the auto-sorter your preference.
                  </p>
                </div>
              )}

              {menuMode === "new" && (
                <div className="mt-4 space-y-3">
                  <input
                    autoFocus
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    maxLength={40}
                    placeholder="New folder name"
                    className="w-full rounded-xl border border-white/10 bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!newFolder.trim()}
                    onClick={() => {
                      const name = newFolder.trim();
                      addFolder(name);
                      void moveNote(menuNote, name);
                    }}

                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" /> Create & move here
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Create folder modal ---------- */}
      <AnimatePresence>
        {creating && (
          <motion.div
            key="create-folder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-white/10 bg-card/90 p-5 backdrop-blur-xl sm:rounded-3xl"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <FolderPlus className="h-4 w-4 text-primary-glow" />
                <p className="flex-1 text-sm font-bold">New folder</p>
                <button
                  onClick={() => setCreating(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <input
                  autoFocus
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={40}
                  placeholder="Folder name"
                  className="w-full rounded-xl border border-white/10 bg-background/50 px-3.5 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
                />

                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Folder colour
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={c.label}
                        onClick={() => setCreateColor(c.id)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl border transition-all",
                          createColor === c.id
                            ? "border-primary/60 bg-primary/15 scale-105"
                            : "border-white/10 bg-background/40 hover:border-white/25",
                        )}
                      >
                        <Folder className={cn("h-5 w-5", c.tone)} />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!createName.trim()}
                  onClick={() => {
                    const name = createName.trim();
                    if (allFolders.includes(name)) {
                      toast.error("That folder already exists.");
                      return;
                    }
                    addFolder(name, createColor);
                    setCreating(false);
                    setFolder(name);
                    toast.success(`Folder "${name}" created`);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Create folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: typeof Folder;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors",
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-primary/10",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
