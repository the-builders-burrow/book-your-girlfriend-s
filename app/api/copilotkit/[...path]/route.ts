import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { createOpenAI } from "@ai-sdk/openai";

import { startBookingMissionTool } from "@/lib/booking/copilot";

export const runtime = "nodejs";
export const maxDuration = 300;

const apiKey = process.env.FIREWORKS_API_KEY?.trim();
const modelId =
  process.env.FIREWORKS_MODEL?.trim() ||
  "accounts/fireworks/models/deepseek-v4-pro";

const handler = apiKey
  ? createFireworksHandler(apiKey, modelId)
  : async () =>
      Response.json(
        {
          error: "FIREWORKS_API_KEY is not configured for the CopilotKit runtime.",
        },
        { status: 503 },
      );

function createFireworksHandler(key: string, model: string) {
  const fireworks = createOpenAI({
    name: "fireworks",
    apiKey: key,
    baseURL: "https://api.fireworks.ai/inference/v1",
  });

  const createAgent = () =>
    new BuiltInAgent({
      model: fireworks.chat(model),
      maxSteps: 8,
      maxOutputTokens: 4_096,
      tools: [startBookingMissionTool],
      prompt:
        "You are Book Your Girlfriend, a warm, discerning concierge for romantic restaurants, private venues, thoughtful gifts, memorable experiences, getaways, and surprises. Learn the occasion, the recipient's taste, location, timing, budget, and accessibility needs without stereotyping. The startBookingMission tool performs a real provider research mission in a billable Daytona sandbox; call it only when the user explicitly asks to search or prepare a booking and has supplied enough details. Never claim exclusivity, price, availability, reservation, delivery, or purchase unless the tool reports it. The tool only returns provider handoffs: login, payment, and final confirmation always happen with the user on the provider site.",
    });

  return createCopilotRuntimeHandler({
    runtime: new CopilotRuntime({
      agents: {
        default: createAgent(),
        bookyourgirlfriend: createAgent(),
      },
    }),
    basePath: "/api/copilotkit",
  });
}

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
