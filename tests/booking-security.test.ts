import assert from "node:assert/strict";
import test from "node:test";

import { bookingDomainAllowList } from "../lib/booking/daytona";
import { BookingError } from "../lib/booking/errors";
import { normalizeBookingOption } from "../lib/booking/explorer";

const safeOption = {
  id: "option-1",
  providerId: "tock" as const,
  provider: "untrusted display name",
  title: "Tickets",
  url: "https://www.exploretock.com/search?query=anniversary",
  status: "reachable" as const,
  httpStatus: 200,
  reason: "Search the primary ticket provider.",
  checkedAt: "2026-07-24T00:00:00.000Z",
};

test("normalizes provider identity from the trusted map", () => {
  const option = normalizeBookingOption(safeOption);

  assert.equal(option.provider, "Tock");
  assert.equal(option.host, "www.exploretock.com");
  assert.match(option.priceNote, /Live price and availability/);
});

test("rejects a provider URL on an untrusted host", () => {
  assert.throws(
    () =>
      normalizeBookingOption({
        ...safeOption,
        url: "https://exploretock.example/collect-card",
      }),
    (error) =>
      error instanceof BookingError &&
      error.code === "UNSAFE_PROVIDER_RESULT",
  );
});

test("rejects non-HTTPS provider URLs", () => {
  assert.throws(
    () =>
      normalizeBookingOption({
        ...safeOption,
        url: "http://www.exploretock.com/search?query=anniversary",
      }),
    BookingError,
  );
});

test("builds a mission-specific Daytona allow list below the platform limit", () => {
  const allowList = bookingDomainAllowList([
    {
      providerId: "opentable",
      query: "anniversary dinner",
      reason: "Research live restaurant handoffs.",
    },
    {
      providerId: "resy",
      query: "anniversary dinner",
      reason: "Research live restaurant handoffs.",
    },
    {
      providerId: "tock",
      query: "anniversary dinner",
      reason: "Research live restaurant handoffs.",
    },
  ]).split(",");

  assert.equal(allowList.length, 6);
  assert.ok(allowList.includes("exploretock.com"));
  assert.ok(!allowList.includes("etsy.com"));
});

test("limits flight and ticket missions to their exact provider roots", () => {
  const flightAllowList = bookingDomainAllowList([
    {
      providerId: "google-flights",
      query: "SFO to JFK round trip",
      reason: "Compare live flight search handoffs.",
    },
    {
      providerId: "kayak",
      query: "SFO to JFK round trip",
      reason: "Compare live flight search handoffs.",
    },
    {
      providerId: "skyscanner",
      query: "SFO to JFK round trip",
      reason: "Compare live flight search handoffs.",
    },
  ]).split(",");
  const ticketAllowList = bookingDomainAllowList([
    {
      providerId: "ticketmaster",
      query: "jazz tickets New York",
      reason: "Compare live event ticket handoffs.",
    },
    {
      providerId: "eventbrite",
      query: "jazz tickets New York",
      reason: "Compare live event ticket handoffs.",
    },
    {
      providerId: "stubhub",
      query: "jazz tickets New York",
      reason: "Compare live event ticket handoffs.",
    },
  ]).split(",");

  assert.deepEqual(
    new Set(flightAllowList),
    new Set([
      "google.com",
      "*.google.com",
      "gstatic.com",
      "*.gstatic.com",
      "kayak.com",
      "*.kayak.com",
      "skyscanner.com",
      "*.skyscanner.com",
    ]),
  );
  assert.deepEqual(
    new Set(ticketAllowList),
    new Set([
      "ticketmaster.com",
      "*.ticketmaster.com",
      "eventbrite.com",
      "*.eventbrite.com",
      "stubhub.com",
      "*.stubhub.com",
    ]),
  );
});

test("normalizes new provider identities only on their exact HTTPS hosts", () => {
  const flight = normalizeBookingOption({
    ...safeOption,
    providerId: "google-flights",
    provider: "untrusted display name",
    url: "https://www.google.com/travel/flights?q=SFO%20JFK",
  });
  const ticket = normalizeBookingOption({
    ...safeOption,
    providerId: "ticketmaster",
    provider: "untrusted display name",
    url: "https://www.ticketmaster.com/search?q=jazz",
  });

  assert.equal(flight.provider, "Google Flights");
  assert.equal(flight.host, "www.google.com");
  assert.equal(ticket.provider, "Ticketmaster");
  assert.throws(
    () =>
      normalizeBookingOption({
        ...safeOption,
        providerId: "stubhub",
        url: "https://checkout.stubhub.example/collect-card",
      }),
    BookingError,
  );
});
