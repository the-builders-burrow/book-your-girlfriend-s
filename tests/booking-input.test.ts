import assert from "node:assert/strict";
import test from "node:test";

import { BookingError } from "../lib/booking/errors";
import { parseBookingRequest } from "../lib/booking/input";

test("normalizes a restaurant experience mission", () => {
  const { input, stream } = parseBookingRequest({
    category: "restaurant",
    request: "Find an exceptional anniversary dinner with a beautiful room.",
    destination: "San Francisco",
    partySize: 2,
    budget: 1200,
    currency: "USD",
    stream: true,
  });

  assert.equal(input.category, "restaurant");
  assert.equal(input.partySize, 2);
  assert.equal(input.currency, "USD");
  assert.equal(stream, true);
});

test("applies safe defaults for romantic experience missions", () => {
  const { input, stream } = parseBookingRequest({
    category: "restaurant",
    request: "Find a quiet Italian restaurant suitable for an anniversary.",
    destination: "San Francisco",
  });

  assert.equal(input.partySize, 2);
  assert.equal(input.currency, "USD");
  assert.equal(stream, false);
});

test("accepts a getaway with flexible departure details", () => {
  const { input } = parseBookingRequest({
    category: "getaway",
    request: "Find a romantic weekend escape with a spa and ocean views.",
    destination: "Big Sur",
  });

  assert.equal(input.category, "getaway");
  assert.equal(input.destination, "Big Sur");
});

test("rejects reversed dates and unknown fields", () => {
  assert.throws(
    () =>
      parseBookingRequest({
        category: "getaway",
        request: "Find a romantic hotel with a spa and flexible cancellation.",
        startDate: "2026-08-10",
        endDate: "2026-08-01",
      }),
    (error) =>
      error instanceof BookingError && error.code === "INVALID_DATES",
  );

  assert.throws(
    () =>
      parseBookingRequest({
        category: "experience",
        request: "Find a private jazz experience for this weekend.",
        cardNumber: "never accepted",
      }),
    BookingError,
  );
});
