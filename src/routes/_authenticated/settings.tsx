import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { ProfileEditor } from "@/components/flux/ProfileEditor";
import { TeamConnections } from "@/components/flux/TeamConnections";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Flux" },
      { name: "description", content: "Manage your Flux profile, avatar, and connectors." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
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
            <h1 className="text-xl font-extrabold tracking-tight">Profile</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <ProfileEditor />
        <TeamConnections />
      </main>
    </div>
  );
}
