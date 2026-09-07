# AEGIS-M

Black-box security auditor for LLM API relays. Probes are built in a Chat Completions canonical form, then encoded for the target protocol. Tool calls are parsed, never executed. API keys are never written into reports.

## Protocols

| id | Endpoint | Auth |
|---|---|---|
| `openai` | `/v1/chat/completions` | Bearer |
| `openai-responses` | `/v1/responses` | Bearer |
| `anthropic` | `/v1/messages` | `x-api-key` |
| `gemini` | `/v1beta/models/{model}:generateContent` | `x-goog-api-key` |
| `azure` | `/openai/deployments/{model}/chat/completions` | `api-key` |
| `ollama` | `/api/chat` | optional |
| `cohere` | `/v2/chat` | Bearer |
| `auto` | inferred from host/path | same |

## Checks

Transport (HTTPS), invalid-key auth, tool JSON integrity, untrusted data in tool args, prompt echo, embedded-instruction isolation, system-secret leak, role priority, cross-request contamination.

## Source

- `src/lib/aegis/protocols.ts` — adapters
- `src/lib/aegis/scanner.ts` — probes and scoring
- `src/components/aegis-console.tsx` — audit console

Only audit relays you own or are authorized to test.
