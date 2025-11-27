# Meeta 🎥

A self-hosted Google Meet alternative with AI-powered transcription and meeting summaries.

## Features

- 🎥 **Video Conferencing** - Powered by Jitsi (self-hosted)
- 📝 **Real-time Transcription** - Automatic speech-to-text with speaker identification
- 🤖 **AI Summaries** - Generate action items, key points, and meeting summaries
- 🔒 **Self-Hosted** - Own your data, deploy on your infrastructure
- 🎨 **Modern UI** - Clean, responsive interface built with Next.js 15

## Tech Stack

- **Frontend/Backend**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js v5
- **Video**: Jitsi (IFrame API / React SDK)
- **Transcription**: Deepgram / Whisper
- **AI**: OpenAI GPT-4 / Claude
- **Styling**: Tailwind CSS v4 + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker or external)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/tqthy/meeta.git
   cd meeta
   ```

2. **Start the database**

   ```bash
   docker-compose up -d
   ```

3. **Install dependencies**

   ```bash
   cd app
   npm install
   ```

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**

   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
meeta/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages & API routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & configurations
│   │   └── types/         # TypeScript types
│   └── prisma/            # Database schema & migrations
├── docker-compose.yml     # PostgreSQL + Redis
└── docs/                  # Documentation
```

## Environment Variables

See `.env.example` for all required environment variables.

## Development Status

- [x] Phase 1: Foundation (Auth, DB, UI)
- [ ] Phase 2: Meeting Management
- [ ] Phase 3: Transcription Pipeline
- [ ] Phase 4: AI Summaries
- [ ] Phase 5: Polish & Deployment

## License

MIT License - see [LICENSE](LICENSE) for details.
