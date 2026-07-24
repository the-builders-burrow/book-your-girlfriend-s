import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";

import { parseBookingRequest } from "@/lib/booking/input";
import { runBookingMission } from "@/lib/booking/orchestrator";
import { bookingCategories } from "@/types/booking";

export const startBookingMissionTool = defineTool({
  name: "startBookingMission",
  description:
    "Start a real provider research mission in an isolated Daytona workspace. Use only when the user explicitly asks to search or prepare a booking. This does not purchase, reserve, or submit payment.",
  parameters: z.object({
    category: z.enum(bookingCategories),
    request: z.string().min(10).max(2_500),
    origin: z.string().max(120).optional(),
    destination: z.string().max(160).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    partySize: z.number().int().min(1).max(20).default(2),
    budget: z.number().positive().max(1_000_000).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
    preferences: z.string().max(1_200).optional(),
  }),
  execute: async (args) => {
    try {
      const { input } = parseBookingRequest(args);
      const run = await runBookingMission(input);
      return {
        ok: true,
        runId: run.id,
        status: run.status,
        headline: run.plan.headline,
        summary: run.plan.summary,
        options: run.options,
        confirmationRequired: run.confirmationRequired,
        warnings: run.warnings,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The booking mission failed safely.",
        retryable: true,
      };
    }
  },
});
