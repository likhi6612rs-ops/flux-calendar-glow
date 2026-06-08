import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "flux:premium";

export interface PremiumPerk {
  title: string;
  detail: string;
}

export const PREMIUM_PERKS: PremiumPerk[] = [
  {
    title: "30-day Focus Score analytics",
    detail: "Procrastination trends, streak depth, and lifespan breakdowns.",
  },
  {
    title: "✨ AI Task Breakdown",
    detail: "Split daunting objectives into clean, actionable steps instantly.",
  },
  {
    title: "Ambient focus soundscapes",
    detail: "Lo-Fi, rainfall, and white noise inside the focus pane.",
  },
  {
    title: "Priority polish & early features",
    detail: "First access to new modules and customizations.",
  },
];

export const PREMIUM_PRICE = "₹99";
export const PREMIUM_CYCLE = "month";

interface PremiumContextValue {
  isPremium: boolean;
  upgrade: () => void;
  cancel: () => void;
  /** the feature label that triggered the paywall, or null when closed */
  paywallFeature: string | null;
  openPaywall: (feature?: string) => void;
  closePaywall: () => void;
  /** runs `action` if premium, otherwise opens the paywall for `feature` */
  guard: (feature: string, action: () => void) => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);

  useEffect(() => {
    setIsPremium(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const openPaywall = useCallback((feature?: string) => {
    setPaywallFeature(feature ?? "Flux Premium");
  }, []);

  const closePaywall = useCallback(() => setPaywallFeature(null), []);

  const upgrade = useCallback(() => {
    setIsPremium(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
    setPaywallFeature(null);
    toast.success("Welcome to Flux Premium ✨", {
      description: "All advanced insights and AI tools are now unlocked.",
    });
  }, []);

  const cancel = useCallback(() => {
    setIsPremium(false);
    window.localStorage.removeItem(STORAGE_KEY);
    toast("Premium deactivated", {
      description: "Your advanced features are locked again.",
    });
  }, []);

  const guard = useCallback(
    (feature: string, action: () => void) => {
      if (isPremium) action();
      else setPaywallFeature(feature);
    },
    [isPremium],
  );

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      upgrade,
      cancel,
      paywallFeature,
      openPaywall,
      closePaywall,
      guard,
    }),
    [isPremium, upgrade, cancel, paywallFeature, openPaywall, closePaywall, guard],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}
