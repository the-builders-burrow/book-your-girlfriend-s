# Security

Book Your Girlfriend is a hackathon prototype for romantic-experience research
and provider handoff.

## Trust boundaries

- User text is validated, bounded, and treated as data.
- Fireworks may select search wording only from a fixed category-specific
  provider set.
- Daytona sandboxes are ephemeral, private, time-bounded, and restricted to an
  explicit domain allow list.
- The sandbox receives search tasks only—never API keys, passwords, cookies,
  payment data, or provider accounts.
- Results are accepted only when the provider ID is trusted and the URL is
  HTTPS on the exact expected hostname.
- ElevenLabs, Fireworks, Braintrust, Daytona, and CopilotKit server tokens stay
  in server environment variables.
- Cross-origin state-changing requests are rejected.
- Request size, concurrency, model time, command time, and response size are
  bounded.

## Purchase boundary

The product researches and links. It does not log into provider accounts,
reserve inventory, submit orders, send gifts, or process payment. The user must
open the provider, verify live details and terms, then confirm directly.

## Data handling

The application does not intentionally persist booking briefs. Braintrust may
receive the mission brief and execution metadata for observability, so users
should not enter secrets, payment information, health data, or unnecessarily
sensitive personal information.

## Reporting

Do not open a public issue for a suspected vulnerability. Contact the repository
maintainers privately with reproduction steps, affected routes, and impact.

