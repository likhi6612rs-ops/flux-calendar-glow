import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ClassifyInput = z.object({
  text: z.string().min(1).max(2000),
  /** Folders that currently exist in the user's vault (defaults + custom). */
  folders: z.array(z.string().min(1).max(40)).min(1).max(24).optional(),
});

export const NOTE_CATEGORIES = [
  "Study",
  "Coursework",
  "Ideas",
  "Personal",
] as const;

export const classifyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const folders = Array.from(
      new Set([...(data.folders ?? []), ...NOTE_CATEGORIES]),
    );
    const fallback = {
      category: folders[0] ?? "Ideas",
      title: data.text.slice(0, 48),
    };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fallback;

    // AI feedback loop: the user's past manual re-files teach the model how
    // this particular person likes their vault organised.
    const { data: corrections } = await context.supabase
      .from("note_category_corrections")
      .select("note_text, from_category, to_category")
      .order("created_at", { ascending: false })
      .limit(15);

    const lessons = (corrections ?? [])
      .map(
        (c) =>
          `- "${String(c.note_text).slice(0, 160)}" → user moved it from ${c.from_category} to ${c.to_category}`,
      )
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({
          schema: z.object({
            category: z.string().min(1).max(40),
            title: z.string().min(1).max(60),
          }),
        }),
        system: [
          "You file notes into a personal Remembrance vault (a memory archive).",
          `Pick exactly one folder from this list: ${folders.join(", ")}.`,
          "Guidance for the default folders: Study (learning, revision, concepts), Coursework (assignments, deadlines, submissions, exams), Ideas (projects, inspiration, links to explore), Personal (life, health, routines, money, people).",
          "Also write a short 3-6 word title summarising the note.",
          lessons
            ? `Learned preferences from this user's own corrections — follow these patterns closely:\n${lessons}`
            : "",
          "Return only the structured result.",
        ]
          .filter(Boolean)
          .join("\n\n"),
        prompt: data.text,
      });

      const category = folders.find(
        (f) => f.toLowerCase() === output.category.trim().toLowerCase(),
      );

      return {
        category: category ?? fallback.category,
        title: output.title.trim() || fallback.title,
      };
    } catch {
      return fallback;
    }
  });
