import { createFileRoute } from "@tanstack/react-router";
import { FluxProvider } from "@/lib/flux-store";
import { FluxApp } from "@/components/flux/FluxApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flux — Dynamic Personal Nervous System" },
      {
        name: "description",
        content:
          "Flux is a minimalist PWA that visualizes daily consistency, gamifies discipline, and adapts to every calendar month.",
      },
      { property: "og:title", content: "Flux — Dynamic Personal Nervous System" },
      {
        property: "og:description",
        content:
          "Track consistency, clear daily objectives, and watch your velocity rise.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <FluxProvider>
      <FluxApp />
    </FluxProvider>
  );
}
