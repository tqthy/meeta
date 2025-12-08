**JitsiSDKAPI — Event Listener Reference**

- **Location**: `app/src/app/jitsi-meeting/JitsiSDKAPI`
- **Purpose**: This folder contains documentation for events emitted by the Jitsi Meet web SDK / iframe API used in the project. Use these files to look up event names, the shape of the callback object, and brief descriptions.

Files:

- `EventListener.txt`: Main event catalog. Structured file with a header (Title/Purpose) and a `Members (CSV)` section listing events. Columns: `stt` (index), `event` (event name), `object` (shape of listener argument), `description` (explanation and notes).
- `1-JitsiConference/AUTH_ERROR_TYPES_ENUM.txt`: Example enum documentation using the same style (Title, Purpose, Members CSV, Notes).

How to use:

- Search for the event name in `EventListener.txt` to find the expected callback object and description.
- When wiring SDK listeners, prefer to extract and normalize only serializable fields from SDK objects before storing or dispatching them (see project architecture guidelines).

Notes and conventions:

- The CSV lines are intended for human-readability and quick parsing; fields contain simple JSON-like shapes but are not strict JSON.
- Keep event names stable in code — renaming events in this doc won't change runtime behavior.
- If you add or update an event, update both `EventListener.txt` and this README with a brief change note.

Contact / Source:

- These notes are based on in-repo references and Jitsi SDK integration files maintained in the repository.
