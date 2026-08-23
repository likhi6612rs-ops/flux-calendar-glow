import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ClassifyInput = z.object({
  text: z.string().min(1).max(2000),
});

export const NOTE_CATEGORIES = [
  "Study",
  "Coursework",
  "Ideas",
  "Personal",
] as const;

export const classifyNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { category: "Ideas", title: data.text.slice(0, 48) };

    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          category: z.enum(["Study", "Coursework", "Ideas", "Personal"]),
          title: z.string().min(1).max(60),
        }),
      }),
      system:
        "You file notes into a personal knowledge drive. Pick exactly one category: Study (learning, revision, concepts), Coursework (assignments, deadlines, submissions, exams), Ideas (projects, inspiration, links to explore), Personal (life, health, money, people). Also write a short 3-6 word title summarising the note. Return only the structured result.",
      prompt: data.text,
    });

    return {
      category: output.category,
      title: output.title.trim(),
    };
  });
