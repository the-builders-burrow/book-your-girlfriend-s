import { acquireBookingSlot } from "@/lib/booking/concurrency";
import {
  BookingError,
  publicBookingError,
} from "@/lib/booking/errors";
import { parseBookingRequest } from "@/lib/booking/input";
import { runBookingMission } from "@/lib/booking/orchestrator";
import type { BookingEvent, BookingInput } from "@/types/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BODY_BYTES = 16_384;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const body = await readRequestBody(request);
    const parsed = parseBookingRequest(body);
    const stream =
      parsed.stream ||
      request.headers.get("accept")?.includes("text/event-stream") === true;
    const release = acquireBookingSlot();

    if (stream) {
      try {
        return streamingResponse(parsed.input, release);
      } catch (error) {
        release();
        throw error;
      }
    }

    const run = await runBookingMission(parsed.input, undefined, release);
    return Response.json(
      { ok: true, run },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const publicError = publicBookingError(error);
    const status = error instanceof BookingError ? error.status : 500;
    const headers = new Headers({ "Cache-Control": "no-store" });
    if (status === 429) headers.set("Retry-After", "15");
    return Response.json(
      { ok: false, error: publicError },
      { status, headers },
    );
  }
}

function streamingResponse(
  input: BookingInput,
  release: () => void,
): Response {
  const encoder = new TextEncoder();
  let disconnected = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: BookingEvent) => {
        if (disconnected) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          disconnected = true;
        }
      };

      void runBookingMission(input, emit, release)
        .catch((error) =>
          emit({ type: "error", error: publicBookingError(error) }),
        )
        .finally(() => {
          if (!disconnected) controller.close();
        });
    },
    cancel() {
      disconnected = true;
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10,
  );
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {
    throw new BookingError(
      "REQUEST_TOO_LARGE",
      "Request body exceeds the 16 KB limit.",
      413,
    );
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new BookingError(
      "REQUEST_TOO_LARGE",
      "Request body exceeds the 16 KB limit.",
      413,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BookingError(
      "INVALID_JSON",
      "Request body must contain valid JSON.",
      400,
    );
  }
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new BookingError(
      "ORIGIN_NOT_ALLOWED",
      "Cross-origin booking requests are not allowed.",
      403,
    );
  }
}
