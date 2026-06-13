import { createFileRoute } from "@tanstack/react-router";
import DashboardCore from "@/components/DashboardCore";

// This tells your app's navigation map that a new page exists at /focus
export const Route = createFileRoute("/_authenticated/focus")({
  component: FocusPage,
});

function FocusPage() {
  return (
    <div className="relative min-h-screen bg-[#FDFBFF]">
      {/* Simple navigation bar to let you click back to your calendar */}
      <div className="max-w-5xl mx-auto pt-4 px-6">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#7E57C2] hover:text-[#673AB7] bg-[#EDE7F6] px-4 py-2 rounded-xl transition shadow-sm"
        >
          ← Back to Calendar Dashboard
        </a>
      </div>

      {/* Renders your beautiful timer, coach panel, and streak tracker */}
      <DashboardCore />
    </div>
  );
}
