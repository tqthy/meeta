# 3-JitsiMediaDevices — API Reference

**Title:** JitsiMediaDevices (folder)

**Purpose:** Device enumeration and management (cameras, microphones, speakers). Contains events about device availability and permission state.

**Key files:**

- `Class_JitsiMediaDevices.txt` — methods like `enumerateDevices`, `setAudioOutputDevice`, `isDevicePermissionGranted`.
- `JitsiMediaDevicesEvents_Enum.txt` — events for device list changes and permission prompts.

**Structure (shared template):**

- Purpose
- Members (CSV/table)
- Usage notes
- Example

**Usage notes:**

- Use `JitsiMeetJS.mediaDevices.enumerateDevices()` to populate device lists.
- Listen for `mediaDevices.devicechange` and `rtc.permissions_changed` to refresh UI.

**Example (minimal):**

```js
JitsiMeetJS.mediaDevices.enumerateDevices((devices) => showDeviceList(devices));
JitsiMeetJS.mediaDevices.addEventListener("mediaDevices.devicechange", () =>
  refreshDeviceList()
);
```

---

Standard README for consistent agent consumption.
