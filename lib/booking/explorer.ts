import type { Daytona, Sandbox } from "@daytona/sdk";

import { bookingDomainAllowList } from "@/lib/booking/daytona";
import { BookingError } from "@/lib/booking/errors";
import type {
  BookingOption,
  BookingSearchTask,
} from "@/types/booking";

const PROVIDERS = {
  opentable: { name: "OpenTable", host: "www.opentable.com" },
  resy: { name: "Resy", host: "resy.com" },
  tock: { name: "Tock", host: "www.exploretock.com" },
  "google-maps": { name: "Google Maps", host: "www.google.com" },
  peerspace: { name: "Peerspace", host: "www.peerspace.com" },
  eventup: { name: "EventUp", host: "eventup.com" },
  etsy: { name: "Etsy", host: "www.etsy.com" },
  "uncommon-goods": {
    name: "Uncommon Goods",
    host: "www.uncommongoods.com",
  },
  flowers: { name: "1-800-Flowers", host: "www.1800flowers.com" },
  viator: { name: "Viator", host: "www.viator.com" },
  getyourguide: { name: "GetYourGuide", host: "www.getyourguide.com" },
  airbnb: { name: "Airbnb Experiences", host: "www.airbnb.com" },
  "google-hotels": { name: "Google Hotels", host: "www.google.com" },
  booking: { name: "Booking.com", host: "www.booking.com" },
  hotels: { name: "Hotels.com", host: "www.hotels.com" },
  yelp: { name: "Yelp", host: "www.yelp.com" },
  "google-search": { name: "Google Search", host: "www.google.com" },
  "google-flights": { name: "Google Flights", host: "www.google.com" },
  kayak: { name: "KAYAK", host: "www.kayak.com" },
  skyscanner: { name: "Skyscanner", host: "www.skyscanner.com" },
  ticketmaster: { name: "Ticketmaster", host: "www.ticketmaster.com" },
  eventbrite: { name: "Eventbrite", host: "www.eventbrite.com" },
  stubhub: { name: "StubHub", host: "www.stubhub.com" },
} as const;

const AGENT_PROGRAM = String.raw`
"use strict";
const fs = require("node:fs");

const input = JSON.parse(fs.readFileSync("mission.json", "utf8"));
const enc = encodeURIComponent;
const providers = {
  "opentable": { name: "OpenTable", url: q => "https://www.opentable.com/s?term=" + enc(q) },
  "resy": { name: "Resy", url: q => "https://resy.com/?query=" + enc(q) },
  "tock": { name: "Tock", url: q => "https://www.exploretock.com/search?query=" + enc(q) },
  "google-maps": { name: "Google Maps", url: q => "https://www.google.com/maps/search/" + enc(q) },
  "peerspace": { name: "Peerspace", url: q => "https://www.peerspace.com/s/?q=" + enc(q) },
  "eventup": { name: "EventUp", url: q => "https://eventup.com/venues/?q=" + enc(q) },
  "etsy": { name: "Etsy", url: q => "https://www.etsy.com/search?q=" + enc(q) },
  "uncommon-goods": { name: "Uncommon Goods", url: q => "https://www.uncommongoods.com/search?q=" + enc(q) },
  "flowers": { name: "1-800-Flowers", url: q => "https://www.1800flowers.com/searchterm-" + enc(q) },
  "viator": { name: "Viator", url: q => "https://www.viator.com/searchResults/all?text=" + enc(q) },
  "getyourguide": { name: "GetYourGuide", url: q => "https://www.getyourguide.com/s/?q=" + enc(q) },
  "airbnb": { name: "Airbnb Experiences", url: q => "https://www.airbnb.com/s/experiences?query=" + enc(q) },
  "google-hotels": { name: "Google Hotels", url: q => "https://www.google.com/travel/search?q=" + enc(q) },
  "booking": { name: "Booking.com", url: q => "https://www.booking.com/searchresults.html?ss=" + enc(q) },
  "hotels": { name: "Hotels.com", url: q => "https://www.hotels.com/Hotel-Search?destination=" + enc(q) },
  "yelp": { name: "Yelp", url: q => "https://www.yelp.com/search?find_desc=" + enc(q) },
  "google-search": { name: "Google Search", url: q => "https://www.google.com/search?q=" + enc(q) },
  "google-flights": { name: "Google Flights", url: q => "https://www.google.com/travel/flights?q=" + enc(q) },
  "kayak": { name: "KAYAK", url: q => "https://www.kayak.com/flights?search=" + enc(q) },
  "skyscanner": { name: "Skyscanner", url: q => "https://www.skyscanner.com/transport/flights/?query=" + enc(q) },
  "ticketmaster": { name: "Ticketmaster", url: q => "https://www.ticketmaster.com/search?q=" + enc(q) },
  "eventbrite": { name: "Eventbrite", url: q => "https://www.eventbrite.com/d/united-states/events/?q=" + enc(q) },
  "stubhub": { name: "StubHub", url: q => "https://www.stubhub.com/search?q=" + enc(q) },
};

async function boundedText(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (text.length < 96000) {
    const part = await reader.read();
    if (part.done) break;
    text += decoder.decode(part.value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return text.slice(0, 96000);
}

function cleanTitle(html, fallback) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (match ? match[1] : fallback)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || fallback;
}

async function inspect(task, index) {
  const provider = providers[task.providerId];
  if (!provider) throw new Error("Unsupported provider");
  const url = provider.url(task.query);
  let httpStatus = null;
  let title = provider.name + " live booking search";
  let status = "handoff";
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Book-Your-Girlfriend-Agent/1.0 (+experience-research)",
        "accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    httpStatus = response.status;
    status = response.status >= 200 && response.status < 400 ? "reachable" : "handoff";
    title = cleanTitle(await boundedText(response), title);
  } catch {
    status = "handoff";
  }
  return {
    id: "option-" + (index + 1),
    providerId: task.providerId,
    provider: provider.name,
    title,
    url,
    status,
    httpStatus,
    reason: task.reason,
    checkedAt: new Date().toISOString(),
  };
}

Promise.all(input.searches.map(inspect))
  .then(results => process.stdout.write(JSON.stringify({ results })))
  .catch(() => {
    process.stdout.write(JSON.stringify({ error: "Booking agent failed safely." }));
    process.exitCode = 1;
  });
`;

interface AgentPayload {
  results?: Array<Omit<BookingOption, "host" | "priceNote">>;
  error?: string;
}

export interface SandboxExploration {
  workspaceId: string;
  options: BookingOption[];
  cleanupConfirmed: boolean;
  allowedDomainCount: number;
}

export async function exploreBookingProviders(
  daytona: Daytona,
  runId: string,
  searches: BookingSearchTask[],
  onOption?: (option: BookingOption) => void | Promise<void>,
): Promise<SandboxExploration> {
  let sandbox: Sandbox | undefined;
  let workspaceId = "unavailable";
  let options: BookingOption[] = [];
  let cleanupConfirmed = false;
  let operationError: unknown;
  const domainAllowList = bookingDomainAllowList(searches);

  try {
    sandbox = await daytona.create(
      {
        language: "typescript",
        ephemeral: true,
        ttlMinutes: 10,
        autoStopInterval: 5,
        public: false,
        domainAllowList,
        labels: {
          application: "book-your-girlfriend",
          run: runId.slice(0, 24),
          role: "booking-agent",
        },
      },
      { timeout: 60 },
    );
    workspaceId = sandbox.id;
    if (!sameDomainList(sandbox.domainAllowList, domainAllowList)) {
      throw new BookingError(
        "SANDBOX_POLICY_FAILED",
        "Daytona did not confirm the provider-only network policy.",
        502,
      );
    }

    await sandbox.fs.createFolder("agent", "755");
    await Promise.all([
      sandbox.fs.uploadFile(
        Buffer.from(AGENT_PROGRAM, "utf8"),
        "agent/booking-agent.js",
        15,
      ),
      sandbox.fs.uploadFile(
        Buffer.from(JSON.stringify({ searches }), "utf8"),
        "agent/mission.json",
        15,
      ),
    ]);

    const response = await hardTimeout(
      sandbox.process.executeCommand(
        "node booking-agent.js",
        "agent",
        undefined,
        45,
      ),
      50_000,
    );
    if (response.exitCode !== 0 || response.result.length > 120_000) {
      throw new BookingError(
        "SANDBOX_AGENT_FAILED",
        "The Daytona booking agent did not return bounded evidence.",
        502,
      );
    }

    const payload = JSON.parse(response.result) as AgentPayload;
    if (payload.error || !Array.isArray(payload.results)) {
      throw new BookingError(
        "SANDBOX_AGENT_FAILED",
        "The Daytona booking agent failed safely.",
        502,
      );
    }
    options = payload.results.map(normalizeBookingOption);
    for (const option of options) {
      await onOption?.(option);
    }
  } catch (error) {
    operationError = error;
  } finally {
    if (sandbox) {
      try {
        await hardTimeout(sandbox.delete(60, true), 65_000);
        cleanupConfirmed = true;
      } catch {
        cleanupConfirmed = false;
      }
    }
  }

  if (operationError) throw operationError;
  return {
    workspaceId,
    options,
    cleanupConfirmed,
    allowedDomainCount: domainAllowList.split(",").length,
  };
}

export function normalizeBookingOption(
  value: Omit<BookingOption, "host" | "priceNote">,
): BookingOption {
  const provider = PROVIDERS[value.providerId];
  if (!provider) {
    throw new BookingError(
      "UNSAFE_PROVIDER_RESULT",
      "The booking agent returned an unsupported provider.",
      502,
    );
  }
  const url = new URL(value.url);
  if (url.protocol !== "https:" || url.hostname !== provider.host) {
    throw new BookingError(
      "UNSAFE_PROVIDER_RESULT",
      "The booking agent returned an unsafe handoff URL.",
      502,
    );
  }
  return {
    ...value,
    provider: provider.name,
    host: url.hostname,
    title: clean(value.title, 180) || `${provider.name} live booking search`,
    reason: clean(value.reason, 220),
    priceNote: "Live price and availability are confirmed on the provider site.",
  };
}

function clean(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

function sameDomainList(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const normalize = (value: string) =>
    value
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean)
      .sort();
  const left = normalize(actual);
  const right = normalize(expected);
  return (
    left.length === right.length &&
    left.every((domain, index) => domain === right[index])
  );
}

async function hardTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Operation timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
