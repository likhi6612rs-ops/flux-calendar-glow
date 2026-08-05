import { useCallback, useEffect, useState } from "react";

export interface FluxPreferences {
  reminders: boolean;
  soundscapes: boolean;
  celebrations: boolean;
}

const KEY = "flux:preferences";

const DEFAULTS: FluxPreferences = {
  reminders: false,
  soundscapes: true,
  celebrations: true,
};

export function usePreferences() {
  const [prefs, setPrefs] = useState<FluxPreferences>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as FluxPreferences) });
    } catch {
      /* corrupt value — fall back to defaults */
    }
  }, []);

  const setPref = useCallback(
    async (key: keyof FluxPreferences, value: boolean) => {
      let next = value;
      if (key === "reminders" && value && typeof Notification !== "undefined") {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        next = permission === "granted";
      }
      setPrefs((prev) => {
        const updated = { ...prev, [key]: next };
        try {
          window.localStorage.setItem(KEY, JSON.stringify(updated));
        } catch {
          /* storage unavailable */
        }
        return updated;
      });
      return next;
    },
    [],
  );

  return { prefs, setPref };
}
