import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumBadge({
  className,
  label = "PRO",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300",
        className,
      )}
    >
      <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
