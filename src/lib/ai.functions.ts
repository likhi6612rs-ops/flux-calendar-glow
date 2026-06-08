import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const BreakdownInput = z.object({
  task: z.string().min(1).max(500),
});

export const breakDownTask = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BreakdownInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          subtasks: z.array(z.string()).min(2).max(6),
        }),
      }),
      system:
        "You are a productivity coach. Break a large or vague task into 3-5 small, concrete, actionable steps. Each step starts with a verb, is under 8 words, and is ordered logically. Return only the steps.",
      prompt: `Break this task into actionable steps: "${data.task}"`,
    });

    return { subtasks: output.subtasks.map((s) => s.trim()).filter(Boolean) };
  });
