import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  ListChecks,
  Timer,
  LineChart,
  Crown,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useFlux } from "@/lib/flux-store";
import { usePremium, tierLabel } from "@/lib/premium";
import { useAuth } from "@/lib/auth";
import { MultiMonthCalendar } from "./MultiMonthCalendar";
import { ProcrastinationTracker } from "./ProcrastinationTracker";
import { TaskList } from "./TaskList";
import { FocusPane } from "./FocusPane";
import { InsightsView } from "./InsightsView";
import { SettingsPanel } from "./SettingsPanel";
import { InstallPrompt } from "./InstallPrompt";
import { UpdateBanner } from "./UpdateBanner";
import { PaywallModal } from "./PaywallModal";
import { TierGate } from "./TierGate";
import { cn } from "@/lib/utils";

type ModuleId = "calendar" | "tasks" | "focus" | "insights";

const NAV: { id: ModuleId; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "insights", label: "Insights", icon: LineChart },
];

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function CenterModule({ id }: { id: ModuleId }) {
  if (id === "calendar")
    return (
      <div className="space-y-6">
        <ProcrastinationTracker />
        <MultiMonthCalendar />
      </div>
    );
  if (id === "tasks") return <TaskList />;
  if (id === "focus") return <FocusPane />;
  return <InsightsView />;
}

export function FluxApp() {
  const desktop = useIsDesktop();
  const { user } = useAuth();
  const { tier, hasTier, openPaywall } = usePremium();
  const { procrastination } = useFlux();

  const [active, setActive] = useState<ModuleId>("calendar");
  const [rightOpen, setRightOpen] = useState(true);

  const hasDebt = procrastination(3).pending > 0;
  // On desktop the focus pane lives on the right, so the center never shows it.
  const centerModule: ModuleId =
    desktop && active === "focus" ? "calendar" : active;

  const onNav = (id: ModuleId) => {
    if (desktop && id === "focus") {
      setRightOpen((o) => !o);
      return;
    }
    setActive(id);
  };

  const navActive = (id: ModuleId) =>
    id === "focus"
      ? desktop
        ? rightOpen
        : active === "focus"
      : active === id;

  const initials = (user?.email ?? "F").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        {/* ---------- Desktop left sidebar ---------- */}
        {desktop && (
          <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-card/30 px-3 py-5 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-2 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-sm font-black text-primary-foreground">
                F
              </div>
              <div>
                <p className="text-sm font-extrabold leading-none tracking-tight">
                  Flux
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Nervous System
                </p>
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                    navActive(item.id)
                      ? "bg-primary/15 text-primary-glow"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.id === "calendar" && hasDebt && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                    </span>
                  )}
                  {item.id === "insights" && !hasTier("pro") && (
                    <Crown className="ml-auto h-3.5 w-3.5 text-amber-300/80" />
                  )}
                  {item.id === "focus" && (
                    <span className="ml-auto text-muted-foreground/60">
                      {desktop && rightOpen ? (
                        <PanelRightClose className="h-3.5 w-3.5" />
                      ) : (
                        <PanelRightOpen className="h-3.5 w-3.5" />
                      )}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {tier === "free" ? (
              <button
                onClick={() => openPaywall("Flux Premium", "premium")}
                className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-primary-glow/10 p-3 text-left transition-transform active:scale-[0.98]"
              >
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary-glow">
                  <Sparkles className="h-3.5 w-3.5" /> Go Premium
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Unlock the calendar, analytics, AI breakdowns & soundscapes.
                </p>
              </button>
            ) : (
              <button
                onClick={() => openPaywall("Flux Premium", "ultra")}
                className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-300 transition-transform active:scale-[0.98]"
              >
                <Crown className="h-3.5 w-3.5" /> {tierLabel(tier)} active
              </button>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-background/40 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary-glow">
                {initials}
              </div>
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
              <SettingsPanel />
            </div>
          </aside>
        )}

        {/* ---------- Center canvas ---------- */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          {!desktop && (
            <header className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-sm font-black text-primary-foreground">
                  F
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-glow">
                    Flux
                  </p>
                  <h1 className="text-lg font-extrabold leading-none tracking-tight">
                    {NAV.find((n) => n.id === active)?.label}
                  </h1>
                </div>
              </div>
              <SettingsPanel />
            </header>
          )}

          <div className="mx-auto max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={centerModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <CenterModule id={centerModule} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* ---------- Desktop right focus pane ---------- */}
        {desktop && (
          <AnimatePresence>
            {rightOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="sticky top-0 h-screen shrink-0 overflow-y-auto border-l border-white/5 bg-card/20 backdrop-blur-sm"
              >
                <div className="w-80 p-5">
                  <FocusPane />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ---------- Mobile bottom nav ---------- */}
      {!desktop && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-popover/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {NAV.map((item) => {
              const on = navActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={cn(
                    "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                    on ? "text-primary-glow" : "text-muted-foreground",
                  )}
                >
                  <span className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.id === "calendar" && hasDebt && (
                      <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-popover" />
                    )}
                    {item.id === "insights" && !isPremium && (
                      <Crown className="absolute -right-2 -top-1 h-2.5 w-2.5 text-amber-300" />
                    )}
                  </span>
                  {item.label}
                  {on && (
                    <motion.span
                      layoutId="navdot"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <PaywallModal />
      <InstallPrompt />
      <UpdateBanner />
    </div>
  );
}
