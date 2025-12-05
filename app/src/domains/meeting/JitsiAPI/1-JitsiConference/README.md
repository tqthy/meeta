# 1-JitsiConference — API Reference

**Title:** JitsiConference (folder)

**Purpose:** Centralized reference for conference-level APIs, events and errors used to create/join/manage multi-party rooms.

**Key files:**

- `AUTH_ERROR_TYPES_ENUM.txt` — authentication-related error enums
- `JitsiConferenceErrors_Enum.txt` — conference error enums
- `JitsiConferenceEvents_Enum.txt` — conference event enums

**Structure (shared template):**

- Purpose: Short description of the file/folder intent.
- Members: CSV or table listing enums/methods (kept in the source `.txt` files).
- Usage notes: how to consume from the library and best practices.
- Example: Minimal code snippet showing create/join usage.

**Usage notes:**

- Read `JitsiConferenceEvents_Enum.txt` and `JitsiConferenceErrors_Enum.txt` to wire event handlers and error handling in the app.
- Use `AUTH_ERROR_TYPES_ENUM.txt` to map auth-related rejection reasons and show appropriate UI messaging.

**Example (minimal):**

```js
// Pseudocode: create a conference and attach basic listeners
const conf = connection.initJitsiConference("room@example.com", options);
conf.on("conference.joined", () => console.log("joined"));
conf.on("conference.trackAdded", (track) => attachTrack(track));
conf.join();
```

---

This README provides a consistent template to help coding agents and developers quickly find the authoritative source files in this folder.
