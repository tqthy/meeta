# Meeta 🎥

A self-hosted Google Meet alternative focused on privacy, extensibility, and AI-powered meeting intelligence (real-time transcription, speaker labeling, and AI summaries).

## Quick Overview

- **Purpose**: Run video meetings on your infrastructure with automatic transcripts and concise AI-generated meeting summaries.
- **Audience**: Teams and organizations that want an on-premise, privacy-first alternative to cloud meeting tools.

## Key Features

- **Video Conferencing**: Built on self-hosted Jitsi.
- **Real-time Transcription**: Live speech-to-text with speaker identification.
- **AI Summaries**: Action items, highlights, and TL;DR produced by LLMs.
- **Self-hosted**: Keep data on your infrastructure (Docker-compose for Jitsi infra included).
- **Modern UI**: Next.js 15 + Tailwind + shadcn/ui.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5
- **Video**: Jitsi (IFrame API / React SDK)
- **Transcription**: Configurable (Deepgram, Whisper, etc.)
- **AI**: OpenAI (GPT-4) / Claude (configurable provider)

## Quick Start (Development)

Prerequisites: `Node.js 18+`, `Docker & Docker Compose`, Git.

1. Clone the repository

```bash
git clone https://github.com/tqthy/meeta.git
cd meeta
```

2. Start local Jitsi infrastructure (recommended for full local dev)

Before starting the Jitsi stack, copy the repository `.env.example` into the Jitsi folder so `docker-compose` picks up required variables:

```bash
cp .env.example ./jitsi-infrastructure/.env
cd jitsi-infrastructure
docker-compose up -d
```

3. Install app dependencies

```bash
cd app
npm install
```

4. Configure environment variables

```bash
cp .env.example .env
# Edit `.env` in `app/` to set secrets, DB connection, and API keys
```

5. Migrate the database (local dev)

```bash
npx prisma migrate dev
```

6. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Recommended Environment Variables

- **DATABASE_URL**: PostgreSQL connection string used by Prisma.
- **NEXTAUTH_URL**: Base URL for NextAuth (e.g., `http://localhost:3000`).
- **JWT_SECRET** / **NEXTAUTH_SECRET**: Secrets for session signing.
- **OPENAI_API_KEY** (or other AI provider keys): For summaries and assistant features.
- **DEEPGRAM_API_KEY** or path to transcription service credentials.

See `app/.env.example` for a complete list of variables and example values.

## Architecture (high level)

- Browser clients connect to the Next.js app and the embedded Jitsi front-end.
- Jitsi infrastructure (self-hosted) handles media routing.
- Transcription service (Deepgram / Whisper) ingests audio streams and produces text + timestamps.
- Transcripts and meeting metadata persist in PostgreSQL via Prisma.
- Server-side jobs or API routes run LLM-based summarization and store results for retrieval.

## Deployment

- Production deploys should run both the Next.js app and Jitsi infra on servers with sufficient CPU and bandwidth.
- Use Docker and Docker Compose (or Kubernetes) to orchestrate the `jitsi-infrastructure` stack.
- Use a managed Postgres service or a properly secured self-hosted PostgreSQL instance.
- Ensure TLS is configured (reverse proxy / nginx is included under `jitsi-infrastructure/web/nginx`).

## Developer Notes

- Frontend code lives in `app/src/` under the Next.js app.
- Prisma schemas and migrations are in `app/prisma/`.
- Key services and helpers are under `app/src/lib` and `app/src/services`.

## Running Tests & Linting

- Run linting and type checks:

```bash
cd app
npm run lint
npm run build # runs type checks for Next.js
```

## Contributing

- Fork the repo and open a draft PR for larger changes.
- Follow the existing code style (TypeScript, React, Tailwind, shadcn/ui patterns).
- For database schema changes, add a Prisma migration and explain the migration in your PR.

## Troubleshooting

- If the Jitsi iframe fails to load, confirm `jitsi-infrastructure` is running and reachable.
- If transcripts are missing, verify transcription service API keys and that audio streams are being forwarded.

## Roadmap

- Improving speaker diarization quality
- More configurable transcription backends and fallback logic
- Richer meeting analytics and action item tracking

## License

MIT License — see `LICENSE` for details.

## Contact

Project maintained by `tqthy` — open issues or pull requests on GitHub for support or feature requests.

---

If you'd like, I can also:

- add a short `DEVELOPING.md` with local debug tips
- create a trimmed `.env.example` for quick local dev
- commit this change and open a draft PR on `dev` branch
