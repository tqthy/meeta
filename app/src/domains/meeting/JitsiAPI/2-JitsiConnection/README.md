# 2-JitsiConnection — API Reference

**Title:** JitsiConnection (folder)

**Purpose:** Connection and signaling layer reference — shows events, errors, and the `Class_JitsiConnection` API.

**Key files:**

- `Class_JitsiConnection.txt` — methods/properties of the connection class
- `JitsiConnectionErrors_Enum.txt` — connection-related errors
- `JitsiConnectionEvents_Enum.txt` — connection-level events

**Structure (shared template):**

- Purpose
- Members (CSV/table)
- Usage notes
- Example

**Usage notes:**

- Use `JitsiConnection.connect()` and handle `connection.connectionEstablished`, `connection.connectionFailed`, and `connection.connectionDisconnected` events.
- Map errors from `JitsiConnectionErrors_Enum.txt` to user-friendly messages and retry logic.

**Example (minimal):**

```js
const conn = new JitsiMeetJS.JitsiConnection(appID, token, options);
conn.addEventListener("connection.connectionEstablished", () =>
  console.log("connected")
);
conn.connect();
```

---

Provides a consistent folder README to help agents and developers quickly locate canonical files and examples.
