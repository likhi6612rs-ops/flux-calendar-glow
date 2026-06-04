import { useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { LayoutGrid, LineChart } from "lucide-react";
import { getMonthInfo } from "@/lib/flux-date";
import { CalendarGrid } from "./CalendarGrid";
import { TaskList } from "./TaskList";
import { TrendChart } from "./TrendChart";
import { CelebrationEngine } from "./CelebrationEngine";
import { InstallPrompt } from "./InstallPrompt";
import { SettingsPanel } from "./SettingsPanel";
import { cn } from "@/lib/utils";

export function FluxApp() {
  const [view, setView] = useState(0); // 0 = dashboard, 1 = analytics
  const month = getMonthInfo();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && info.velocity.x < 0) setView(1);
    else if (info.offset.x > 60 && info.velocity.x > 0) setView(0);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-glow">
            Flux
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {month.label}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-card/50 p-1">
            {[
              { i: 0, icon: LayoutGrid, label: "Dashboard" },
              { i: 1, icon: LineChart, label: "Analytics" },
            ].map(({ i, icon: Icon, label }) => (
              <button
                key={i}
                onClick={() => setView(i)}
                aria-label={label}
                aria-pressed={view === i}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  view === i
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <SettingsPanel />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <motion.div
          className="flex w-[200%]"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
          animate={{ x: view === 0 ? "0%" : "-50%" }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
        >
          <div className="w-1/2 shrink-0 pr-2">
            <div className="space-y-8">
              <CalendarGrid />
              <TaskList />
            </div>
          </div>
          <div className="w-1/2 shrink-0 pl-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Consistency Trend
                </h2>
                <p className="text-xs text-muted-foreground">
                  Execution velocity by lifespan · last 14 days
                </p>
              </div>
              <TrendChart />
              <CelebrationEngine active={view === 1} />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center gap-2">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              view === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40",
            )}
          />
        ))}
      </div>

      <InstallPrompt />
    </div>
  );
}
