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
      { property: "og:url", content: "https://flux-calendar-glow.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://flux-calendar-glow.lovable.app/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Flux",
              url: "https://flux-calendar-glow.lovable.app/",
              logo: "https://flux-calendar-glow.lovable.app/icon-512.png",
            },
            {
              "@type": "WebSite",
              name: "Flux",
              url: "https://flux-calendar-glow.lovable.app/",
              description:
                "Flux is a minimalist PWA that visualizes daily consistency and gamifies discipline.",
            },
          ],
        }),
      },
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
