import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/* Tiers                                                               */
/* ------------------------------------------------------------------ */

export type Tier = "free" | "premium" | "pro" | "ultra";

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
  ultra: 3,
};

export interface TierPlan {
  id: Exclude<Tier, "free">;
  name: string;
  inr: number;
  usd: number;
  tagline: string;
  features: string[];
}

export const TIER_PLANS: TierPlan[] = [
  {
    id: "premium",
    name: "Premium",
    inr: 99,
    usd: 1.99,
    tagline: "Plan your year",
    features: [
      "12-Month swipeable calendar",
      "Instant “Today” snap-back",
      "Everything in Free",
    ],
  },
  {
    id: "pro",
    name: "Premium Pro",
    inr: 199,
    usd: 3.99,
    tagline: "Understand your patterns",
    features: [
      "Everything in Premium",
      "30-Day Procrastination Analytics",
      "Interactive consistency graphs",
    ],
  },
  {
    id: "ultra",
    name: "Premium Ultra Pro",
    inr: 399,
    usd: 7.99,
    tagline: "The full nervous system",
    features: [
      "Everything in Pro",
      "✨ AI Task Breakdown",
      "Ambient focus soundscapes",
    ],
  },
];

export function planForTier(tier: Tier): TierPlan {
  return TIER_PLANS.find((p) => p.id === tier) ?? TIER_PLANS[0];
}

export function tierLabel(tier: Tier): string {
  if (tier === "free") return "Free";
  return planForTier(tier).name;
}

/* ------------------------------------------------------------------ */
/* UPI deep linking — privacy-safe, no phone number / QR              */
/* ------------------------------------------------------------------ */

/** Replace this placeholder VPA with your real UPI address later. */
export const UPI_VPA = "yourVPA@bank";
export const UPI_PAYEE_NAME = "AppPremium";

/** Builds a standard UPI intent URI. UPI is INR-only, so `am` is always INR. */
export function buildUpiUri(amountInr: number, note?: string): string {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE_NAME,
    am: amountInr.toFixed(2),
    cu: "INR",
  });
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface PaywallState {
  feature: string;
  tier: Tier;
}

interface PremiumContextValue {
  tier: Tier;
  isAdmin: boolean;
  emailVerified: boolean;
  loadingProfile: boolean;
  /** true when the active tier meets or exceeds `required` */
  hasTier: (required: Tier) => boolean;
  /** runs `action` if entitled, otherwise opens the paywall preset to `required` */
  guard: (feature: string, required: Tier, action: () => void) => void;
  paywall: PaywallState | null;
  openPaywall: (feature?: string, required?: Tier) => void;
  closePaywall: () => void;
  refreshProfile: () => void;
  markEmailVerified: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

interface ProfileTier {
  tier: Tier;
  email_verified: boolean;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [verifiedOverride, setVerifiedOverride] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-tier", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileTier> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tier, email_verified")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return {
        tier: (data?.tier as Tier) ?? "free",
        email_verified: !!data?.email_verified,
      };
    },
  });

  const tier: Tier = isAdmin ? "ultra" : data?.tier ?? "free";
  const emailVerified = isAdmin || verifiedOverride || !!data?.email_verified;

  const hasTier = useCallback(
    (required: Tier) => TIER_RANK[tier] >= TIER_RANK[required],
    [tier],
  );

  const openPaywall = useCallback(
    (feature?: string, required: Tier = "premium") => {
      setPaywall({ feature: feature ?? "Flux Premium", tier: required });
    },
    [],
  );

  const closePaywall = useCallback(() => setPaywall(null), []);

  const guard = useCallback(
    (feature: string, required: Tier, action: () => void) => {
      if (TIER_RANK[tier] >= TIER_RANK[required]) action();
      else setPaywall({ feature, tier: required });
    },
    [tier],
  );

  const refreshProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["profile-tier", user?.id] });
  }, [queryClient, user?.id]);

  const markEmailVerified = useCallback(() => {
    setVerifiedOverride(true);
    refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      tier,
      isAdmin,
      emailVerified,
      loadingProfile: isLoading,
      hasTier,
      guard,
      paywall,
      openPaywall,
      closePaywall,
      refreshProfile,
      markEmailVerified,
    }),
    [
      tier,
      isAdmin,
      emailVerified,
      isLoading,
      hasTier,
      guard,
      paywall,
      openPaywall,
      closePaywall,
      refreshProfile,
      markEmailVerified,
    ],
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
