import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { GradientBackground } from "@/components/ui/oceanic-depths";

export const Route = createFileRoute("/gradient-demo")({
  head: () => ({
    meta: [
      { title: "Oceanic Depths · Flux" },
      {
        name: "description",
        content: "Demo of the Oceanic Depths gradient background.",
      },
      {
        property: "og:title",
        content: "Oceanic Depths · Flux",
      },
      {
        property: "og:description",
        content: "Demo of the Oceanic Depths gradient background.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Oceanic Depths · Flux",
      },
      {
        name: "twitter:description",
        content: "Demo of the Oceanic Depths gradient background.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://flux-calendar-glow.lovable.app/gradient-demo",
      },
    ],
  }),
  component: GradientBackgroundDemo,
});

function GradientBackgroundDemo() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <GradientBackground />
      <div className="relative z-10 max-w-md rounded-3xl border border-white/10 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Oceanic Depths
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A deep, glassy gradient background with a lavender touch. Drop it
          behind any view to add premium depth.
        </p>
      </div>
    </div>
  );
}
