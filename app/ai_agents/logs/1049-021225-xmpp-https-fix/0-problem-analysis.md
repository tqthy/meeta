# XMPP HTTPS Connection Fix - Problem Analysis

## Error Details

**Date:** December 2, 2025 - 10:49 AM

**Error Message:**

```
[ERROR] [xmpp:StropheErrorHandler] Strophe error:
{
  "reason": "service-unavailable",
  "raw": "<error xmlns=\"jabber:client\" type=\"cancel\"><service-unavailable xmlns=\"urn:ietf:params:xml:ns:xmpp-stanzas\"/></error>",
  "domain": "meet.jitsi",
  "operation": "get STUN/TURN credentials (extdisco:2)",
  "userJid": "16013a3e-6fdf-4186-82f8-937beab59d12@meet.jitsi/NljvV6lBNInk",
  "xmlns": "urn:xmpp:extdisco:2"
}
```

## Root Cause

The error occurs during the XMPP connection initialization when trying to fetch STUN/TURN server credentials using the `extdisco:2` (External Disco) protocol. The "service-unavailable" error indicates:

1. **Mixed Protocol Issue**: The application is mixing HTTP and HTTPS protocols
    - Backend is hosted at **HTTPS**
    - `.env` configuration incorrectly uses **WSS (WebSocket Secure)** but may be pointing to wrong port or mixing protocols

2. **Incorrect Jitsi Configuration**:
    - The WebSocket URL should align with the backend protocol
    - STUN/TURN services require consistent protocol usage (all HTTPS or all HTTP)

3. **Certificate/Trust Issues**:
    - Mixed protocol can cause browser CORS and certificate validation failures
    - XMPP service cannot communicate securely with endpoints

## Files Affected

1. `d:\Code\SE400\meeta\app\.env` - Contains incorrect `NEXT_PUBLIC_JITSI_WS_URL`
2. `d:\Code\SE400\meeta\app\src\services\JitsiService.ts` - Uses the environment variable
3. `d:\Code\SE400\meeta\jitsi-config\web\config.js` - Jitsi Meet web configuration

## Current Configuration Issues

### In `.env`:

```
NEXT_PUBLIC_JITSI_WS_URL=wss://localhost:8443
```

### In `JitsiService.ts` (lines 98-109):

```typescript
const baseUrl = process.env.NEXT_PUBLIC_JITSI_WS_URL || 'ws://localhost:8000'
const keepAliveUrl = baseUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')
```

### In `config.js` (lines 14-15):

```javascript
config.bosh = 'https://localhost:8443/' + subdir + 'http-bind'
config.websocket = 'wss://localhost:8443/' + subdir + 'xmpp-websocket'
```

## Why It Fails

1. When browser connects via WSS, the XMPP client tries to fetch STUN/TURN credentials
2. The `extdisco:2` service is unavailable because:
    - XMPP service isn't properly initialized with HTTPS
    - Protocol mismatch prevents secure communication
    - The endpoint configuration doesn't match backend reality

## Solution Overview

- Ensure **all protocols match**: HTTPS ↔ WSS
- Update environment variables to reflect actual backend configuration
- Verify Jitsi Meet configuration is consistent
- Test connection to ensure STUN/TURN credentials can be fetched
