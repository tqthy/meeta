# Jitsi Infrastructure — Agents Guide

Purpose: concise, actionable guidance for automated agents and contributors working in `jitsi-infrastructure/`. Use this file to understand how the local Jitsi stack is organized, how to start it for development, and where to look for key configuration points.

## Quick Overview

- Location: `jitsi-infrastructure/`
- Goal: Self-hosted Jitsi stack + supporting services (Postgres, Redis) used for local development of Meeta.
- Primary entrypoint: `docker-compose.yml` (development compose that includes both Meeta app services and Jitsi services).

## Quick Start (PowerShell)

1. Copy the env file (one-time):

```powershell
cd jitsi-infrastructure
cp .env.example .env
```

2. (Optional) Generate passwords / secrets used by the compose files:

```powershell
# This script updates files under jitsi-config/ with generated secrets
./gen-passwords.sh
```

3. Start the stack:

```powershell
docker compose up -d
```

4. View logs (follow):

```powershell
docker compose logs -f web
docker compose logs -f jvb
docker compose logs -f prosody
```

5. Stop / remove (including volumes):

```powershell
docker compose down -v
```

Notes:

- The compose file maps Postgres to host port `5431` and Redis to `6380` — the Next.js app expects these ports by default in the repository docs.
- If ports conflict, edit `.env` in `jitsi-infrastructure` before `docker compose up` to change `HTTP_PORT`, `HTTPS_PORT`, `POSTGRES_PORT`, `REDIS_PORT`.

## Important Files & Directories

- `docker-compose.yml` — main development composition (services: `web`, `prosody`, `jicofo`, `jvb`, `postgres`, `redis`, etc.).
- `.env.example` / `.env` — environment variables used by the compose file. Always copy `.env.example` to `.env` and edit as needed.
- `gen-passwords.sh` — helper script to generate passwords and update config files (run once before first bring-up).

- `jitsi-config/` — persistent configuration and assets mounted into containers. Keep this directory under version control for local config templates.
  - `web/` — Jitsi web app config and nginx files. Key files: `config.js`, `interface_config.js`, `nginx/site-confs/*`, `keys/` (TLS keys if present).
  - `prosody/` — XMPP server configuration. Look under `prosody/config/` for `prosody.cfg.lua`, `conf.d/` (virtual host configs) and `prosody-plugins-custom/` for plugin code.
  - `jicofo/` — conference focus component configuration (e.g., `jicofo.conf`).
  - `jvb/` — Jitsi Videobridge configuration (`jvb.conf`).
  - `transcripts/` — storage location for server-side transcripts (if enabled).

## Environment Variables To Know

- `CONFIG` — points to `jitsi-config` directory used as a compose volume.
- `HTTP_PORT`, `HTTPS_PORT` — host ports for the web frontend (default example uses `8000`/`8443`).
- `POSTGRES_PORT`, `REDIS_PORT` — host ports for the database and redis used by the Meeta app (defaults are `5431` and `6380`).
- `PUBLIC_URL` / `LETSENCRYPT_*` — set when enabling real domains / LetsEncrypt.

## How this integrates with the Meeta app

- The Next.js app in `app/` expects a Postgres DB and optionally Redis — the compose maps the host ports so app `.env` values can point to `localhost:5431` (Postgres) and `localhost:6380` (Redis) during local development.
- The `web` service exposes a Jitsi web UI and proxies to JVB; the app's client-side code may rely on this stack for full local testing (audio/video and transcripts).

## Common Tasks & Troubleshooting

- Missing `.env` or incorrect values: copy `.env.example` → `.env`, then run `docker compose up -d`.
- Containers not starting or restarting: check `docker compose logs -f <service>` and `docker compose ps`.
- Database connectivity: Postgres is exposed on host port `5431`. Ensure the Meeta app's `DATABASE_URL` matches (example: `postgresql://postgres:postgres@localhost:5431/meeta`).
- Permission / SELinux errors mounting `jitsi-config`: on Linux ensure proper file permissions or use the `:Z` volume option in compose (already present in example).
- TLS and domain setup: set `PUBLIC_URL` to your public domain and configure LetsEncrypt variables in `.env` if you want automatic certificate generation.

Useful commands:

```powershell
# Show container status
docker compose ps

# Tail logs for multiple services
docker compose logs -f web prosody jvb

# Exec into a running container (example: web)
docker compose exec web /bin/bash
```

## Debugging pointers

- `web` logs show HTTP / nginx and JavaScript errors from the Jitsi web frontend.
- `jvb` logs show media bridge issues and port binding errors.
- `prosody` logs indicate XMPP / auth problems; check `prosody/config/` and `conf.d/` for virtual host settings.
- `transcripts/` folder contains server-side generated transcript files (if transcription is enabled).

## When to run `gen-passwords.sh`

- Run once before first `docker compose up` to populate secrets used by services. It updates configuration files under `jitsi-config/` with generated passwords/keys.

## Tips for agents

- Avoid modifying `docker-compose.yml` unless you understand the upstream defaults — prefer changing `.env` to adjust behavior.
- Use the `jitsi-config/` subfolders as the authoritative location for any local config edits (nginx site confs, prosody virtual hosts, jvb tuning).
- When automating, ensure `.env` is present and contains any required domain or certificate-related variables; CI flows should not commit secrets.
