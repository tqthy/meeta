# 6-JitsiTrack — API Reference

**Title:** JitsiTrack (folder)

**Purpose:** Track-level objects (audio/video/screenshare), track errors and track events.

**Key files:**

- `Class_JitsiTrackError.txt` — track error class description
- `JitsiTrackErrors_Enum.txt` — track-related error enums
- `JitsiTrackEvents_Enum.txt` — track-related events

**Structure (shared template):**

- Purpose
- Members (CSV/table)
- Usage notes
- Example

**Usage notes:**

- Use the enums to map getUserMedia errors to UI messages, and subscribe to `track.trackMuteChanged`, `track.stopped` events to update the UI.

**Example (minimal):**

```js
localTrack.on("track.muteChanged", () => updateMicUI());
localTrack.on("track.stopped", () => showStoppedState());
```

---

README added to normalize folder structure for coding agents.
