import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, X, Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { coachTask } from "@/lib/coach.functions";
import { PremiumBadge } from "./PremiumBadge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Tiny inline markdown renderer: handles bold, bullets and headings. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;
        if (/^#{1,6}\s/.test(trimmed))
          return (
            <p key={i} className="pt-1 text-sm font-extrabold text-primary-glow">
              {renderInline(trimmed.replace(/^#{1,6}\s/, ""))}
            </p>
          );
        if (/^[-*]\s/.test(trimmed))
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-glow" />
              <span>{renderInline(trimmed.replace(/^[-*]\s/, ""))}</span>
            </div>
          );
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function GeminiCoach({
  task,
  onClose,
}: {
  task: string;
  onClose: () => void;
}) {
  const runCoach = useServerFn(coachTask);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const ask = async (history: ChatMessage[]) => {
    setLoading(true);
    try {
      const res = await runCoach({ data: { task, messages: history } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("429"))
        toast.error("Gemini is busy — try again in a moment.");
      else if (msg.includes("402"))
        toast.error("AI credits exhausted. Add credits to continue.");
      else toast.error("Couldn't reach the coach. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Kick off the conversation as soon as the panel opens.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const seed: ChatMessage[] = [
      {
        role: "user",
        content: `My task is "${task}". Coach me through completing it.`,
      },
    ];
    ask(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    ask(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex justify-end bg-background/70 backdrop-blur-md"
    >
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-card/80 shadow-glow backdrop-blur-2xl"
        style={{ ["--glow-color" as string]: "oklch(0.74 0.12 300 / 35%)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" /> Ask Gemini
              <PremiumBadge />
            </p>
            <h3 className="mt-1 truncate text-base font-bold leading-tight">
              {task}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close coach"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl rounded-tl-sm border border-white/10 bg-background/40 p-3.5"
              >
                <Markdown content={m.content} />
              </motion.div>
            ) : i === 0 ? null : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {m.content}
              </motion.div>
            ),
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Gemini is thinking…
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          className="border-t border-white/10 p-4"
        >
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Reply to Gemini…"
              aria-label="Message Gemini"
              disabled={loading}
              className="w-full rounded-xl border border-input bg-background/50 py-3 pl-4 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className={cn(
                "absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-40",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </motion.aside>
    </motion.div>
  );
}
