"use client";

import {
  CopilotSidebar,
  useAgentContext,
} from "@copilotkit/react-core/v2";
import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Drama,
  ExternalLink,
  Gift,
  Headphones,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Plane,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Utensils,
  Volume2,
  WalletCards,
  WandSparkles,
  XCircle,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  BookingCategory,
  BookingOption,
  BookingPhase,
  BookingRun,
} from "@/types/booking";

type MissionState = "idle" | "running" | "ready" | "error";

interface MissionEvent {
  id: number;
  phase: BookingPhase;
  message: string;
  elapsedMs: number;
}

const categories: Array<{
  id: BookingCategory;
  label: string;
  icon: ReactNode;
}> = [
  { id: "restaurant", label: "Restaurants", icon: <Utensils size={17} /> },
  { id: "ticket", label: "Tickets", icon: <Ticket size={17} /> },
  { id: "flight", label: "Flights", icon: <Plane size={17} /> },
  { id: "venue", label: "Venues", icon: <Drama size={17} /> },
  { id: "gift", label: "Gifts", icon: <Gift size={17} /> },
  { id: "experience", label: "Experiences", icon: <Sparkles size={17} /> },
  { id: "getaway", label: "Getaways", icon: <Compass size={17} /> },
  { id: "surprise", label: "Surprise me", icon: <Heart size={17} /> },
  { id: "anything", label: "Anything", icon: <Search size={17} /> },
];

const phaseOrder: BookingPhase[] = [
  "validating",
  "planning",
  "sandbox",
  "comparing",
  "ready",
];

const phaseLabels: Record<BookingPhase, string> = {
  validating: "Secure brief",
  planning: "Fireworks plan",
  sandbox: "Daytona agent",
  comparing: "Compare",
  ready: "Your handoff",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeOption(value: unknown, index = 0): BookingOption {
  const option = isRecord(value) ? value : {};
  return {
    id: stringValue(option.id, `option-${index + 1}`),
    providerId: stringValue(
      option.providerId,
      "google-search",
    ) as BookingOption["providerId"],
    provider: stringValue(option.provider, "Booking provider"),
    title: stringValue(option.title, "Live provider search"),
    url: stringValue(option.url),
    host: stringValue(option.host),
    status:
      stringValue(option.status) === "reachable" ? "reachable" : "handoff",
    httpStatus:
      typeof option.httpStatus === "number" ? option.httpStatus : null,
    reason: stringValue(option.reason),
    priceNote: stringValue(
      option.priceNote,
      "Live price and availability are confirmed on the provider site.",
    ),
    checkedAt: stringValue(option.checkedAt),
  };
}

function normalizeRun(value: unknown): BookingRun {
  if (!isRecord(value)) throw new Error("The booking result was unreadable.");
  const input = isRecord(value.input) ? value.input : {};
  const plan = isRecord(value.plan) ? value.plan : {};
  const sandbox = isRecord(value.sandbox) ? value.sandbox : {};
  return {
    id: stringValue(value.id, crypto.randomUUID()),
    status: stringValue(value.status) === "partial" ? "partial" : "ready",
    createdAt: stringValue(value.createdAt),
    durationMs: numberValue(value.durationMs),
    input: {
      category: stringValue(input.category, "other") as BookingCategory,
      request: stringValue(input.request),
      origin: stringValue(input.origin) || undefined,
      destination: stringValue(input.destination) || undefined,
      startDate: stringValue(input.startDate) || undefined,
      endDate: stringValue(input.endDate) || undefined,
      partySize: numberValue(input.partySize, 2),
      budget:
        typeof input.budget === "number" ? input.budget : undefined,
      currency: stringValue(input.currency, "USD"),
      preferences: stringValue(input.preferences) || undefined,
    },
    plan: {
      headline: stringValue(plan.headline, "Your booking handoff is ready"),
      summary: stringValue(plan.summary),
      normalizedRequest: stringValue(plan.normalizedRequest),
      searches: Array.isArray(plan.searches)
        ? plan.searches.map((search) => {
            const task = isRecord(search) ? search : {};
            return {
              providerId: stringValue(
                task.providerId,
                "google-search",
              ) as BookingOption["providerId"],
              query: stringValue(task.query),
              reason: stringValue(task.reason),
            };
          })
        : [],
      priorities: Array.isArray(plan.priorities)
        ? plan.priorities.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
      assumptions: Array.isArray(plan.assumptions)
        ? plan.assumptions.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
      voiceBriefing: stringValue(plan.voiceBriefing),
    },
    options: Array.isArray(value.options)
      ? value.options.map(normalizeOption)
      : [],
    sandbox: {
      provider: "Daytona",
      workspaceId: stringValue(sandbox.workspaceId),
      networkPolicy: stringValue(sandbox.networkPolicy),
      checkedProviders: numberValue(sandbox.checkedProviders),
      cleanupConfirmed: sandbox.cleanupConfirmed === true,
    },
    confirmationRequired: true,
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

async function consumeEventStream(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<void> {
  if (!response.body) throw new Error("The mission stream did not open.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeBlock = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    const parsed: unknown = JSON.parse(data);
    if (isRecord(parsed)) onEvent(parsed);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) consumeBlock(block);
    if (done) break;
  }
  if (buffer.trim()) consumeBlock(buffer);
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1_000).toFixed(1)}s`;
}

function Brand() {
  return (
    <a
      className="byg-brand"
      href="#top"
      aria-label="Book Your Girlfriend home"
    >
      <span className="brand-orbit" aria-hidden="true">
        <Heart size={20} fill="currentColor" />
      </span>
      <span>
        <strong>BOOK YOUR GIRLFRIEND</strong>
        <small>THE ROMANTIC EXPERIENCE AGENT</small>
      </span>
    </a>
  );
}

function CategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: BookingCategory;
  onChange: (category: BookingCategory) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="category-picker" disabled={disabled}>
      <legend>What are we booking?</legend>
      <div>
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={value === category.id ? "active" : ""}
            onClick={() => onChange(category.id)}
            aria-pressed={value === category.id}
          >
            {category.icon}
            <span>{category.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PhaseTrack({
  phase,
  state,
}: {
  phase: BookingPhase;
  state: MissionState;
}) {
  const current = state === "idle" ? -1 : phaseOrder.indexOf(phase);
  return (
    <ol className="phase-track" aria-label="Booking mission progress">
      {phaseOrder.map((item, index) => {
        const complete = state === "ready" || index < current;
        const active = state === "running" && index === current;
        return (
          <li
            key={item}
            className={
              complete ? "complete" : active ? "active" : "pending"
            }
          >
            <span>{complete ? <Check size={13} /> : index + 1}</span>
            <small>{phaseLabels[item]}</small>
          </li>
        );
      })}
    </ol>
  );
}

function ProviderCard({
  option,
  index,
}: {
  option: BookingOption;
  index: number;
}) {
  return (
    <article className="provider-card">
      <div className="provider-card__top">
        <span className="provider-rank">0{index + 1}</span>
        <span
          className={`provider-status provider-status--${option.status}`}
        >
          {option.status === "reachable" ? (
            <CheckCircle2 size={13} />
          ) : (
            <AlertTriangle size={13} />
          )}
          {option.status === "reachable" ? "live route checked" : "handoff only"}
        </span>
      </div>
      <div className="provider-card__body">
        <small>{option.provider}</small>
        <h3>{option.title}</h3>
        <p>{option.reason}</p>
      </div>
      <div className="provider-card__meta">
        <span>
          <Search size={13} /> {option.host}
        </span>
        <span>
          <WalletCards size={13} /> live pricing
        </span>
      </div>
      <a
        href={option.url}
        target="_blank"
        rel="noopener noreferrer"
        className="provider-action"
      >
        Open live booking
        <ExternalLink size={15} />
      </a>
      <p className="provider-disclosure">
        <LockKeyhole size={12} />
        {option.priceNote}
      </p>
    </article>
  );
}

function MissionLog({ events }: { events: MissionEvent[] }) {
  return (
    <div className="mission-log" role="log" aria-live="polite">
      <div className="mission-log__header">
        <span>
          <i />
          <i />
          <i />
        </span>
        <code>agent://daytona/booking-mission</code>
      </div>
      <div className="mission-log__body">
        {events.length ? (
          events.map((event) => (
            <div className="mission-line" key={event.id}>
              <time>+{(event.elapsedMs / 1_000).toFixed(1)}s</time>
              <span>{event.phase}</span>
              <p>{event.message}</p>
            </div>
          ))
        ) : (
          <div className="mission-log__empty">
            <WandSparkles size={20} />
            <p>Your agent’s decisions and evidence will stream here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingStudio() {
  const [category, setCategory] =
    useState<BookingCategory>("surprise");
  const [request, setRequest] = useState(
    "Plan a perfect date near this location with a romantic activity and a great place to eat.",
  );
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [budget, setBudget] = useState("");
  const [preferences, setPreferences] = useState("");
  const [state, setState] = useState<MissionState>("idle");
  const [phase, setPhase] = useState<BookingPhase>("validating");
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [options, setOptions] = useState<BookingOption[]>([]);
  const [run, setRun] = useState<BookingRun | null>(null);
  const [error, setError] = useState("");
  const [voiceState, setVoiceState] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [voiceError, setVoiceError] = useState("");
  const [copilotError, setCopilotError] = useState(false);
  const startedAtRef = useRef(0);
  const requestRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const copilotContext = useMemo(
    () => ({
      product: "Book Your Girlfriend",
      safety:
        "Research and handoff only. The user confirms live price, login, payment, and final booking on the provider site.",
      form: {
        category,
        request,
        origin,
        destination,
        startDate,
        endDate,
        partySize,
        budget: budget || null,
        preferences,
      },
      mission: run
        ? {
            id: run.id,
            status: run.status,
            phase: "ready",
            headline: run.plan.headline,
            providers: run.options.map((option) => ({
              provider: option.provider,
              status: option.status,
            })),
            warnings: run.warnings,
          }
        : {
            id: null,
            status: state,
            phase,
            headline: null,
            providers: [],
            warnings: [],
          },
    }),
    [
      budget,
      category,
      destination,
      endDate,
      origin,
      partySize,
      phase,
      preferences,
      request,
      run,
      startDate,
      state,
    ],
  );
  useAgentContext({
    description:
      "Current Book Your Girlfriend brief, mission state, provider evidence, and confirmation boundary",
    value: copilotContext,
  });

  const appendEvent = (nextPhase: BookingPhase, message: string) => {
    const elapsedMs = startedAtRef.current
      ? performance.now() - startedAtRef.current
      : 0;
    setEvents((current) => [
      ...current,
      {
        id: current.length + 1,
        phase: nextPhase,
        message,
        elapsedMs,
      },
    ]);
  };

  const submitMission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    startedAtRef.current = performance.now();
    setState("running");
    setPhase("validating");
    setEvents([]);
    setOptions([]);
    setRun(null);
    setError("");
    setVoiceError("");
    appendEvent(
      "validating",
      "Mission accepted. Payment and provider credentials remain outside the sandbox.",
    );

    try {
      const response = await fetch("/api/booking/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          category,
          request,
          origin: origin.trim() || undefined,
          destination: destination.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          partySize,
          budget: budget ? Number(budget) : undefined,
          currency: "USD",
          preferences: preferences.trim() || undefined,
          stream: true,
        }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          isRecord(body) && isRecord(body.error)
            ? stringValue(body.error.message)
            : "";
        throw new Error(
          message || `Booking mission failed with status ${response.status}.`,
        );
      }

      let completed: BookingRun | null = null;
      await consumeEventStream(response, (streamEvent) => {
        const type = stringValue(streamEvent.type);
        if (type === "phase") {
          const nextPhase = stringValue(
            streamEvent.phase,
            "validating",
          ) as BookingPhase;
          setPhase(nextPhase);
          appendEvent(nextPhase, stringValue(streamEvent.message));
        } else if (type === "option") {
          const option = normalizeOption(streamEvent.option);
          setOptions((current) => [
            ...current.filter((item) => item.id !== option.id),
            option,
          ]);
          appendEvent(
            "sandbox",
            `${option.provider} returned a ${option.status} handoff.`,
          );
        } else if (type === "complete") {
          completed = normalizeRun(streamEvent.run);
        } else if (type === "error") {
          const apiError = isRecord(streamEvent.error)
            ? streamEvent.error
            : {};
          throw new Error(
            stringValue(
              apiError.message,
              "The booking mission failed safely.",
            ),
          );
        }
      });

      if (requestRef.current !== requestId) return;
      if (!completed) {
        throw new Error(
          "The agent stream closed before a final handoff was returned.",
        );
      }
      const finalRun: BookingRun = completed;
      setRun(finalRun);
      setOptions(finalRun.options);
      setPhase("ready");
      setState("ready");
      appendEvent(
        "ready",
        finalRun.status === "partial"
          ? "Handoff ready with provider warnings. Review them before continuing."
          : "Handoff ready. Confirm live price and availability on your chosen provider.",
      );
    } catch (missionError) {
      if (requestRef.current !== requestId) return;
      setState("error");
      setError(
        missionError instanceof Error
          ? missionError.message
          : "The booking mission failed safely.",
      );
    }
  };

  const playVoiceBriefing = async () => {
    if (!run?.plan.voiceBriefing || voiceState === "loading") return;
    setVoiceState("loading");
    setVoiceError("");
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: run.plan.voiceBriefing }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          isRecord(body) && isRecord(body.error)
            ? stringValue(body.error.message)
            : "Voice briefing is unavailable.";
        throw new Error(message);
      }
      const blob = await response.blob();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setVoiceState("idle");
      audio.onerror = () => {
        setVoiceState("error");
        setVoiceError("The generated briefing could not be played.");
      };
      await audio.play();
      setVoiceState("playing");
    } catch (voiceIssue) {
      setVoiceState("error");
      setVoiceError(
        voiceIssue instanceof Error
          ? voiceIssue.message
          : "Voice briefing is unavailable.",
      );
    }
  };

  const reset = () => {
    requestRef.current += 1;
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioRef.current = null;
    audioUrlRef.current = null;
    setState("idle");
    setPhase("validating");
    setEvents([]);
    setOptions([]);
    setRun(null);
    setError("");
    setVoiceState("idle");
    setVoiceError("");
  };

  const needsRoute = category === "getaway" || category === "flight";

  return (
    <div className="booking-app" id="top">
      <a className="skip-link" href="#booking-main">
        Skip to booking workspace
      </a>
      <header className="booking-topbar">
        <Brand />
        <nav aria-label="Page sections">
          <a href="#mission">Mission</a>
          <a href="#results">Handoffs</a>
          <a href="#evidence">Evidence</a>
        </nav>
        <span className={`system-pill system-pill--${state}`}>
          <i />
          {state === "running"
            ? "Agent live"
            : state === "ready"
              ? "Handoff ready"
              : state === "error"
                ? "Needs attention"
                : "Ready to route"}
        </span>
      </header>

      <main id="booking-main">
        <section className="booking-hero">
          <div>
            <span className="hero-kicker">
              <Heart size={14} fill="currentColor" />
              ONE BRIEF · AN UNFORGETTABLE GESTURE
            </span>
            <h1>
              Make her feel chosen.
              <span>We orchestrate the details.</span>
            </h1>
            <p>
              Exceptional tables, event tickets, flights, private venues,
              personal gifts, rare experiences, romantic escapes, and other
              discoverable bookings—researched by an AI concierge that keeps
              every final choice in your hands.
            </p>
          </div>
          <aside className="hero-trust">
            <span>HUMAN CHECKPOINT</span>
            <strong>Nothing books without you.</strong>
            <p>
              No passwords enter the sandbox. Live price, identity, and payment
              stay with the provider.
            </p>
            <ShieldCheck size={31} />
          </aside>
        </section>

        <div className="integration-rail" aria-label="Integrated technology">
          <span>
            <small>REASON</small>
            FIREWORKS
          </span>
          <span>
            <small>EXECUTE</small>
            DAYTONA
          </span>
          <span>
            <small>TRACK</small>
            COPILOTKIT
          </span>
          <span>
            <small>OBSERVE</small>
            BRAINTRUST
          </span>
          <span>
            <small>VOICE</small>
            ELEVENLABS
          </span>
        </div>

        <section className="mission-shell" id="mission">
          <div className="section-intro">
            <span>01 / BRIEF</span>
            <div>
              <h2>Where should the perfect date begin?</h2>
              <p>
                Enter an address, neighborhood, or city. Your concierge will
                build the date around it—you can add more details only if you
                want to.
              </p>
            </div>
          </div>
          <form onSubmit={submitMission}>
            <div className="quick-date-card">
              <label className="quick-location">
                <span>ADDRESS OR LOCATION</span>
                <div>
                  <MapPin size={22} />
                  <input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    disabled={state === "running"}
                    placeholder="Try: 1 Ferry Building, San Francisco"
                    autoComplete="street-address"
                    required
                  />
                </div>
                <small className="quick-location-note">
                  A neighborhood or nearby landmark works too—no home address
                  required.
                </small>
              </label>
              <div className="quick-date-promises" aria-label="What the agent plans">
                <span>
                  <Utensils size={15} />
                  Dinner
                </span>
                <span>
                  <Sparkles size={15} />
                  Activity
                </span>
                <span>
                  <ShieldCheck size={15} />
                  You approve
                </span>
              </div>
            </div>

            <details className="advanced-options">
              <summary>
                <span>
                  <SlidersHorizontal size={17} />
                  Add date, budget, or what she loves
                </span>
                <small>Optional</small>
                <ChevronDown size={17} className="advanced-chevron" />
              </summary>
              <div className="advanced-options__body">
                <CategoryPicker
                  value={category}
                  onChange={setCategory}
                  disabled={state === "running"}
                />
                <div className="mission-grid">
                  {needsRoute ? (
                    <label>
                      <span>LEAVING FROM</span>
                      <div>
                        <MapPin size={16} />
                        <input
                          value={origin}
                          onChange={(event) => setOrigin(event.target.value)}
                          disabled={state === "running"}
                          placeholder="San Francisco"
                          required={category === "flight"}
                        />
                      </div>
                    </label>
                  ) : null}
                  <label>
                    <span>DATE / START</span>
                    <div>
                      <CalendarDays size={16} />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        disabled={state === "running"}
                      />
                    </div>
                  </label>
                  <label>
                    <span>END / RETURN</span>
                    <div>
                      <CalendarDays size={16} />
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(event) => setEndDate(event.target.value)}
                        disabled={state === "running"}
                      />
                    </div>
                  </label>
                  <label>
                    <span>PEOPLE</span>
                    <div>
                      <span className="field-glyph">×</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={partySize}
                        onChange={(event) =>
                          setPartySize(Number(event.target.value))
                        }
                        disabled={state === "running"}
                      />
                    </div>
                  </label>
                  <label>
                    <span>BUDGET / USD</span>
                    <div>
                      <WalletCards size={16} />
                      <input
                        type="number"
                        min={1}
                        value={budget}
                        onChange={(event) => setBudget(event.target.value)}
                        disabled={state === "running"}
                        placeholder="Optional"
                      />
                    </div>
                  </label>
                  <label className="wide">
                    <span>THE KIND OF DATE</span>
                    <textarea
                      rows={3}
                      value={request}
                      onChange={(event) => setRequest(event.target.value)}
                      disabled={state === "running"}
                      placeholder="Romantic, adventurous, relaxed, a special celebration…"
                      required
                    />
                  </label>
                  <label className="wide">
                    <span>WHAT SHE LOVES / ACCESSIBILITY</span>
                    <textarea
                      rows={2}
                      value={preferences}
                      onChange={(event) => setPreferences(event.target.value)}
                      disabled={state === "running"}
                      placeholder="Favorite food, music, flowers, activities, accessibility needs…"
                    />
                  </label>
                </div>
              </div>
            </details>
            <div className="mission-actions">
              <p>
                <LockKeyhole size={14} />
                Research only — you confirm provider login and payment.
              </p>
              {state === "ready" || state === "error" ? (
                <button type="button" className="reset-action" onClick={reset}>
                  <RotateCcw size={15} />
                  New mission
                </button>
              ) : null}
              <button
                type="submit"
                className="launch-action"
                disabled={state === "running"}
              >
                {state === "running" ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <WandSparkles size={17} />
                )}
                {state === "running"
                  ? "Planning her date"
                  : "Plan her perfect date"}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </section>

        {error ? (
          <div className="error-banner" role="alert">
            <XCircle size={18} />
            <div>
              <strong>Mission stopped safely</strong>
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <PhaseTrack phase={phase} state={state} />

        <section className="results-section" id="results">
          <div className="section-intro">
            <span>02 / HANDOFFS</span>
            <div>
              <h2>{run?.plan.headline || "Live booking routes"}</h2>
              <p>
                {run?.plan.summary ||
                  "Launch a mission to compare provider handoffs. We never present generated prices as live inventory."}
              </p>
            </div>
            {run ? (
              <span className="run-time">
                <Clock3 size={14} />
                {formatDuration(run.durationMs)}
              </span>
            ) : null}
          </div>

          {run?.warnings.length ? (
            <aside className="warning-banner" role="alert">
              <AlertTriangle size={17} />
              <div>
                <strong>Review the agent notes</strong>
                {run.warnings.map((warning) => (
                  <span key={warning}>{warning}</span>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="provider-grid">
            {options.length
              ? options.map((option, index) => (
                  <ProviderCard
                    key={option.id}
                    option={option}
                    index={index}
                  />
                ))
              : [0, 1, 2].map((index) => (
                  <article className="provider-card provider-card--empty" key={index}>
                    <span className="provider-rank">0{index + 1}</span>
                    {state === "running" ? (
                      <LoaderCircle className="spin" size={23} />
                    ) : (
                      <Search size={23} />
                    )}
                    <strong>
                      {state === "running"
                        ? "Provider agent running"
                        : "Awaiting mission"}
                    </strong>
                    <p>Verified provider evidence will appear here.</p>
                  </article>
                ))}
          </div>

          {run ? (
            <div className="confirmation-gate">
              <div className="confirmation-icon">
                <ShieldCheck size={27} />
              </div>
              <div>
                <span>FINAL CONFIRMATION GATE</span>
                <h3>You remain the buyer.</h3>
                <p>
                  Open a provider above, verify current inventory and terms,
                  then sign in and pay directly. Book Your Girlfriend never
                  receives your password or card number.
                </p>
              </div>
              <button
                type="button"
                onClick={playVoiceBriefing}
                disabled={voiceState === "loading"}
              >
                {voiceState === "loading" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : voiceState === "playing" ? (
                  <AudioLines size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
                {voiceState === "playing"
                  ? "Briefing playing"
                  : "Hear agent briefing"}
              </button>
              {voiceError ? (
                <small className="voice-error" role="status">
                  {voiceError}
                </small>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="evidence-section" id="evidence">
          <div className="section-intro">
            <span>03 / EVIDENCE</span>
            <div>
              <h2>See the agent work</h2>
              <p>
                CopilotKit tracks the same mission context while Braintrust
                records the server-side trace.
              </p>
            </div>
          </div>
          <div className="evidence-grid">
            <MissionLog events={events} />
            <aside className="sandbox-card">
              <div className="sandbox-card__header">
                <span>
                  <ShieldCheck size={15} />
                  DAYTONA ISOLATION
                </span>
                <i className={run?.sandbox.cleanupConfirmed ? "clean" : ""} />
              </div>
              {run ? (
                <dl>
                  <div>
                    <dt>WORKSPACE</dt>
                    <dd>
                      <code>{run.sandbox.workspaceId.slice(0, 14)}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>PROVIDERS CHECKED</dt>
                    <dd>{run.sandbox.checkedProviders}</dd>
                  </div>
                  <div>
                    <dt>CREDENTIALS MOUNTED</dt>
                    <dd>NONE</dd>
                  </div>
                  <div>
                    <dt>CLEANUP</dt>
                    <dd>
                      {run.sandbox.cleanupConfirmed
                        ? "CONFIRMED"
                        : "TTL FALLBACK"}
                    </dd>
                  </div>
                  <div className="wide">
                    <dt>NETWORK POLICY</dt>
                    <dd>{run.sandbox.networkPolicy}</dd>
                  </div>
                </dl>
              ) : (
                <div className="sandbox-empty">
                  <LockKeyhole size={25} />
                  <p>
                    Each mission gets an ephemeral, provider-restricted
                    workspace.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <footer className="booking-footer">
        <Brand />
        <p>The thought counts. We make every detail count too.</p>
        <span>
          <Headphones size={14} />
          Voice by ElevenLabs
        </span>
      </footer>

      {copilotError ? (
        <div className="copilot-alert" role="alert">
          <Bot size={15} />
          Copilot is temporarily unavailable; the booking form still works.
          <button
            type="button"
            onClick={() => setCopilotError(false)}
            aria-label="Dismiss Copilot error"
          >
            <XCircle size={14} />
          </button>
        </div>
      ) : null}
      <CopilotSidebar
        agentId="default"
        defaultOpen={false}
        width={420}
        position="right"
        toggleButton={{
          className: "byg-copilot-toggle",
          "aria-label": "Open Book Your Girlfriend concierge",
        }}
        labels={{
          modalHeaderTitle: "Your romantic concierge",
          welcomeMessageText:
            "Tell me about her, the occasion, and the feeling you want to create. I can shape the idea or start a real provider research mission when you ask.",
          chatInputPlaceholder: "Plan a dinner, ticket, flight, gift, getaway…",
          chatToggleOpenLabel: "Open romantic concierge",
          chatToggleCloseLabel: "Close romantic concierge",
          chatDisclaimerText:
            "Live price, provider login, payment, and final confirmation stay with you.",
        }}
        onError={() => setCopilotError(true)}
      />
    </div>
  );
}
