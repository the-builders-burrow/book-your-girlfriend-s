export const bookingCategories = [
  "restaurant",
  "venue",
  "gift",
  "experience",
  "getaway",
  "surprise",
  "flight",
  "ticket",
  "anything",
] as const;

export type BookingCategory = (typeof bookingCategories)[number];

export interface BookingRequest {
  category: BookingCategory;
  request: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  partySize?: number;
  budget?: number;
  currency?: string;
  preferences?: string;
  stream?: boolean;
}

export interface BookingInput {
  category: BookingCategory;
  request: string;
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  partySize: number;
  budget?: number;
  currency: string;
  preferences?: string;
}

export type BookingPhase =
  | "validating"
  | "planning"
  | "sandbox"
  | "comparing"
  | "ready";

export type BookingProviderId =
  | "opentable"
  | "resy"
  | "tock"
  | "google-maps"
  | "peerspace"
  | "eventup"
  | "etsy"
  | "uncommon-goods"
  | "flowers"
  | "viator"
  | "getyourguide"
  | "airbnb"
  | "google-hotels"
  | "booking"
  | "hotels"
  | "yelp"
  | "google-search"
  | "google-flights"
  | "kayak"
  | "skyscanner"
  | "ticketmaster"
  | "eventbrite"
  | "stubhub";

export interface BookingSearchTask {
  providerId: BookingProviderId;
  query: string;
  reason: string;
}

export interface BookingAgentPlan {
  headline: string;
  summary: string;
  normalizedRequest: string;
  searches: BookingSearchTask[];
  priorities: string[];
  assumptions: string[];
  voiceBriefing: string;
}

export interface BookingOption {
  id: string;
  providerId: BookingProviderId;
  provider: string;
  title: string;
  url: string;
  host: string;
  status: "reachable" | "handoff";
  httpStatus: number | null;
  reason: string;
  priceNote: string;
  checkedAt: string;
}

export interface BookingRun {
  id: string;
  status: "ready" | "partial";
  createdAt: string;
  durationMs: number;
  input: BookingInput;
  plan: BookingAgentPlan;
  options: BookingOption[];
  sandbox: {
    provider: "Daytona";
    workspaceId: string;
    networkPolicy: string;
    checkedProviders: number;
    cleanupConfirmed: boolean;
  };
  confirmationRequired: true;
  warnings: string[];
}

export type BookingEvent =
  | { type: "phase"; phase: BookingPhase; message: string }
  | { type: "option"; option: BookingOption }
  | { type: "complete"; run: BookingRun }
  | { type: "error"; error: { code: string; message: string } };

export type BookingEventSink = (
  event: BookingEvent,
) => void | Promise<void>;
