## Meeting Integration Guidelines

> Purpose: A concise guide for engineers and automated agents implementing the meeting subdomain and integrating the bundled Jitsi SDK. This file contains recommended practices and the minimum surface area to implement first — not status logs.

---

### Who should read this

- Engineers implementing `src/domains/meeting` services, hooks or stores
- Automated agents that scaffold adapters and tests for Jitsi integration

---

### Guiding principles

- Keep SDK usage inside small adapter layers (e.g. `meetingService`, `trackService`, `deviceService`). Do not pass SDK objects directly into React components.
- Normalize SDK payloads into simple, serializable shapes before writing to stores.
- Start with the minimal event set and expand only as needed.

---

### Minimal Jitsi surface to implement first

- Connection handling: connect / disconnect / reconnect (map to `meetingService`).
- Conference lifecycle: join / leave, conference joined/left events, participant join/leave.
- Track management: create/release local tracks, mute/unmute, subscribe to remote tracks (map to `trackService` and `deviceService`).
- Participant mapping: extract serializable participant fields and map to domain `Participant` types.

---

### Folder layout (canonical)

Keep this layout under `src` and `app` for meeting code:

```
/app
  /meeting
    /create
      page.tsx
    /[meetingId]
      page.tsx
      layout.tsx

/src
  /domains
    /meeting
      /hooks
      /services
      /store
      /types
      /JitsiAPI

/src/components/meeting
  (UI components only; no SDK objects)
```

---

### SDK import rules (SSR-safe)

- Never require or import `lib-jitsi-meet` at module top-level. Use one of these patterns:
    - Service-level require guarded by `typeof window !== 'undefined'` (synchronous require in services where appropriate).
    - `import('lib-jitsi-meet')` inside `useEffect` for hooks.
    - Centralized async loader utility (`getJitsiMeetJS`) that caches the dynamically imported module.

Example patterns and a small loader utility are maintained in `src/domains/meeting/Agents.md` (domain-local guidance).

---

### Implementation checklist (practical)

1. Create thin `meetingService`, `trackService`, `deviceService` adapters wrapping only the SDK calls you need.
2. Add `meetingStore` and `trackStore` slices that accept serializable payloads.
3. Implement hooks (`useMeeting`, `useLocalTracks`, `useRemoteTracks`) to orchestrate services and stores.
4. Place UI components under `src/components/meeting` and consume only serializable store data and hook return values.
5. Add unit tests that mock `Class_*` shapes located in `src/domains/meeting/JitsiAPI/`.

---

### Testing recommendations

- Unit tests: mock the SDK classes (use small shape mocks based on `Class_*` files). Keep tests focused on adapter behavior.
- Integration tests: simulate conference events (join/leave, track added/removed) and assert store transitions.

---

### Logging & refactoring notes

- Use `/ai_logs` to store agent-generated artifacts such as `REFACTORING_NOTES.md` or migration logs. These files are implementation artifacts and should be gitignored (see `.gitignore`).
- Keep `REFACTORING_NOTES.md` concise: purpose, changes made, next steps, and file list. A template is available at `/ai_logs/REFACTORING_NOTE_TEMPLATE.md`.

---

If in doubt, prefer the `Events_Enum` files under `src/domains/meeting/JitsiAPI/` for canonical event strings and the `Class_*` files for method signatures.

End of guidelines.

## Agents Guide for Meeting Module Integration

> **See also**: [`README.md`](./README.md) for project overview, tech stack, setup instructions, and feature documentation.

This repository-level `agents.md` has been synchronized to align with the workspace and to explicitly reference the bundled `JitsiAPI/` materials so agents can use those files as implementation references when integrating Jitsi into the Next.js meeting subdomain.

---

**JitsiAPI Reference**: The `src/domains/meeting/JitsiAPI/` folder (moved into the meeting domain) contains canonical class descriptions, enums, events and README files that should be used as reference material when implementing services and hooks. Use the files below as authoritative references (not all files are required; pick the right API pieces listed in the mapping):

- `src/domains/meeting/JitsiAPI/1-JitsiConference/` : Conference lifecycle, room events and errors — use for `meetingService` and conference event handlers. Key files: `JitsiConferenceEvents_Enum.txt`, `JitsiConferenceErrors_Enum.txt`, `README.md`.
- `src/domains/meeting/JitsiAPI/2-JitsiConnection/` : Connection lifecycle (connect/disconnect, auth errors) — use for `meetingService` connection logic. Key files: `Class_JitsiConnection.txt`, `JitsiConnectionEvents_Enum.txt`, `JitsiConnectionErrors_Enum.txt`.
- `src/domains/meeting/JitsiAPI/3-JitsiMediaDevices/` : Device access and device events — use for `deviceService`. Key files: `Class_JitsiMediaDevices.txt`, `JitsiMediaDevicesEvents_Enum.txt`, `README.md`.
- `src/domains/meeting/JitsiAPI/4-JitsiMeetJS/` : Global SDK variable and bootstrapping notes — use for top-level SDK initialization in app startup code. Key file: `Variable_JitsiMeetJS.txt`, `README.md`.
- `src/domains/meeting/JitsiAPI/5-JitsiParticipant/` : Participant model and behavior — use when mapping participants into `meetingStore` or domain `Participant` types. Key file: `Class_JitsiParticipant.txt`, `README.md`.
- `src/domains/meeting/JitsiAPI/6-JitsiTrack/` : Track lifecycle, errors and events — use for `trackService` and `useLocalTracks` / `useRemoteTracks`. Key files: `JitsiTrackEvents_Enum.txt`, `JitsiTrackErrors_Enum.txt`, `Class_JitsiTrackError.txt`, `README.md`.

**How to use these references**:

- Read the README and Class\_\* files first to understand lifecycle and method signatures.
- Prefer the `Class_*` and `Events_Enum` files for event names and method arguments; these reflect the idiomatic SDK surface used in examples.
- Only import and wrap the SDK methods you need into small, testable service functions. Avoid leaking SDK objects into React components; wrap them in services/hooks.

**Choosing the right API and avoiding redundancy**:

- There are several enums and error files that look overlapping. Do not import all enums wholesale — select only the events/errors you actually handle (connection, conference joined/left, track added/removed, device changed, participant joined/left).
- Recommended minimal set to implement first: `JitsiConnection` (connect/disconnect), `JitsiConference` (join/leave, participant events), `JitsiMediaDevices` (create/release local tracks), `JitsiTrack` (mute/unmute), `JitsiParticipant` (participant info).
- Keep a short adapter layer (`meetingService`, `trackService`, `deviceService`) that maps SDK events → your store actions. This adapter is where you'll filter out redundant events and normalize payloads.

---

## 1. Project Overview (aligned to workspace)

The meeting subdomain will:

- Create, join, and end meetings using `meetingService` that wraps `JitsiConnection` + `JitsiConference`.
- Manage participant list and participant state via `meetingStore` and `Participant` domain types.
- Manage audio/video tracks via `trackService` + `deviceService` (create/release local tracks, subscribe to remote tracks).
- Keep UI components (in `components/meeting`) free of SDK logic; use hooks to orchestrate domain services.
- Persist meeting history with `historyService` for audits and analytics.

---

## 2. Folder Structure (Next.js + domain excerpts)

Keep the folder layout (example) under `/src` and `/app` as the canonical design for the meeting module. Use `JitsiAPI/` files as a reference to implement the services described here.

```
/app
  /meeting
    /create
      page.tsx
    /[meetingId]
      page.tsx
      loading.tsx
      layout.tsx

/src
  /domains
    /meeting
      /hooks
        useMeeting.ts
        useLocalTracks.ts
        useRemoteTracks.ts
      /services
        meetingService.ts
        trackService.ts
        deviceService.ts
        historyService.ts
      /store
        meetingStore.ts
        trackStore.ts
      /types
        meeting.ts
        tracks.ts

  /components
    /meeting
      MeetingContainer.tsx
      ControlBar.tsx
      ParticipantGrid.tsx
      LocalVideo.tsx
      RemoteVideo.tsx
```

---

## 3. Implementation Guidance (concise)

- **Services**: Implement `meetingService`, `trackService`, `deviceService`, `historyService` as thin adapters over the SDK classes in `JitsiAPI/`.
- **Hooks**: `useMeeting` should orchestrate `meetingService` (join/end, participant list), `useLocalTracks` should control mic/cam via `trackService` + `deviceService`, and `useRemoteTracks` should subscribe to conference events.
- **Stores**: Keep stores serializable; map SDK events into small payloads before writing to store.
- **Teardown**: Ensure `deviceService` releases hardware when toggling camera/mic or ending a meeting.

---

## 4. Mapping: JitsiAPI → Project Responsibilities

- **`meetingService`**: map to `JitsiConnection` (`2-JitsiConnection/Class_JitsiConnection.txt`) and `JitsiConference` (`1-JitsiConference/*`). Handle connect, reconnect, join, leave, and conference-level events.
- **`deviceService`**: map to `3-JitsiMediaDevices/Class_JitsiMediaDevices.txt` — device enumeration, getUserMedia wrappers and release logic.
- **`trackService`**: map to `6-JitsiTrack/*` — create/destroy local tracks, mute/unmute, and track-level event handling.
- **`Participant` types & store**: map to `5-JitsiParticipant/Class_JitsiParticipant.txt` for participant fields and lifecycle.
- **`useRemoteTracks`**: subscribe to `JitsiConference` track events (`1-JitsiConference/JitsiConferenceEvents_Enum.txt`) and update `trackStore`.

---

## 5. Testing & Tasks

- Unit tests: mock `JitsiAPI` classes (use the `Class_*` files to create mocked shapes). Place tests under `src/domains/**/__tests__/`.
- Integration tests: simulate SDK events (join/leave/track added/removed) and assert store state changes and hook outputs.

---

## 6. Subdomain Copy

Add a focused `agents.md` in the meeting subdomain at `src/domains/meeting/agents.md` that contains the subset of guidance above (services/hooks/store mapping and the JitsiAPI mapping). This file is the on-disk, domain-local guide agents should read when working on meeting code.

---

## 7. Quick Developer Checklist

- **Read** `JitsiAPI/README.md` files for usage notes.
- **Implement** `meetingService` + `trackService` + `deviceService` adapters first.
- **Create** small unit tests that mock `Class_*` shapes from `JitsiAPI/`.
- **Avoid** importing SDK objects into components; use hooks.

---

## 8. Notes on Redundant APIs

- Some enum files contain many error/event constants you may not need. Only surface the enum values your adapter handles to reduce coupling and surface area.
- If two files describe the same event in a different place (event enums vs README examples), prefer the `Events_Enum` file as authoritative for event names.

---

## 9. Current Implementation Status

### Completed

- **Authentication**: Better Auth with OAuth providers configured in `src/lib/auth.ts`
- **Database**: Prisma ORM with PostgreSQL, schemas in `prisma/schema/` covering auth, meetings, recordings, transcripts, and summaries
- **Dashboard UI**: Meeting listing and creation pages at `/dashboard/meetings`
- **Meeting Components**: Refactored from `app/room/[id]` to `src/components/meeting/` for consistency:
    - `ControlBar.tsx` - Media controls and meeting info
    - `ParticipantGrid.tsx` - Participant list panel
    - `ChatPanel.tsx` - Meeting chat interface
    - `SettingsMenu.tsx` - Meeting settings modal
    - `GridLayoutSelector.tsx` - Layout selection popup
    - `LocalVideo.tsx` & `RemoteVideo.tsx` - Video tiles with status indicators
    - `MeetingContainer.tsx` - Main video grid orchestrator
- **App Routing**: Updated to use `/meeting/[meetingId]` for rooms and `/meeting/create` for creation

### In Progress (Placeholder Structure Created)

- **Domain Layer** (`src/domains/meeting/`):
    - `hooks/` - useMeeting, useLocalTracks, useRemoteTracks
    - `services/` - meetingService, trackService, deviceService, historyService
    - `store/` - meetingStore, trackStore
    - `types/` - meeting.ts, tracks.ts
- **Meeting Service Integration**: Connection to Jitsi lib-jitsi-meet SDK

### Next Steps

1. Implement service adapters wrapping lib-jitsi-meet SDK with proper SSR handling

## Repository Agents Guidelines (high level)

Purpose: repository-level, high-level guidance for engineers and automated agents working across domains. Keep policy, conventions, and cross-cutting rules here; put domain-specific implementation notes in each domain's `Agents.md`.

Where to look

- Project overview and setup: see `README.md`.
- Domain-specific implementation notes: see `src/domains/<domain>/Agents.md` (e.g., `src/domains/meeting/Agents.md`).

Key conventions

- Keep SDK or platform-specific code inside small adapters in the relevant domain (e.g., `meetingService`, `trackService`).
- Domain stores and hooks should accept or return only serializable payloads (do not store SDK objects in Redux or persisting stores).
- Avoid importing browser-only libraries at module top-level; prefer dynamic `import()` or guarded `require` inside client-only initialization code. Domain `Agents.md` files contain domain-level examples.

Logging & generated artifacts

- Store agent-generated artifacts such as migration notes and refactoring logs in `/ai_logs` and add that folder to `.gitignore`.

Contact points

- For cross-domain policies (auth, prisma, deployment), consult `README.md` and the relevant domain `Agents.md` files.

This file should remain short. If a domain requires specific examples or quickstarts, add them to that domain's `Agents.md` (not here).
