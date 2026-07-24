import { readFile, stat } from "node:fs/promises";
import type { Stats } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { Daytona, type DaytonaConfig } from "@daytona/sdk";

import { BookingError } from "@/lib/booking/errors";
import type {
  BookingProviderId,
  BookingSearchTask,
} from "@/types/booking";

const domainsByProvider: Record<BookingProviderId, readonly string[]> = {
  opentable: ["opentable.com"],
  resy: ["resy.com"],
  tock: ["exploretock.com"],
  "google-maps": ["google.com", "gstatic.com"],
  peerspace: ["peerspace.com"],
  eventup: ["eventup.com"],
  etsy: ["etsy.com"],
  "uncommon-goods": ["uncommongoods.com"],
  flowers: ["1800flowers.com"],
  viator: ["viator.com"],
  getyourguide: ["getyourguide.com"],
  airbnb: ["airbnb.com"],
  "google-hotels": ["google.com", "gstatic.com"],
  booking: ["booking.com"],
  hotels: ["hotels.com"],
  yelp: ["yelp.com"],
  "google-search": ["google.com", "gstatic.com"],
  "google-flights": ["google.com", "gstatic.com"],
  kayak: ["kayak.com"],
  skyscanner: ["skyscanner.com"],
  ticketmaster: ["ticketmaster.com"],
  eventbrite: ["eventbrite.com"],
  stubhub: ["stubhub.com"],
};

export function bookingDomainAllowList(
  searches: readonly BookingSearchTask[],
): string {
  const roots = new Set(
    searches.flatMap((search) => domainsByProvider[search.providerId]),
  );
  return [...roots]
    .flatMap((domain) => [domain, `*.${domain}`])
    .join(",");
}

interface CliProfile {
  id?: unknown;
  name?: unknown;
  activeOrganizationId?: unknown;
  target?: unknown;
  api?: { url?: unknown; key?: unknown; token?: unknown };
}

interface CliConfig {
  activeProfile?: unknown;
  profiles?: unknown;
}

export async function createBookingDaytonaClient(): Promise<Daytona> {
  if (hasEnvironmentCredentials()) {
    try {
      return new Daytona();
    } catch {
      throw unavailable(
        "Daytona environment credentials are incomplete. Configure DAYTONA_API_KEY, or DAYTONA_JWT_TOKEN with DAYTONA_ORGANIZATION_ID.",
      );
    }
  }

  const config = await readLocalCliConfig();
  if (!config) {
    throw unavailable(
      "Daytona is not configured. Set DAYTONA_API_KEY before starting a booking mission.",
    );
  }

  try {
    return new Daytona(config);
  } catch {
    throw unavailable("The active local Daytona CLI profile is not usable.");
  }
}

export async function disposeBookingDaytonaClient(
  client: Daytona,
): Promise<void> {
  try {
    await client[Symbol.asyncDispose]();
  } catch {
    // Individual mission sandboxes are deleted separately.
  }
}

function hasEnvironmentCredentials(): boolean {
  return Boolean(
    process.env.DAYTONA_API_KEY?.trim() ||
      (process.env.DAYTONA_JWT_TOKEN?.trim() &&
        process.env.DAYTONA_ORGANIZATION_ID?.trim()),
  );
}

async function readLocalCliConfig(): Promise<DaytonaConfig | null> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DAYTONA_ALLOW_LOCAL_CONFIG !== "1"
  ) {
    return null;
  }

  for (const candidate of localConfigCandidates()) {
    try {
      const fileStat = await stat(candidate);
      if (!fileStat.isFile() || !isPrivateFile(fileStat)) continue;
      const parsed = JSON.parse(await readFile(candidate, "utf8")) as CliConfig;
      const profile = selectProfile(parsed);
      if (profile) return profile;
    } catch {
      // Missing, insecure, or malformed profiles are ignored.
    }
  }
  return null;
}

function localConfigCandidates(): string[] {
  const userHome = homedir();
  const candidates = [
    path.join(userHome, ".config", "daytona", "config.json"),
    path.join(userHome, ".daytona", "config.json"),
  ];
  if (process.platform === "darwin") {
    candidates.unshift(
      path.join(
        userHome,
        "Library",
        "Application Support",
        "daytona",
        "config.json",
      ),
    );
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && path.isAbsolute(xdg)) {
    candidates.unshift(path.join(xdg, "daytona", "config.json"));
  }
  return [...new Set(candidates)];
}

function isPrivateFile(fileStat: Stats): boolean {
  if (process.platform === "win32") return true;
  const uid =
    typeof process.getuid === "function" ? process.getuid() : undefined;
  return (
    (uid === undefined || fileStat.uid === uid) &&
    (fileStat.mode & 0o077) === 0
  );
}

function selectProfile(config: CliConfig): DaytonaConfig | null {
  if (!Array.isArray(config.profiles)) return null;
  const profiles = config.profiles.filter(isProfile);
  const active = stringValue(config.activeProfile);
  const selected =
    profiles.find(
      (profile) =>
        stringValue(profile.id) === active ||
        stringValue(profile.name) === active,
    ) ?? (profiles.length === 1 ? profiles[0] : undefined);
  if (!selected?.api) return null;

  const configuredApiUrl = stringValue(selected.api.url);
  const apiUrl = validApiUrl(configuredApiUrl);
  if (configuredApiUrl && !apiUrl) return null;
  const target = stringValue(selected.target);
  const apiKey = stringValue(selected.api.key);
  if (apiKey) {
    return {
      apiKey,
      ...(apiUrl ? { apiUrl } : {}),
      ...(target ? { target } : {}),
    };
  }

  const jwtToken = accessToken(selected.api.token);
  const organizationId = stringValue(selected.activeOrganizationId);
  if (!jwtToken || !organizationId) return null;
  return {
    jwtToken,
    organizationId,
    ...(apiUrl ? { apiUrl } : {}),
    ...(target ? { target } : {}),
  };
}

function isProfile(value: unknown): value is CliProfile {
  return typeof value === "object" && value !== null;
}

function accessToken(value: unknown): string | undefined {
  const direct = stringValue(value);
  if (direct) return direct;
  return typeof value === "object" && value !== null
    ? stringValue((value as { accessToken?: unknown }).accessToken)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function validApiUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const local =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function unavailable(message: string): BookingError {
  return new BookingError("DAYTONA_UNAVAILABLE", message, 503);
}
