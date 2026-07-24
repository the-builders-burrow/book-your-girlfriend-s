# Book Your Girlfriend

Book Your Girlfriend is an AI-native romantic experience concierge. Give it the
occasion, her taste, a location, timing, and budget; it researches exceptional
restaurants, private venues, personal gifts, memorable experiences, getaways,
or a complete surprise.

The name is playful. The product is thoughtful: it helps someone plan for a
partner without reducing her to a stereotype, and it keeps the buyer in control.

## What makes it different

- **One brief, not six search tabs.** Fireworks converts natural language into
  a structured, category-specific research plan.
- **A real isolated agent.** Every mission runs in a fresh Daytona sandbox with
  provider-only network access and no user credentials.
- **Live progress.** CopilotKit carries the current brief and mission state,
  while the interface streams provider evidence over SSE.
- **Observable by design.** Braintrust records mission inputs, results, safety
  scores, reachability, duration, and sandbox cleanup.
- **A voice-ready reveal.** ElevenLabs can narrate the final briefing without
  exposing its API key to the browser.
- **A deliberate confirmation gate.** The app never claims it purchased,
  reserved, or observed inventory it did not verify. Login and payment happen
  directly with the selected provider.

## Experience categories

| Category | Trusted research routes |
| --- | --- |
| Restaurants | OpenTable, Resy, Tock |
| Venues | Peerspace, EventUp, Google Maps |
| Gifts | Etsy, Uncommon Goods, 1-800-Flowers |
| Experiences | Viator, GetYourGuide, Airbnb Experiences |
| Getaways | Google Hotels, Booking.com, Hotels.com |
| Surprise me | Google Search, Yelp, Google Maps |

## Stack

Next.js 16, React 19, AI SDK 6, Fireworks AI, Daytona, CopilotKit,
Braintrust, ElevenLabs, CodeRabbit, and Vercel.

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure the server-side variables in `.env.local`. Never commit live keys.
`NEXT_PUBLIC_COPILOTKIT_LICENSE_KEY` is intentionally public; every other token
must remain server-only.

```dotenv
FIREWORKS_API_KEY=
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-pro
DAYTONA_API_KEY=
BRAINTRUST_API_KEY=
BRAINTRUST_PROJECT=Book Your Girlfriend
NEXT_PUBLIC_COPILOTKIT_LICENSE_KEY=
COPILOTKIT_LICENSE_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL=eleven_multilingual_v2
BOOKING_MAX_CONCURRENCY=2
```

The local Daytona CLI profile can be used in development when it is private and
valid. Deployments require explicit environment credentials.

## Verify

```bash
npm test
npm run typecheck
npm run build
```

## API

`POST /api/booking/run` accepts JSON and can return JSON or server-sent events:

```bash
curl -N http://localhost:3000/api/booking/run \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  --data '{
    "category": "restaurant",
    "request": "Plan an unforgettable anniversary dinner with a beautiful room and vegetarian options.",
    "destination": "San Francisco",
    "partySize": 2,
    "budget": 500,
    "currency": "USD",
    "stream": true
  }'
```

See [API](docs/api.md), [architecture](docs/architecture.md), and the
[demo script](docs/demo-script.md) for the complete handoff.

## Safety boundary

Provider pages may block automated checks or require JavaScript. A `handoff`
means a validated provider URL was produced, not that inventory is available.
Book Your Girlfriend does not accept passwords, card numbers, or payment tokens.
It is a planning and research prototype, not a travel agent or guarantee.

