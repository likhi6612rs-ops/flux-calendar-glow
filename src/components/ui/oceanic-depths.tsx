import { cn } from "@/lib/utils";

/**
 * GradientBackground — "Oceanic Depths with lavender touch".
 * Zero dependencies. One fixed layer that fills its parent.
 * Drop it behind your content:
 *
 *   <div className="relative">
 *     <GradientBackground />
 *     <YourContent />
 *   </div>
 */
export function GradientBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* Deep oceanic base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #1e2448 0%, #12131c 40%, #0a0b10 100%)",
        }}
      />

      {/* Large lavender touch */}
      <div
        className="absolute -left-[20%] -top-[10%] h-[80vmax] w-[80vmax] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(149,117,205,0.35) 0%, rgba(90,100,190,0.12) 35%, transparent 65%)",
          filter: "blur(120px)",
        }}
      />

      {/* Teal depth */}
      <div
        className="absolute -bottom-[10%] -right-[20%] h-[70vmax] w-[70vmax] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(45,212,191,0.18) 0%, rgba(56,189,248,0.08) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Soften / vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(10,11,16,0.45) 100%)",
        }}
      />

      {/* Soft blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
