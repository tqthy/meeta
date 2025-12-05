## Meeting Domain Agents Guide

Purpose: domain-level guidance for implementing the meeting subdomain. This file contains domain-specific responsibilities, SDK import patterns, minimal API surface to implement first, and links to the local `JitsiAPI` references.

Audience

- Engineers building `src/domains/meeting` (services/hooks/stores) and automation agents scaffolding meeting adapters or tests.

Guiding principles (domain-specific)

- Keep the Jitsi SDK usage inside thin adapter layers: `meetingService`, `trackService`, `deviceService`.
- Normalize SDK payloads into serializable shapes before writing to stores or persisting.
- Prefer event-driven store updates; only persist the small payloads that UI needs.

Minimal Jitsi surface to implement first

- Connection handling: connect/disconnect/reconnect via `meetingService`.
- Conference lifecycle: join/leave, `CONFERENCE_JOINED`/`CONFERENCE_LEFT` handling.
- Participant events: `PARTICIPANT_JOINED` / `PARTICIPANT_LEFT` mapped to a `Participant` domain type.
- Track management: create/release local tracks, mute/unmute, subscribe to remote tracks via `trackService` / `useRemoteTracks`.

Folder layout (domain)

```
src/domains/meeting/
	/hooks
		useMeeting.ts
		useLocalTracks.ts
		useRemoteTracks.ts
	/services
		meetingService.ts
		trackService.ts
		deviceService.ts
		jitsiLoader.ts   # optional central getJitsiMeetJS
	/store
		meetingStore.ts
		trackStore.ts
	/types
		meeting.ts
		tracks.ts
	/JitsiAPI
		(class descriptions and event enums)
```

SSR-safe SDK import (recommended patterns)

- Central loader (recommended): `src/domains/meeting/services/jitsiLoader.ts`

```ts
let cached: any = null
export async function getJitsiMeetJS() {
    if (typeof window === 'undefined') return null
    if (!cached) cached = await import('lib-jitsi-meet')
    return cached.default || cached
}
```

- Service-level guarded require (for synchronous init in client-only code):

```ts
let JitsiMeetJS: any = null
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    JitsiMeetJS = require('lib-jitsi-meet')
}
```

Implementation checklist (practical)

1. Implement `jitsiLoader.getJitsiMeetJS()` to centralize dynamic import and caching.
2. Implement `meetingService` to manage connection and conference lifecycle; expose async init/join/leave helpers.
3. Implement `deviceService` to enumerate/release devices and create local tracks.
4. Implement `trackService` to create/release/mute tracks and normalize track payloads for `trackStore`.
5. Implement hooks (`useMeeting`, `useLocalTracks`, `useRemoteTracks`) that orchestrate services and update stores.

Mapping to JitsiAPI (local references)

- Use `src/domains/meeting/JitsiAPI/1-JitsiConference/` for conference events and error names.
- Use `.../2-JitsiConnection/` for connection lifecycle and errors.
- Use `.../3-JitsiMediaDevices/` for device enumeration and hot-swap patterns.
- Use `.../4-JitsiMeetJS/` for top-level bootstrap notes.
- Use `.../5-JitsiParticipant/` and `.../6-JitsiTrack/` for participant and track payload mappings.

Testing recommendations

- Unit tests: mock `Class_*` shapes from `JitsiAPI` and assert adapter behavior.
- Integration tests: simulate `JitsiConference` events (track added/removed, participant join/leave) and assert `meetingStore` and `trackStore` transitions.

Logging & artifacts

- Keep implementation artifacts and agent-generated notes in `/ai_logs` (repo-level). Use `REFACTORING_NOTE_TEMPLATE.md` as the template.

Notes

- Keep examples and long code snippets in `src/domains/meeting/services/` (for example `jitsiLoader.ts`), not duplicated here. This `Agents.md` should contain domain-specific responsibilities and quickstarter snippets only.
