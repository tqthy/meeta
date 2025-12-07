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
const conf = connection.initJitsiConference('room@example.com', options)
conf.on('conference.joined', () => console.log('joined'))
conf.on('conference.trackAdded', (track) => attachTrack(track))
conf.join()
```

---

This README provides a consistent template to help coding agents and developers quickly find the authoritative source files in this folder.

## Status & Maintenance

- Several `Class_*.txt` reference files in this folder have been standardized to a shared English template (Title, Purpose, Members CSV, Usage notes). Descriptive text has been translated from Vietnamese to English where present.
- The CSV blocks that list enums, events and method signatures are authoritative and intended for programmatic parsing — do not change the left-most tokens (enum/event/method names) unless upstream `lib-jitsi-meet` changes.
- Ongoing: a translation pass is still in progress for a small number of files; run a repository-wide search for non-ASCII or Vietnamese phrases before finalizing changes.

### Maintenance notes

- When updating these files, update the corresponding `JitsiConferenceEvents_Enum.txt` or `JitsiConferenceErrors_Enum.txt` if any symbolic names change.
- Keep edits to descriptions only; preserve CSV structure so tooling continues to work.

### How to contribute

- Prefer small, focused PRs that update a few `Class_*.txt` files together with a short README change describing the rationale.
- Before opening a PR: run a text search for Vietnamese phrases and include a brief verification checklist in the PR description.

---

Source: repository-maintained API reference files.

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
const conf = connection.initJitsiConference('room@example.com', options)
conf.on('conference.joined', () => console.log('joined'))
conf.on('conference.trackAdded', (track) => attachTrack(track))
conf.join()
```

---

This README provides a consistent template to help coding agents and developers quickly find the authoritative source files in this folder.
