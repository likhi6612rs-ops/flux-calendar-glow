import { Bell, Waves, PartyPopper, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { usePreferences, type FluxPreferences } from "@/hooks/use-preferences";
import { useTheme, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-primary" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300",
          checked ? "left-[1.375rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

const ROWS: {
  key: keyof FluxPreferences;
  icon: typeof Bell;
  title: string;
  hint: string;
}[] = [
  {
    key: "reminders",
    icon: Bell,
    title: "Notification reminders",
    hint: "Gentle nudges for tasks still open today",
  },
  {
    key: "soundscapes",
    icon: Waves,
    title: "Ambient soundscapes",
    hint: "Allow focus audio textures while the timer runs",
  },
  {
    key: "celebrations",
    icon: PartyPopper,
    title: "Completion celebrations",
    hint: "Confetti and micro-animations on task completion",
  },
];

export function PreferencesPanel() {
  const { prefs, setPref } = usePreferences();
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="text-sm font-bold">Preferences</h2>
        <div className="mt-4 space-y-1">
          {ROWS.map(({ key, icon: Icon, title, hint }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl px-1 py-3 transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <Toggle
                label={title}
                checked={prefs[key]}
                onChange={async () => {
                  const applied = await setPref(key, !prefs[key]);
                  if (key === "reminders" && !applied && !prefs[key]) {
                    toast.error("Notifications are blocked in your browser settings.");
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Palette className="h-4 w-4 text-primary" /> Theme
        </h2>
        <div className="mt-4 space-y-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                theme === t.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:border-primary/50",
              )}
            >
              <span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.hint}</span>
              </span>
              {theme === t.id && (
                <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
