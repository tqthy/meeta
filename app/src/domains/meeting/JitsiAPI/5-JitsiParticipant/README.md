# 5-JitsiParticipant — API Reference

**Title:** JitsiParticipant (folder)

**Purpose:** Participant-level abstraction (metadata, tracks, roles, state) used by `JitsiConference`.

**Key files:**

- `Class_JitsiParticipant.txt` — constructors, getters, setters and helper methods for participant objects.

**Structure (shared template):**

- Purpose
- Members (CSV/table)
- Usage notes
- Example

**Usage notes:**

- Use the participant API to inspect participant tracks, roles, display names and to update participant-local properties.

**Example (minimal):**

```js
conf.on("conference:userJoined", (participant) => {
  console.log("participant id", participant.getId());
});
```

---

Adds a consistent README for this folder to help coding agents and developers locate details quickly.
