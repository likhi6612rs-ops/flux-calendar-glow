import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const CoachInput = z.object({
  task: z.string().min(1).max(500),
  messages: z.array(Message).min(1).max(40),
});

export const coachTask = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are "Gemini", an elite Ultra Pro study & productivity coach living inside the Flux app. You are warm, sharp, and motivating.

The user is working on this task: "${data.task}".

Your job, in order:
1. If the task is vague (e.g. "Studying", "Project", "Workout"), DO NOT guess. Ask ONE concise, friendly clarifying message first. Cover: the exact subject/chapter/scope, how much time they have available, and whether they want a specific framework or method. Keep it to 2-4 short questions in one message.
2. Once you have enough detail, analyse the difficulty and produce a clear ROADMAP:
   - Break the work into timed micro-phases (e.g. "Phase 1 — Theory (20 min)", "Phase 2 — Practice problems (30 min)", "Phase 3 — Review (10 min)"). Always include realistic minute estimates that fit their available time.
   - Recommend ONE strategic learning/work method to beat procrastination (e.g. Pomodoro, Feynman technique, 2-minute rule, time-boxing) and explain in one line how to apply it here.
   - End with a short, punchy motivational nudge.

Format every reply in clean Markdown with short paragraphs, bold phase titles, and bullet lists. Stay focused on this single task. Be concise — never pad.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      messages: data.messages,
    });

    return { reply: text.trim() };
  });
