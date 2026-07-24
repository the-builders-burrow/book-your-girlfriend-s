# Architecture

Book Your Girlfriend separates intent, research, observation, and purchase.

```text
Brief / CopilotKit
        |
        v
strict validation + concurrency gate
        |
        v
Fireworks structured plan
        |
        v
ephemeral Daytona sandbox
provider-only egress, fixed program, bounded output
        |
        v
exact-host result validation
        |
        +------> Braintrust trace and safety scores
        |
        v
SSE handoffs + optional ElevenLabs briefing
        |
        v
human opens provider, verifies, logs in, and pays
```

Fireworks never invents provider IDs; each category maps to exactly three
allow-listed routes. The Daytona sandbox receives only those tasks and cannot
reach arbitrary domains. The host process independently validates every result
before presenting it.

The current concurrency gate is process-local. A public multi-instance release
should add authenticated access, durable shared rate limiting, budgets, and
idempotency. The sandbox TTL is a fallback; the normal path explicitly deletes
each workspace and records whether cleanup was confirmed.

