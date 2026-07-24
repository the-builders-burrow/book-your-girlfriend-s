# Book Your Girlfriend API

## `POST /api/booking/run`

Creates a provider-research mission. Send `Accept: text/event-stream` or
`"stream": true` for SSE.

```json
{
  "category": "gift",
  "request": "Find a personal anniversary gift for someone who loves ceramics and modern design.",
  "destination": "San Francisco",
  "startDate": "2026-08-14",
  "partySize": 1,
  "budget": 250,
  "currency": "USD",
  "preferences": "Handmade, understated, no novelty gifts",
  "stream": true
}
```

Categories are `restaurant`, `venue`, `gift`, `experience`, `getaway`, and
`surprise`.

SSE messages use these shapes:

```text
data: {"type":"phase","phase":"planning","message":"..."}
data: {"type":"option","option":{...}}
data: {"type":"complete","run":{...}}
data: {"type":"error","error":{"code":"...","message":"..."}}
```

Every completed run has `confirmationRequired: true`. `reachable` describes the
HTTP research route, not bookable inventory.

## `POST /api/voice`

Accepts `{ "text": "..." }` and returns ElevenLabs `audio/mpeg`. Text is capped
at 900 characters. The server returns `503` when `ELEVENLABS_API_KEY` is absent.

## `/api/copilotkit`

CopilotKit runtime endpoint backed by Fireworks. The
`startBookingMission` server tool can launch the same validated Daytona
workflow only after the user explicitly asks to research.

## Errors and limits

| Status | Example code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Schema, date, or size validation failed |
| 403 | `CROSS_ORIGIN_REQUEST` | The request origin is not allowed |
| 429 | `TOO_MANY_MISSIONS` | Process-local concurrency is exhausted |
| 502 | `PLANNING_FAILED` | Fireworks did not produce a safe plan |
| 502 | `SANDBOX_AGENT_FAILED` | Daytona evidence was missing or invalid |
| 503 | `DAYTONA_UNAVAILABLE` | Daytona credentials are not configured |

These routes can invoke paid services. Production deployments should add
authentication and a shared rate limiter before public access.

