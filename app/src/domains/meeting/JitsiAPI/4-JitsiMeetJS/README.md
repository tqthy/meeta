# 4-JitsiMeetJS — API Reference

**Title:** JitsiMeetJS (folder)

**Purpose:** Global bootstrap and factory functions (init, createLocalTracks, JitsiConnection class reference, constants and utilities).

**Key files:**

- `Variable_JitsiMeetJS.txt` — top-level API shape (methods, properties, helpers).

**Structure (shared template):**

- Purpose
- Members (CSV/table)
- Usage notes
- Example

**Usage notes:**

- Call `JitsiMeetJS.init(options)` on startup, then use `createLocalTracks` and `JitsiConnection` to build calls.

**Example (minimal):**

```js
JitsiMeetJS.init();
JitsiMeetJS.createLocalTracks({ devices: ['audio','video'] }).then(tracks => /* publish */);
```

---

Standard README to make this folder consistent for automated tools and coding agents.
