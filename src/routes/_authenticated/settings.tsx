import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileEditor } from "@/components/flux/ProfileEditor";
import { PreferencesPanel } from "@/components/flux/PreferencesPanel";
import { TeamConnections } from "@/components/flux/TeamConnections";
import { PaywallModal } from "@/components/flux/PaywallModal";
import { PremiumProvider } from "@/lib/premium";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Flux" },
      {
        name: "description",
        content:
          "Manage your Flux profile, avatar, membership tier, notification and theme preferences.",
      },
      { property: "og:title", content: "Settings — Flux" },
      {
        property: "og:description",
        content:
          "Your Flux profile and customization dashboard: avatar, tier, preferences and connectors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PremiumProvider>
      <div className="min-h-screen bg-background pb-28">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
            <Link
              to="/"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-primary-glow">
                <SettingsIcon className="h-3 w-3" /> Settings
              </p>
              <h1 className="text-xl font-extrabold tracking-tight">
                Profile &amp; Customization
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          <ErrorBoundary label="Your profile">
            <ProfileEditor />
          </ErrorBoundary>
          <ErrorBoundary label="Preferences">
            <PreferencesPanel />
          </ErrorBoundary>
          <ErrorBoundary label="Connections">
            <TeamConnections />
          </ErrorBoundary>
        </main>

        <PaywallModal />
      </div>
    </PremiumProvider>
  );
}
