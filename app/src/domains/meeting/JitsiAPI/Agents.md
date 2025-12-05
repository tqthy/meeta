JitsiAPI reference: use each folder's `README.md` and the `Class_*` / `*_Events_Enum.txt` files as the authoritative source for event names, method signatures, and short usage examples. Keep this folder for compact, machine-friendly API reference only.

If you need examples or implementation notes, open the specific folder (e.g. `1-JitsiConference/README.md`) — avoid duplicating these details in multiple `Agents.md` files.
**Overview**

- **Project root**: `JitsiAPI` — a small, organized collection of notes and source-API descriptions for the Jitsi Meet JS API.
- **Purpose**: provide a compact developer reference that maps API surface areas (connections, conferences, tracks, participants, media devices and the top-level `JitsiMeetJS` bootstrap) to the specific files in this workspace.

This repository contains concise, machine- and human-readable reference files for the `lib-jitsi-meet` API surface. Files are organized by responsibility so coding agents and developers can quickly find authoritative lists of events, errors, class methods, and usage notes.

How to use these docs (for coding agents)

- Use `README.md` in each folder as the entrypoint for that API surface. The `*.txt` files contain the canonical lists (CSV or tables) that you can parse or display to engineers.
- Prefer the CSV blocks for programmatic extraction (they list enum name, string value and short description). Use the README for examples and integration guidance.
- When updating code, reference the relevant enum file (e.g. `1-JitsiConference/JitsiConferenceEvents_Enum.txt`) to ensure event names and payload keys match the library.

Folder checklist

- `1-JitsiConference/` — conference events and errors. See `README.md` and the three canonical files: `AUTH_ERROR_TYPES_ENUM.txt`, `JitsiConferenceErrors_Enum.txt`, `JitsiConferenceEvents_Enum.txt`.
- `2-JitsiConnection/` — connection class, connection events and errors. See `Class_JitsiConnection.txt`, `JitsiConnectionErrors_Enum.txt`, `JitsiConnectionEvents_Enum.txt`.
- `3-JitsiMediaDevices/` — media device utilities and related events. See `Class_JitsiMediaDevices.txt`, `JitsiMediaDevicesEvents_Enum.txt`.
- `4-JitsiMeetJS/` — top-level bootstrap for the library. See `Variable_JitsiMeetJS.txt` and the folder README.
- `5-JitsiParticipant/` — participant object API. See `Class_JitsiParticipant.txt`.
- `6-JitsiTrack/` — track-level errors and events. See `Class_JitsiTrackError.txt`, `JitsiTrackErrors_Enum.txt`, `JitsiTrackEvents_Enum.txt`.

Recommended next actions for maintainers

- Keep the CSV enum blocks authoritative — update them when upstream `lib-jitsi-meet` changes.
- Add short code snippets under each README demonstrating common flows (init → connect → createLocalTracks → join). These make onboarding faster.
- If you want programmatic access, convert CSV blocks into JSON files (e.g. `*.json`) so agents and tools can import them directly.

Integration sequence (quick reference)

- Initialize: call `JitsiMeetJS.init(options)`.
- Create connection: `new JitsiMeetJS.JitsiConnection(appID, token, options)` and `connect()`.
- Create local media: `JitsiMeetJS.createLocalTracks({ devices: ['audio','video'] })`.
- Create conference: `connection.initJitsiConference(roomName, confOptions)`.
- Join: `conference.join()` and wire event handlers from `JitsiConferenceEvents_Enum.txt`.

---

Enhanced: consolidated guidance and agent-friendly usage tips.

**1-JitsiConference**

- **Purpose**: Contains the conference-level API notes and enumerations used to join and manage multi-party rooms.
- **Key files**: `AUTH_ERROR_TYPES_ENUM.txt`, `JitsiConferenceErrors_Enum.txt`, `JitsiConferenceEvents_Enum.txt`.
- **Primary responsibilities**: tracking conference lifecycle (join/leave), participant list management, delivery of conference-wide events (participant-joined, participant-left, track-added/removed, dominant-speaker, etc.).
- **Events / Errors**: Files in this folder list event names and error enums that callers should handle when subscribing to a `JitsiConference` instance.
- **Usage notes**: Typical flow is to create or retrieve a `JitsiConference` object from an active `JitsiConnection`, call `join` with room credentials and then attach listeners for the events listed in `JitsiConferenceEvents_Enum.txt`. Handle auth/permission errors using enums from `AUTH_ERROR_TYPES_ENUM.txt`.

**2-JitsiConnection**

- **Purpose**: Documents the connection layer — establishing and maintaining XMPP/WebSocket signaling to a Jitsi Videobridge (or the configured signaling server).
- **Key files**: `Class_JitsiConnection.txt`, `JitsiConnectionErrors_Enum.txt`, `JitsiConnectionEvents_Enum.txt`.
- **Primary responsibilities**: connection lifecycle (connect/disconnect/reconnect), authentication, and creation of conference sessions via the `JitsiConnection` instance.
- **Events / Errors**: Connection-level events (connected, disconnected, connection failed, auth required) and error enums live here and should be handled globally to maintain app state.
- **Usage notes**: Initialize `JitsiConnection` via the `JitsiMeetJS` bootstrap, call `connect()`, then use the connection to create `JitsiConference` objects. Listen for connection events from `JitsiConnectionEvents_Enum.txt` to implement global reconnect or UI fallback logic.

**3-JitsiMediaDevices**

- **Purpose**: Describes device enumeration and selection: cameras, microphones and speakers.
- **Key files**: `Class_JitsiMediaDevices.txt`, `JitsiMediaDevicesEvents_Enum.txt`.
- **Primary responsibilities**: list available devices, request permissions, switch input/output devices, create or reattach tracks sourced from chosen devices.
- **Events / Errors**: Device change events and permission-related events notify the app when hardware availability changes (e.g., USB headset plugged/unplugged).
- **Usage notes**: Use the media devices API to present device selection UI before or during a call. When switching devices, gracefully stop and recreate `JitsiTrack` objects or use API-supported hot-swapping patterns.

**4-JitsiMeetJS**

- **Purpose**: The global bootstrap / entry point for the Jitsi Meet JS library.
- **Key files**: `Variable_JitsiMeetJS.txt` (documents the top-level global or factory that exposes `JitsiConnection`, `JitsiTrack`, `JitsiConference`, `createLocalTracks`, etc.).
- **Primary responsibilities**: initialize library runtime, hold configuration helpers, and surface factory methods to construct connections and local tracks.
- **Usage notes**: Typical first step in any integration is to import or include `JitsiMeetJS`, call its `init` (if present) with config options, then use it to create `JitsiConnection` and local tracks via `createLocalTracks` / `createLocalTracksF` style helpers.

**5-JitsiParticipant**

- **Purpose**: Contains the participant-level class description — the remote user abstraction in a conference.
- **Key files**: `Class_JitsiParticipant.txt`.
- **Primary responsibilities**: represent per-participant metadata (id, display name, role), manage participant-level events and expose functions to query participant tracks and attributes.
- **Events / Errors**: Participant join/leave and metadata change events are documented here indirectly via `JitsiConference` events but the participant class describes object-level helpers.
- **Usage notes**: When processing `participant-joined` or `participant-left` events from `JitsiConference`, the payload will map to instances described by `Class_JitsiParticipant.txt`. Use the participant object to inspect tracks, names and roles.

**6-JitsiTrack**

- **Purpose**: Documents track-level objects for audio/video screenshare streams and related errors/events.
- **Key files**: `Class_JitsiTrackError.txt`, `JitsiTrackErrors_Enum.txt`, `JitsiTrackEvents_Enum.txt`.
- **Primary responsibilities**: creation and lifecycle of audio/video tracks, capturing permissions and runtime errors, attaching/detaching to DOM elements, and publishing to conferences.
- **Events / Errors**: Track-specific events (track-muted, track-unmuted, track-stopped) and track error enums should be used to drive UI feedback and recovery. See `JitsiTrackErrors_Enum.txt` and `Class_JitsiTrackError.txt` for error-handling guidance.
- **Usage notes**: Use `JitsiMeetJS` helpers to create local `JitsiTrack` objects, attach them to video/audio elements for local preview, and pass to `JitsiConference` publish methods. Monitor events listed in `JitsiTrackEvents_Enum.txt` to handle lost sources or permission issues.

**Common integration sequence (high level)**

- **1. Initialize**: set up `JitsiMeetJS` (global bootstrap described in `4-JitsiMeetJS/Variable_JitsiMeetJS.txt`).
- **2. Create connection**: instantiate `JitsiConnection` (see `2-JitsiConnection/Class_JitsiConnection.txt`) and call connect. Subscribe to connection events from `JitsiConnectionEvents_Enum.txt`.
- **3. Create local media**: enumerate/select devices via `3-JitsiMediaDevices/Class_JitsiMediaDevices.txt` and create local tracks (audio/video).
- **4. Create / join conference**: create a `JitsiConference` using the `JitsiConnection`, then call `join`. Subscribe to `JitsiConferenceEvents_Enum.txt` for participant and track lifecycle events.
- **5. Manage participants and tracks**: respond to participant events (refer to `5-JitsiParticipant/Class_JitsiParticipant.txt`) and track events (see `6-JitsiTrack` files) to attach remote streams to the UI, update participant lists, and handle errors.

**Documentation & developer notes**

- **Filenames matter**: The files in each numbered folder are narrowly focused—enums and class notes are separated to make it easy to find event names and error codes to handle.
- **Event-first design**: The architecture is event-driven. Integrations should prefer subscribing to the documented events rather than polling state.
- **Error handling**: Centralize handling for connection and track errors using the error enums in `2-JitsiConnection` and `6-JitsiTrack`. Graceful recovery (re-create tracks, re-establish connection) yields the best UX.
- **UI guidance**: Build the device selection UI from `3-JitsiMediaDevices` enumerations and refresh lists on device-change events. Provide clear permission prompts and fallbacks.

**Next steps (suggested)**

- **Add short usage snippets**: For each folder add one small example that shows the minimal code sequence (init → connect → createLocalTracks → join), making the docs immediately actionable.
- **Link events to handlers**: Add cross-links in `Agents.md` from event names to suggested handler code for common scenarios (reconnect, mute/unmute, participant join).
- **Versioning**: If the notes apply to a specific Jitsi Meet JS version, add a `VERSION` note at the top to avoid future drift.

---

Generated: concise developer reference describing each API folder present in this workspace.
