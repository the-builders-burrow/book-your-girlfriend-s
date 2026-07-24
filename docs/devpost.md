# Devpost submission

## Book Your Girlfriend

**Tagline:** One thoughtful brief. An unforgettable gesture.

## Inspiration

Planning something special is emotional work hidden inside fragmented commerce.
The planner bounces between restaurant, ticket, airline, venue, gift,
experience, and hotel sites, repeatedly translating the same intent into
filters. We wanted an agent that understands the feeling first, executes
research safely, and never removes the human from the final decision.

## What it does

Users describe the occasion, location, timing, budget, preferences, and the
recipient’s taste. Fireworks produces a structured plan for restaurants,
tickets, flights, venues, gifts, experiences, getaways, a complete surprise, or
an open-ended booking. A Daytona agent researches exactly three trusted
providers and streams validated handoffs to the interface.

CopilotKit supplies the conversational concierge and shared mission context.
Braintrust traces execution and scores provider reachability, safe handoff, and
sandbox cleanup. ElevenLabs can turn the result into a voice briefing.

## How we built it

The application uses Next.js 16, React 19, AI SDK 6, and Zod. User input is
bounded before it reaches the model. Fireworks can only select from fixed
provider enums. Every Daytona workspace is ephemeral, private, time-limited,
and protected by a provider-only domain allow list. The host validates HTTPS
and exact provider hostnames before a URL reaches the client.

## Challenges

Consumer websites differ in bot protection, redirects, and rendering. We chose
honesty over simulated inventory: `reachable` means the research route answered,
while `handoff` means the validated provider route is ready for the human.
Neither label claims availability or price.

## What we learned

The most useful agent is not always the one with the most authority. Clear
boundaries, visible evidence, and graceful handoff can make an agent feel more
premium because the user knows exactly what it did.

## What is next

Direct provider APIs, private preference memory, collaborative planning, shared
rate limits, authenticated accounts, and gift delivery orchestration—all while
keeping login, payment, and final confirmation explicit.
