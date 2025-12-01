# Meeta vs docker-jitsi-meet Comparison Report

## Configuration Comparison

### Environment Variables

**docker-jitsi-meet (.env):**

- CONFIG: ~/.jitsi-meet-cfg (user home directory)
- HTTP_PORT: 8000
- HTTPS_PORT: 8443
- TZ: UTC
- JICOFO_AUTH_PASSWORD: 6eefefaab1f2815bc511b64f5c394bb2
- JVB_AUTH_PASSWORD: 501c2f26b685f40fe33bc8d1474443f8
- All other Jitsi passwords set

**meeta (.env):**

- CONFIG: ./jitsi-config (relative path - project directory)
- HTTP_PORT: 8000
- HTTPS_PORT: 8443
- TZ: UTC
- JICOFO_AUTH_PASSWORD: NKmVG2w41nlkOMspiP6vXjE0uyCh5bcg
- JVB_AUTH_PASSWORD: IGxeEW6FrpJA4fSstTdMNywBhjQZzLub
- DISABLE_HTTPS: 1 (for development)
- Additional: Postgres & Redis configs

### Docker Compose Services

**docker-jitsi-meet:**

1. web (jitsi/web)
2. prosody (jitsi/prosody)
3. jicofo (jitsi/jicofo)
4. jvb (jitsi/jvb)

**meeta:**

1. postgres (postgres:16-alpine) ← EXTRA
2. redis (redis:7-alpine) ← EXTRA
3. web (jitsi/web)
4. prosody (jitsi/prosody)
5. jicofo (jitsi/jicofo)
6. jvb (jitsi/jvb)

### Key Differences

1. **Storage Location:**

   - docker-jitsi-meet: Uses ~/.jitsi-meet-cfg (persistent across projects)
   - meeta: Uses ./jitsi-config (per-project, version controlled)

2. **Additional Services:**

   - meeta includes Postgres for app database
   - meeta includes Redis for caching/sessions
   - These are for the Next.js app, not Jitsi

3. **Development Mode:**

   - meeta has DISABLE_HTTPS=1 for local dev
   - docker-jitsi-meet uses standard HTTPS

4. **Container Names:**
   - docker-jitsi-meet: No explicit container_name (Docker Compose default)
   - meeta: Prefixed with "meeta-" for clarity

### Current Status

✓ All Jitsi containers running successfully
✓ Jicofo connected to Prosody XMPP server  
✓ JVB joined the brewery MUC
✓ Web interface accessible at http://localhost:8000
✓ Postgres & Redis healthy for app backend

### Conclusion

The setup is **working correctly**. The differences are intentional:

- Meeta adds Postgres/Redis for the Next.js application
- Uses local jitsi-config for easier development
- Both setups are functionally equivalent for Jitsi Meet

No configuration issues detected.
