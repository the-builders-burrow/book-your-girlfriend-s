import { readFile } from "node:fs/promises";
import path from "node:path";

import { initLogger, type Logger, type Span } from "braintrust";

import { BookingError } from "@/lib/booking/errors";
import type { BookingInput, BookingRun } from "@/types/booking";

let logger: Logger<true> | undefined;

export async function withBookingTrace(
  runId: string,
  input: BookingInput,
  execute: (span: Span) => Promise<BookingRun>,
): Promise<BookingRun> {
  const activeLogger = await bookingLogger();
  try {
    return await activeLogger.traced(
      async (span) => {
        span.log({
          input: {
            category: input.category,
            request: input.request,
            origin: input.origin,
            destination: input.destination,
            dates: [input.startDate, input.endDate].filter(Boolean),
            partySize: input.partySize,
          },
          metadata: { runId, product: "Book Your Girlfriend" },
        });
        const result = await execute(span);
        const reachable = result.options.filter(
          (option) => option.status === "reachable",
        ).length;
        span.log({
          output: {
            status: result.status,
            providers: result.options.map((option) => ({
              provider: option.provider,
              status: option.status,
              httpStatus: option.httpStatus,
            })),
            confirmationRequired: result.confirmationRequired,
          },
          metrics: { durationMs: result.durationMs },
          scores: {
            provider_reachability:
              result.options.length > 0 ? reachable / result.options.length : 0,
            safe_handoff: result.confirmationRequired ? 1 : 0,
            cleanup_confirmed: result.sandbox.cleanupConfirmed ? 1 : 0,
          },
        });
        return result;
      },
      { name: "book-your-girlfriend-mission", type: "task" },
    );
  } finally {
    await flushBounded(activeLogger);
  }
}

async function bookingLogger(): Promise<Logger<true>> {
  if (logger) return logger;
  const fallback = await braintrustFileValues();
  const apiKey =
    process.env.BRAINTRUST_API_KEY?.trim() || fallback.BRAINTRUST_API_KEY;
  if (!apiKey) {
    throw new BookingError(
      "BRAINTRUST_UNAVAILABLE",
      "Braintrust tracing is not configured.",
      503,
    );
  }
  const projectName =
    process.env.BRAINTRUST_PROJECT?.trim() ||
    fallback.BRAINTRUST_PROJECT ||
    "Book Your Girlfriend";
  try {
    logger = initLogger({
      apiKey,
      projectName,
      asyncFlush: true,
      noExitFlush: true,
      setCurrent: false,
      debugLogLevel: false,
    });
    return logger;
  } catch {
    throw new BookingError(
      "BRAINTRUST_UNAVAILABLE",
      "Braintrust tracing could not be initialized.",
      503,
    );
  }
}

async function braintrustFileValues(): Promise<Record<string, string>> {
  try {
    const contents = await readFile(
      path.join(process.cwd(), ".env.braintrust"),
      "utf8",
    );
    const values: Record<string, string> = {};
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(
        /^\s*(BRAINTRUST_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/,
      );
      if (!match) continue;
      const raw = match[2];
      const value =
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
          ? raw.slice(1, -1)
          : raw;
      if (value) values[match[1]] = value;
    }
    return values;
  } catch {
    return {};
  }
}

async function flushBounded(activeLogger: Logger<true>): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      activeLogger.flush(),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 5_000);
      }),
    ]);
  } catch {
    // Telemetry delivery must not invalidate a safe booking handoff.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
