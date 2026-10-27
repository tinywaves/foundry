# Chatbot API and Local Persistence Research

Date: 2026-10-17

## Conclusions

The first version should not treat different providers' HTTP request bodies as one wire format. Define an internal provider contract in the Electron main process, then implement adapters for OpenAI Responses, OpenAI Chat Completions (including OpenAI-compatible services), and Anthropic Messages.

The smallest useful internal interface is:

```ts
interface ChatProvider {
  stream(request: ChatRequest): AsyncIterable<ChatEvent>
}

type ChatEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'completed'; usage?: Usage; providerRequestId?: string }
  | { type: 'error'; message: string; retryable?: boolean }
```

`ChatRequest` should include a model, an ordered message list, an optional system instruction, and an abort signal. Events should allow provider-specific raw metadata so future reasoning, tool-call, and multimodal features do not require losing information.

## API Shapes

### OpenAI Responses API

OpenAI's current SDK presents Responses as its primary text-generation API: `client.responses.create({ model, instructions, input })`. Streaming uses `stream: true` and Server-Sent Events; text deltas, completion, and failure are represented by distinct events.

Responses input and output are not merely a `role/content` array. When replaying multi-turn history, preserve output items in order; filtering to text alone can lose reasoning or tool-call items. Simple continuations can use `previous_response_id`.

Official sources:

- https://platform.openai.com/docs/api-reference/responses
- https://github.com/openai/openai-node

### OpenAI Chat Completions

Chat Completions uses `messages: [{ role, content }]`, with streamed text delivered through `choices[].delta`. It remains a widely supported standard, while newer OpenAI capabilities land first in Responses.

Its main value is ecosystem compatibility: many third-party cloud services and local runtimes expose an OpenAI-compatible Chat Completions endpoint. The MVP should define `openai-compatible-chat-completions` as Chat Completions compatibility only; it must not assume Responses support, identical tool semantics, or identical error structures.

Official sources:

- https://platform.openai.com/docs/api-reference/chat
- https://github.com/openai/openai-node

### Anthropic Messages API

Anthropic Messages uses `POST /v1/messages`. Its request and response shapes are similar to OpenAI's but not interchangeable: `system` is a top-level parameter, content can contain text or tool blocks, and streaming uses its own SSE event sequence such as `message_start`, `content_block_delta`, `message_delta`, and `message_stop`.

Use the Anthropic SDK and a dedicated adapter rather than sending OpenAI JSON directly to an Anthropic endpoint.

Official sources:

- https://docs.anthropic.com/en/api/messages
- https://docs.anthropic.com/en/api/messages-streaming
- https://github.com/anthropics/anthropic-sdk-typescript
- https://docs.anthropic.com/en/api/openai-sdk

## Provider Configuration and Security Boundary

The provider configuration surface can represent `providerKind`, `baseURL`, `model`, and `apiKey`, but it should not infer the protocol from the URL. Provider kinds should distinguish `openai-responses`, `openai-compatible-chat-completions`, and `anthropic-messages`.

The Electron main process should read and use API keys. The renderer should call typed preload/IPC methods and receive normalized streaming events; it should not call model services directly. API keys should use Electron `safeStorage` or a system keychain before production use. Chat content may be stored in the database, but API keys should never be written in plaintext to JSONL, SQLite, renderer state, or ordinary logs.

## SQLite and JSONL

### SQLite as the Primary Store (Recommended)

This repository already initializes `better-sqlite3` and Drizzle. SQLite is a better source of truth for chat records because it provides:

- Transactions for user messages, assistant placeholders, and completion state.
- Indexed conversation, time, and sequence queries with pagination.
- Updates to assistant drafts, failure state, and retry metadata while streaming.
- Crash recovery by finding unfinished records and marking or resuming them.

SQLite is designed for local application and single-file storage. WAL mode can improve read/write concurrency, and a single-user Electron application does not need a separate database service.

Official sources:

- https://www.sqlite.org/whentouse.html
- https://www.sqlite.org/wal.html
- https://www.sqlite.org/json1.html

### JSONL as an Event Log or Export

JSONL is append-friendly, readable, easy to export, and useful for retaining raw provider events. It is a poor sole query store: updates, deletion, pagination, concurrent writes, truncated-tail recovery, and conversation queries all require custom logic. Streaming assistant drafts are especially awkward.

A safer combination is SQLite tables plus optional JSONL append-only events for audit, debugging, or export. If JSONL is ever used alone, store one file per conversation, include `schemaVersion`, `id`, `seq`, and `ts` on every line, flush and fsync appends, and replay on startup while ignoring an incomplete final line.

JSON Lines specification: https://jsonlines.org/

## Recommended MVP Order

1. Define the internal `ChatProvider` contract and normalized stream events.
2. Add OpenAI Responses and Anthropic Messages adapters.
3. Add OpenAI-compatible Chat Completions with its explicit capability boundary.
4. Store provider configuration and model selection through the main process.
5. Create SQLite conversation and message tables; insert an assistant placeholder during streaming and update it on completion or error.
6. Add JSONL append-only events only when audit or export requirements justify them.
