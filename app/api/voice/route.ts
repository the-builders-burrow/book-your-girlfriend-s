import { BookingError, publicBookingError } from "@/lib/booking/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      throw new BookingError(
        "ELEVENLABS_UNAVAILABLE",
        "ElevenLabs voice is ready for an API key but is not configured yet.",
        503,
      );
    }
    const body = (await request.json()) as { text?: unknown };
    const text =
      typeof body.text === "string" ? body.text.trim().slice(0, 900) : "";
    if (text.length < 10) {
      throw new BookingError(
        "INVALID_VOICE_TEXT",
        "Voice briefing text is too short.",
        400,
      );
    }
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID?.trim() ||
      "JBFqnCBsd6RMkjVDRZzb";
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id:
            process.env.ELEVENLABS_MODEL?.trim() ||
            "eleven_multilingual_v2",
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok || !response.body) {
      throw new BookingError(
        "VOICE_GENERATION_FAILED",
        response.status === 401 || response.status === 403
          ? "ElevenLabs rejected the configured API key."
          : "ElevenLabs could not generate this briefing.",
        response.status === 429 ? 429 : 502,
      );
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const publicError = publicBookingError(error);
    return Response.json(
      { ok: false, error: publicError },
      {
        status: error instanceof BookingError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new BookingError(
      "ORIGIN_NOT_ALLOWED",
      "Cross-origin voice requests are not allowed.",
      403,
    );
  }
}
