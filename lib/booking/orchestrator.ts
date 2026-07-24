import { randomUUID } from "node:crypto";

import type { Daytona } from "@daytona/sdk";
import type { Span } from "braintrust";

import { acquireBookingSlot } from "@/lib/booking/concurrency";
import {
  createBookingDaytonaClient,
  disposeBookingDaytonaClient,
} from "@/lib/booking/daytona";
import { exploreBookingProviders } from "@/lib/booking/explorer";
import { planBookingMission } from "@/lib/booking/model";
import { withBookingTrace } from "@/lib/booking/trace";
import type {
  BookingEventSink,
  BookingInput,
  BookingRun,
} from "@/types/booking";

export async function runBookingMission(
  input: BookingInput,
  emit: BookingEventSink = () => undefined,
  reservedRelease?: () => void,
): Promise<BookingRun> {
  const release = reservedRelease ?? acquireBookingSlot();
  const runId = randomUUID();
  try {
    return await withBookingTrace(runId, input, (span) =>
      executeBookingMission(runId, input, span, emit),
    );
  } finally {
    release();
  }
}

async function executeBookingMission(
  runId: string,
  input: BookingInput,
  rootSpan: Span,
  emit: BookingEventSink,
): Promise<BookingRun> {
  const started = Date.now();
  let daytona: Daytona | undefined;

  await emit({
    type: "phase",
    phase: "validating",
    message: "Request validated. Paid actions remain locked behind your approval.",
  });

  try {
    await emit({
      type: "phase",
      phase: "planning",
      message: "Fireworks is translating your request into provider-safe search tasks.",
    });
    const plan = await rootSpan.traced(
      async (span) => {
        const result = await planBookingMission(input);
        span.log({
          output: {
            headline: result.headline,
            providers: result.searches.map((search) => search.providerId),
            priorities: result.priorities,
          },
        });
        return result;
      },
      { name: "fireworks-booking-plan", type: "llm" },
    );

    daytona = await createBookingDaytonaClient();
    await emit({
      type: "phase",
      phase: "sandbox",
      message: "A Daytona agent is checking live provider handoffs in an isolated workspace.",
    });
    const exploration = await rootSpan.traced(
      async (span) => {
        const result = await exploreBookingProviders(
          daytona!,
          runId,
          plan.searches,
          (option) => emit({ type: "option", option }),
        );
        span.log({
          output: {
            workspaceId: result.workspaceId,
            options: result.options.map((option) => ({
              provider: option.provider,
              status: option.status,
              httpStatus: option.httpStatus,
            })),
            cleanupConfirmed: result.cleanupConfirmed,
          },
        });
        return result;
      },
      { name: "daytona-booking-agent", type: "task" },
    );

    await emit({
      type: "phase",
      phase: "comparing",
      message: "Comparing provider evidence and preparing a confirmation-safe handoff.",
    });
    const warnings: string[] = [];
    const unreachable = exploration.options.filter(
      (option) => option.status !== "reachable",
    ).length;
    if (unreachable > 0) {
      warnings.push(
        `${unreachable} provider${unreachable === 1 ? "" : "s"} blocked automated inspection; the live handoff link is still available.`,
      );
    }
    if (!exploration.cleanupConfirmed) {
      warnings.push(
        "Daytona cleanup was not confirmed; the workspace retains its 10 minute automatic TTL.",
      );
    }
    const completed = Date.now();
    const run: BookingRun = {
      id: runId,
      status: warnings.length ? "partial" : "ready",
      createdAt: new Date(started).toISOString(),
      durationMs: completed - started,
      input,
      plan,
      options: exploration.options,
      sandbox: {
        provider: "Daytona",
        workspaceId: exploration.workspaceId,
        networkPolicy: `${exploration.allowedDomainCount} mission-specific provider domains; no credentials mounted`,
        checkedProviders: exploration.options.length,
        cleanupConfirmed: exploration.cleanupConfirmed,
      },
      confirmationRequired: true,
      warnings,
    };
    await emit({
      type: "phase",
      phase: "ready",
      message: "Mission ready. Choose a provider to confirm live price and availability.",
    });
    await emit({ type: "complete", run });
    return run;
  } finally {
    if (daytona) {
      await disposeBookingDaytonaClient(daytona);
    }
  }
}
