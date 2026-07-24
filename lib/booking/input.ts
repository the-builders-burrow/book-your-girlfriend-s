import { z } from "zod";

import { BookingError } from "@/lib/booking/errors";
import {
  bookingCategories,
  type BookingInput,
  type BookingRequest,
} from "@/types/booking";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const bookingRequestSchema = z
  .object({
    category: z.enum(bookingCategories),
    request: z.string().trim().min(10).max(2_500),
    origin: z.string().trim().min(2).max(120).optional(),
    destination: z.string().trim().min(2).max(160).optional(),
    startDate: z.string().regex(datePattern).optional(),
    endDate: z.string().regex(datePattern).optional(),
    partySize: z.number().int().min(1).max(20).optional(),
    budget: z.number().positive().max(1_000_000).optional(),
    currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
    preferences: z.string().trim().max(1_200).optional(),
    stream: z.boolean().optional(),
  })
  .strict();

export function parseBookingRequest(value: unknown): {
  input: BookingInput;
  stream: boolean;
} {
  const parsed = bookingRequestSchema.safeParse(value);
  if (!parsed.success) {
    throw new BookingError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Booking request is invalid.",
      400,
    );
  }

  const request: BookingRequest = parsed.data;
  if (
    request.startDate &&
    request.endDate &&
    request.endDate < request.startDate
  ) {
    throw new BookingError(
      "INVALID_DATES",
      "End date must be on or after the start date.",
      400,
    );
  }

  if (
    request.category === "flight" &&
    (!request.origin || !request.destination)
  ) {
    throw new BookingError(
      "MISSING_ROUTE",
      "Flight missions require both a departure point and destination.",
      400,
    );
  }

  return {
    input: {
      category: request.category,
      request: request.request,
      origin: request.origin,
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      partySize: request.partySize ?? 2,
      budget: request.budget,
      currency: request.currency ?? "USD",
      preferences: request.preferences,
    },
    stream: request.stream ?? false,
  };
}
