## meeting-runtime — Service-level Agents Guide

Purpose: Short, service-focused guidance for the `meeting-runtime` service folder. This document describes responsibilities for SDK adapters, in-memory event emission, and recommended patterns for safe runtime behavior.

Scope

- Code in this folder integrates with the Jitsi SDK and implements runtime behavior: connection, conference lifecycle, participant mapping, and track management.
- This folder must remain in-memory and client-safe: do not import Prisma or perform any database writes here. Persisting data belongs to `meeting-database`.

Principles

- Contain all SDK usage here; do not leak SDK objects to higher-level UI components or other domains.
- Emit normalized, JSON-serializable events as the contract for consumers (for example `meeting-database`).
- Guard SDK imports so server-side bundles do not include browser-only modules.

Canonical events (examples)

- `meeting.started`, `meeting.ended`
- `participant.joined`, `participant.left`
- `track.added`, `track.removed`

Event contract

- Events must be plain serializable JSON and include: `eventId` (UUID), `type`, `timestamp` (ISO), `meetingId`, `source`, and a `payload` object.
- Example minimal fields: `{ eventId, type, timestamp, meetingId, source, payload }`.

Event emission patterns

- Use a small in-process emitter (Node `EventEmitter` or an Observable) and expose a subscription API that delivers only serializable events.
- For cross-process delivery (workers, background jobs) forward the same JSON payload over a queue or HTTP endpoint — never forward SDK objects.

SDK loader

- The recommended dynamic loader is `jitsiLoader.ts` in this folder. It should export a single `getJitsiMeetJS()` that returns `null` server-side and the SDK client object in browser contexts. Example:

```ts
let cached: any = null
export async function getJitsiMeetJS() {
    if (typeof window === 'undefined') return null
    if (!cached) cached = await import('lib-jitsi-meet')
    return cached.default || cached
}
```

Services to implement here

- `meetingService` — connection + conference lifecycle and high-level orchestration.
- `participantService` / `participantRuntimeService` — normalize participant events.
- `trackService` — create/release tracks and emit `track.*` events.

Testing and validation

- Unit tests should mock the Jitsi SDK (use `JitsiAPI` class shapes) and verify emitted event shapes and required fields.
- Add contract tests that assert events are JSON-serializable and conform to any JSON Schema you maintain under `events/`.

Notes

- Keep heavy examples and implementation snippets inside `.ts` service files, not in this `Agents.md` overview.

Generated: service-level guidance for `meeting-runtime`.
