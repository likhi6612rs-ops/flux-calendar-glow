import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Theme = "charcoal" | "true-dark" | "light";

export const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: "true-dark", label: "True Dark", hint: "Absolute black · neon lavender" },
  { id: "charcoal", label: "Charcoal", hint: "Soft deep charcoal · calming" },
  { id: "light", label: "Pristine White", hint: "Clinical white · sharp violet" },
];

const STORAGE_KEY = "flux:theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("charcoal");

  // Hydrate from localStorage on first client render.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme("charcoal");
    }
  }, []);

  // Sync from the signed-in user's saved preference.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme) {
          const t = data.theme as Theme;
          setThemeState(t);
          applyTheme(t);
          window.localStorage.setItem(STORAGE_KEY, t);
        }
      });
  }, [user]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    if (user) {
      supabase.from("profiles").update({ theme: t }).eq("id", user.id).then(() => {});
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
