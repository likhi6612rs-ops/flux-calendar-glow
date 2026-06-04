import { createFileRoute } from "@tanstack/react-router";
import { FluxProvider } from "@/lib/flux-store";
import { FluxApp } from "@/components/flux/FluxApp";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

function Index() {
  return (
    <FluxProvider>
      <FluxApp />
    </FluxProvider>
  );
}
