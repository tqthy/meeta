# Testing & Verification - XMPP HTTPS Connection Fix

## Pre-Deployment Checklist

- [x] `.env` file updated with correct XMPP WebSocket path
- [x] Jitsi config already using HTTPS/WSS on port 8443
- [x] All paths align across configuration files
- [ ] Docker containers restarted (see next section)
- [ ] Application restarted
- [ ] Browser cache cleared
- [ ] Tests passed

## 1. Environment Verification

### Check the updated `.env`:

```powershell
Get-Content app\.env | Select-String "NEXT_PUBLIC_JITSI_WS_URL"
```

**Expected Output:**

```
NEXT_PUBLIC_JITSI_WS_URL=wss://localhost:8443/xmpp-websocket
```

### Check Docker containers are running:

```powershell
docker ps | grep jitsi
```

## 2. Application Restart Steps

### For Development Mode:

```powershell
# Stop the running Next.js dev server (Ctrl+C if running)
# Then restart:
cd app
npm run dev
```

### For Docker Deployment:

```powershell
# Restart all services
docker-compose down
docker-compose up -d

# Verify containers are healthy
docker ps -a
docker logs jitsi-web  # Check for SSL/TLS errors
```

## 3. Manual Testing in Browser

### Step 1: Access the Application

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to your Jitsi room URL

### Step 2: Monitor Strophe Logs

Look for logs from Strophe (XMPP client). You should see:

**Success Indicators:**

```
✓ Strophe connected
✓ XMPP session established
✓ extdisco:2 STUN/TURN service available
✓ Retrieved STUN/TURN servers
```

**Error Indicators (Should NOT see these):**

```
✗ service-unavailable  (This was the original error)
✗ connection-timeout
✗ cert-error
```

### Step 3: Test Media Functionality

1. Join a room with video enabled
2. Check that:
    - ✓ Video stream connects
    - ✓ Audio works
    - ✓ Participants can see each other
    - ✓ No "STUN/TURN" related errors

## 4. Network Debugging (Advanced)

### Check XMPP WebSocket Connection:

1. **In DevTools → Network tab:**
    - Filter by "WS" or "websocket"
    - Look for requests to: `wss://localhost:8443/xmpp-websocket`
    - Status should be: **101 Switching Protocols** (successful upgrade)

2. **Check certificate validity:**

    ```powershell
    # Connect to the Jitsi server
    $cred = New-Object System.Net.NetworkCredential
    $request = [System.Net.WebRequest]::Create("https://localhost:8443/config.js")
    $request.ServerCertificateValidationCallback = {$true}
    try {
        $response = $request.GetResponse()
        "Certificate OK"
    } catch {
        "Certificate Error: $_"
    }
    ```

3. **Check Jitsi container logs:**
    ```powershell
    docker logs -f jitsi-web --tail 50
    docker logs -f prosody --tail 50  # XMPP service
    ```

## 5. Browser Console Expected Output

After successful fix, you should see:

```javascript
// Strophe connection established
[Strophe]  Connected
[Strophe] Jingle sessions: 0
[JitsiMeetJS.js] ... setting up conference ...

// STUN/TURN servers are available
[JitsiMeetJS.js] Got stun servers: stun.l.google.com:19302, ...
[JitsiMeetJS.js] Got turn servers: turn.meet.jitsi:443, ...

// Connection successful
[JitsiMeetJS.js] Joining conference...
```

## 6. Automated Test Commands

### Test XMPP Connectivity:

```powershell
# From the app directory
cd app

# Run a quick connection test (if you have curl)
curl -k "https://localhost:8443/xmpp-websocket"

# Or check if port is open
Test-NetConnection -ComputerName localhost -Port 8443
```

### Monitor Real-Time Logs:

```powershell
# Terminal 1: Watch Next.js logs
npm run dev

# Terminal 2: Watch Docker logs
docker-compose logs -f jitsi-web prosody
```

## 7. Common Issues & Solutions

| Issue                              | Cause                        | Solution                                     |
| ---------------------------------- | ---------------------------- | -------------------------------------------- |
| Still seeing "service-unavailable" | Cache not cleared            | Hard refresh: Ctrl+Shift+R                   |
| WebSocket connection fails         | Port 8443 not exposed        | Check `docker-compose.yml` port mappings     |
| Certificate error                  | Self-signed cert not trusted | Browser allows untrusted certs for localhost |
| STUN/TURN still unavailable        | Old container running        | `docker-compose down` then `up -d`           |

## 8. Success Criteria

The fix is successful when:

1. ✅ Browser connects to `wss://localhost:8443/xmpp-websocket` successfully
2. ✅ No "service-unavailable" error in console
3. ✅ STUN/TURN credentials are fetched
4. ✅ Video/audio streams work correctly
5. ✅ Multiple participants can see each other
6. ✅ Connection remains stable

## 9. Rollback Plan (If Needed)

If the fix causes issues, revert:

```powershell
# Restore original .env
git checkout app\.env

# Restart application
docker-compose restart jitsi-web
# OR
npm run dev  # for local development
```
