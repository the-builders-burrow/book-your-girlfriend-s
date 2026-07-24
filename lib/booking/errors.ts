export class BookingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export function publicBookingError(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof BookingError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "BOOKING_FAILED",
    message: "The booking mission stopped before it produced a safe handoff.",
  };
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
