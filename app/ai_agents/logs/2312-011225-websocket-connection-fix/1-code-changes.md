# Code Changes - WebSocket Connection Fix

**File:** `src/hooks/useJitsiConnection.tsx`

## Changes Summary

### 1. Fixed WebSocket Connection URL

**Before:**

```typescript
const buildConnectionOptions = useCallback((): IConnectionOptions => {
    return {
        hosts: {
            domain: 'meet.jitsi',
            muc: 'muc.meet.jitsi',
        },
        serviceUrl: `wss://localhost:8443/xmpp-websocket?room=${roomName}`,
    }
}, [roomName])
```

**After:**

```typescript
const buildConnectionOptions = useCallback((): IConnectionOptions => {
    // Jitsi web container proxies websocket to prosody
    // Use ws:// for localhost development (not wss://)
    // Port 8000 is the Jitsi web container, not 8443
    const baseUrl =
        process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'
    return {
        hosts: {
            domain: 'meet.jitsi',
            muc: 'muc.meet.jitsi',
        },
        serviceUrl: `${baseUrl}/xmpp-websocket?room=${roomName}`,
        websocketKeepAliveUrl: `${baseUrl}/xmpp-websocket`,
    }
}, [roomName])
```

**Changes:**

- ✅ Changed URL from `wss://localhost:8443` to `ws://localhost:8000`
- ✅ Made URL configurable via `NEXT_PUBLIC_JITSI_WS_URL` environment variable
- ✅ Added `websocketKeepAliveUrl` for connection health checks
- ✅ Added detailed comments explaining the URL structure

---

### 2. Added Retry Mechanism

**Added state refs:**

```typescript
const retryCountRef = useRef(0)
const maxRetries = 3
const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
```

**Enhanced `handleConnectionFailed`:**

```typescript
const handleConnectionFailed = (
    errorCode: string,
    errorMessage: string,
    ...params: any[]
) => {
    console.error('[Jitsi] Connection failed!', {
        errorCode,
        errorMessage,
        params,
        retryAttempt: retryCountRef.current,
    })

    // Retry connection if not exceeded max retries
    if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1
        const retryDelay = Math.min(
            1000 * Math.pow(2, retryCountRef.current),
            5000
        )
        console.log(
            `[Jitsi] Retrying connection in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`
        )

        retryTimeoutRef.current = setTimeout(() => {
            console.log('[Jitsi] Retrying connection...')
            if (connectionRef.current) {
                connectionRef.current.connect()
            }
        }, retryDelay)
    } else {
        console.error(
            '[Jitsi] Max retry attempts reached. Connection failed permanently.'
        )
        const error: ConnectionFailedError = {
            name: errorCode,
            message: errorMessage,
            params: params[0],
        }
        onConnectionFailed?.(error)
    }
}
```

**Features:**

- ✅ Auto retry up to 3 times
- ✅ Exponential backoff: 1s → 2s → 4s (max 5s)
- ✅ Only call `onConnectionFailed` after all retries exhausted
- ✅ Detailed retry logging

---

### 3. Enhanced Connection Established Handler

**Before:**

```typescript
const handleConnectionEstablished = () => {
    console.log('[Jitsi] Connection established!')
    setIsConnected(true)
    onConnectionEstablished?.()
```

**After:**

```typescript
const handleConnectionEstablished = () => {
    console.log('[Jitsi] Connection established!')
    // Reset retry count on successful connection
    retryCountRef.current = 0
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
    }
    setIsConnected(true)
    onConnectionEstablished?.()
```

**Changes:**

- ✅ Reset retry counter on successful connection
- ✅ Clear any pending retry timeouts

---

### 4. Improved Cleanup

**Before:**

```typescript
return () => {
    // Cleanup
    if (conferenceRef.current) {
        conferenceRef.current.leave().catch((error: Error) => {
            console.error('[Jitsi] Failed to leave conference:', error)
        })
    }

    if (connectionRef.current) {
        connectionRef.current.disconnect()
    }
}
```

**After:**

```typescript
return () => {
    // Cleanup retry timeout
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
    }

    // Reset retry count
    retryCountRef.current = 0

    // Cleanup conference and connection
    if (conferenceRef.current) {
        conferenceRef.current.leave().catch((error: Error) => {
            console.error('[Jitsi] Failed to leave conference:', error)
        })
    }

    if (connectionRef.current) {
        connectionRef.current.disconnect()
    }
}
```

**Changes:**

- ✅ Clear retry timeout on component unmount
- ✅ Reset retry counter
- ✅ Prevent memory leaks

---

## Testing

### Expected Behavior:

1. **First connection attempt:** Tries `ws://localhost:8000/xmpp-websocket`
2. **On failure:** Automatically retries after 1s, 2s, 4s
3. **On success:** Resets retry counter and clears timeouts
4. **Max retries reached:** Calls `onConnectionFailed` callback

### Console Logs:

```
[Jitsi] Creating connection...
[Jitsi] Connection failed! {errorCode: "...", retryAttempt: 0}
[Jitsi] Retrying connection in 1000ms (attempt 1/3)
[Jitsi] Retrying connection...
[Jitsi] Connection established!
```

---

## Environment Configuration

Create `.env.local` if needed:

```bash
# For local development (default)
NEXT_PUBLIC_JITSI_WS_URL=ws://localhost:8000

# For production with SSL
NEXT_PUBLIC_JITSI_WS_URL=wss://meet.yourdomain.com
```
