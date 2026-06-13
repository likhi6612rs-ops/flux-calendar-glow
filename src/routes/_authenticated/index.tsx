import { createFileRoute } from "@tanstack/react-router";
import { FluxProvider } from "@/lib/flux-store";
import { PremiumProvider } from "@/lib/premium";
import { AppConfigProvider } from "@/lib/app-config";
import { FluxApp } from "@/components/flux/FluxApp";
import { VerificationGate } from "@/components/flux/VerificationGate";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Flux — Dynamic Personal Nervous System" },
      { name: "google-site-verification", content: "u4EAHx0C0qIDXqEM0kw-ySnukNbocmAJpTirY_K0nnc" },
      { property: "og:url", content: "https://flux-calendar-glow.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://flux-calendar-glow.lovable.app/" },
    ],
     }),
  component: Index,
});

function Index() {
  return (
    <FluxProvider>
      <PremiumProvider>
        <AppConfigProvider>
          <VerificationGate>
            {/* Restored back to your preferred original view */}
            <FluxApp />
          </VerificationGate>
        </AppConfigProvider>
      </PremiumProvider>
    </FluxProvider>
  );
}
