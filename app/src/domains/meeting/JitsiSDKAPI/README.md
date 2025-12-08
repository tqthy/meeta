**JitsiSDKAPI — Reference Documentation**

- **Location**: `app/src/domains/meeting/JitsiSDKAPI`
- **Purpose**: This folder contains comprehensive reference documentation for the Jitsi Meet SDK (iframe API / web SDK) used in the project. Use these files to look up commands, events, and functions available in the Jitsi Meet External API.

## Files

### `Commands.txt`

Catalog of commands that can be executed via `api.executeCommand(command, ...arguments)`. Contains:

- **Columns**: `stt` (index), `command` (command name), `parameters` (input parameters and types), `description` (command behavior)
- **Usage**: Control meeting behavior, participant actions, UI state, and moderator functions
- **Note**: Some commands require moderator privileges

### `EventListener.txt`

Catalog of events emitted by Jitsi Meet that can be listened to via `api.addListener(event, listener)`. Contains:

- **Columns**: `stt` (index), `event` (event name), `object` (shape of callback argument), `description` (when the event fires)
- **Usage**: React to meeting state changes, participant actions, and UI events
- **Architecture note**: When wiring SDK listeners, extract and normalize only serializable fields from SDK objects before storing or dispatching them (see project architecture guidelines)

### `Functions.txt`

Catalog of asynchronous functions and methods available on the Jitsi Meet API instance. Contains:

- **Columns**: `stt` (index), `function name`, `parameters` (input parameters), `object` (return value or Promise resolution), `description` (function behavior)
- **Usage**: Query meeting state, retrieve participant info, control devices, and perform actions
- **Note**: Most functions return Promises; some are synchronous getters

## How to Use

1. **Finding Commands**: Search `Commands.txt` for the command name to find required parameters and behavior
2. **Listening to Events**: Search `EventListener.txt` for the event name to understand the callback object structure
3. **Calling Functions**: Search `Functions.txt` for the function name to see parameters and return values
4. **Integration**: All three files follow the same format (Title, Purpose, Members CSV, Notes) for consistency

## Notes and Conventions

- CSV format is human-readable; fields contain type annotations but are not strict JSON
- Keep command/event/function names stable in code — renaming in docs won't change SDK runtime behavior
- All files are in English for international collaboration
- Parameter types use TypeScript-style annotations (e.g., `string`, `boolean`, `Object`, `Array<T>`)
- Optional parameters are marked with `?` or noted as "optional" in descriptions

## Source

These reference files are based on:

- Official Jitsi Meet External API documentation
- In-repo integration testing and SDK usage
- Community contributions and workspace reference files

## Updates

When adding or updating commands/events/functions:

1. Update the corresponding `.txt` file using the Title/Purpose/CSV/Notes structure
2. Update this README if adding new file types or significant changes
3. Keep descriptions concise and include parameter types
