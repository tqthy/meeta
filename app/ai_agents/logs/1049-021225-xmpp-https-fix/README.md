# Quick Reference - XMPP HTTPS Fix

## The Issue

```
[ERROR] Strophe error: service-unavailable
Operation: get STUN/TURN credentials (extdisco:2)
```

## The Fix

**File:** `app/.env`

Changed from:

```env
NEXT_PUBLIC_JITSI_WS_URL=wss://localhost:8443
```

To:

```env
NEXT_PUBLIC_JITSI_WS_URL=wss://localhost:8443/xmpp-websocket
```

## Why?

XMPP WebSocket service needs the full endpoint path `/xmpp-websocket` to properly initialize and serve STUN/TURN credentials.

## What Changed?

- ✅ `app/.env` - Added `/xmpp-websocket` path
- ❌ No code changes in TypeScript/JavaScript
- ❌ No Docker configuration changes
- ❌ No Jitsi config changes (already correct)

## Steps to Apply

1. Update `.env` (already done ✓)
2. Restart your app:

    ```powershell
    # For Docker:
    docker-compose down
    docker-compose up -d

    # For local dev:
    # Stop npm run dev (Ctrl+C)
    # Start: npm run dev
    ```

3. Clear browser cache: `Ctrl+Shift+Delete`
4. Hard refresh page: `Ctrl+Shift+R`
5. Join a room and verify video/audio works

## Success Indicator

In browser console, you should see:

```
✓ Strophe connected
✓ XMPP session established
✓ STUN/TURN servers retrieved
```

NOT:

```
✗ service-unavailable
✗ extdisco:2 error
```

## Troubleshooting

| Problem                  | Solution                                           |
| ------------------------ | -------------------------------------------------- |
| Still seeing error       | Clear cache + hard refresh + restart app           |
| Port 8443 issue          | Check Docker ports: `docker ps`                    |
| SSL certificate error    | Normal for localhost - browser accepts it          |
| Video still doesn't work | Check if Jitsi containers are running: `docker ps` |

---

**Status:** Ready to deploy  
**Priority:** Critical - Blocks video connections  
**Rollback:** Simple `.env` revert if needed
