import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Settings,
  Send,
  LogOut,
  ShieldCheck,
  Check,
  Timer,
  Crown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme, THEMES } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { usePremium, tierLabel } from "@/lib/premium";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { tier, openPaywall } = usePremium();
  const isPaid = tier !== "free";
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [timerCount, setTimerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("timer_completion_count")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setTimerCount(data?.timer_completion_count ?? 0));
  }, [open, user]);

  const submitFeedback = async () => {
    const msg = feedback.trim();
    if (!msg || !user) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email ?? "",
      message: msg.slice(0, 2000),
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send feedback. Try again.");
    } else {
      toast.success("Feedback sent — thank you!");
      setFeedback("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[88vw] max-w-sm overflow-y-auto border-border bg-background"
      >
        <SheetHeader>
          <SheetTitle className="text-left">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-7 px-1">
          {/* Account */}
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-semibold">{user?.email}</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-bold">{timerCount ?? "—"}</span>{" "}
                <span className="text-muted-foreground">focus sessions completed</span>
              </span>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> Admin Portal
              </Link>
            )}
          </div>

          {/* Premium */}
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
            <p className="flex items-center justify-between gap-1.5 text-sm font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Crown className="h-4 w-4" /> Flux Premium
              </span>
              <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                {tierLabel(tier)}
              </span>
            </p>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              {isPaid
                ? `Active — your ${tierLabel(tier)} features are unlocked.`
                : "Unlock the 12-month calendar, analytics, AI breakdowns & soundscapes."}
            </p>
            <button
              onClick={() => {
                setOpen(false);
                openPaywall("Flux Premium", isPaid ? "ultra" : "premium");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow py-2 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" /> {isPaid ? "Upgrade plan" : "Go Premium"}
            </button>
          </div>



          {/* Theme */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Visual Workspace</h3>
            <div className="space-y-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors",
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/40 hover:border-primary/50",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {t.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t.hint}
                    </span>
                  </span>
                  {theme === t.id && (
                    <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Feedback &amp; Comments</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Feature requests, bugs, or thoughts — we read everything.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Share your thoughts…"
              aria-label="Feedback message"
              className="w-full resize-none rounded-xl border border-input bg-card/60 p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
            <button
              onClick={submitFeedback}
              disabled={sending || !feedback.trim()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {sending ? "Sending…" : "Submit Feedback"}
            </button>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
