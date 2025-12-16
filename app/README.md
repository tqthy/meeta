# Meeta - Video Meeting Application

A Next.js-based video meeting application with real-time collaboration features powered by Jitsi.

> **For AI Agents and Contributors**: See [`Agents.md`](./Agents.md) for detailed implementation guidance, folder structure conventions, and JitsiAPI integration references.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router and Turbopack
- **Authentication**: [Better Auth](https://www.better-auth.com/) with OAuth providers
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) with React-Redux
- **Video Conferencing**: [lib-jitsi-meet](https://github.com/jitsi/lib-jitsi-meet) (bundled as `lib-jitsi-meet.tgz`)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives with Tailwind CSS
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

---

## Features

### Implemented

- **Authentication System**: OAuth-based authentication (Google, GitHub, etc.) via Better Auth
- **Database Schema**: Prisma-managed PostgreSQL with schemas for:
    - `auth.prisma` - User authentication and sessions
    - `meeting.prisma` - Meeting rooms and configurations
    - `recording.prisma` - Meeting recordings
    - `transcript.prisma` - Meeting transcriptions
    - `summary.prisma` - AI-generated meeting summaries
- **Dashboard**: Meeting management interface with creation and listing
- **Meeting History**: View past meetings with transcript segments
- **Unique Meeting IDs**: Each meeting session gets a unique `{uuid}` ID
- **Room UI**: Video meeting room with participant grid, chat panel, and controls

### In Progress

- **Meeting Domain**: Jitsi integration services, hooks, and state management (see `src/domains/meeting/`)
- **Real-time Video**: WebRTC-based video/audio via lib-jitsi-meet

---

## Project Structure

```
/app                          # Next.js App Router pages
  /(auth)                     # Authentication pages
  /dashboard                  # Dashboard and meeting management
    /history                  # Meeting history list
    /history/[meetingId]      # Meeting detail with transcript
  /jitsi-meeting
    /[meetingId]              # Meeting room UI (Jitsi iframe)
    /create                   # Meeting creation

/src
  /components                 # React components
    /dashboard                # Dashboard-specific UI components
      /summarize-section.tsx  # Meeting summary placeholder UI
    /layout                   # Layout components
      /sidebar.tsx            # Collapsible navigation sidebar
      /dashboard-shell.tsx    # Dashboard container with state
      /dashboard-header.tsx   # Top header with menu toggle
      /user-menu.tsx          # User dropdown menu
    /meeting                  # Meeting-specific components
      /video-tile             # Video tile sub-components
    /ui                       # Reusable UI primitives
  /domains
    /meeting                  # Meeting domain logic
      /hooks                  # React hooks (useMeeting, useLocalTracks, etc.)
      /services               # Service adapters (meetingService, trackService, etc.)
      /store                  # Redux slices (meetingStore, trackStore)
      /types                  # TypeScript type definitions
      /JitsiAPI               # Jitsi SDK reference documentation
  /lib                        # Utility libraries (auth, prisma, utils)
  /store                      # Redux store configuration

/prisma                       # Database schema and migrations
```

---

## UI Architecture

The dashboard UI is based on the **Sidebar UI with History** design pattern:

### Layout Structure
- **Collapsible Sidebar** - Navigation with toggle functionality
- **Dashboard Header** - Menu toggle, search, and user actions
- **Main Content** - Centered content area with max-width constraint

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DashboardShell` | `components/layout/` | Container managing sidebar collapse state |
| `Sidebar` | `components/layout/` | Collapsible navigation with Meetings, History, Settings |
| `DashboardHeader` | `components/layout/` | Top bar with menu toggle and actions |
| `SummarizeSection` | `components/dashboard/` | Placeholder for meeting summarization UI |

### Theme System
Colors are defined using HSL tokens in `globals.css`:
- Primary color: Blue brand color
- Support for automatic dark mode
- All components use semantic tokens for consistency

### Summarize Section
Location: `/dashboard` page (bottom of main content)
- UI-only placeholder for future meeting summarization feature
- Button click currently logs to console
- No backend integration implemented

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Set up environment variables (create `.env` file):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/meeta"
BETTER_AUTH_SECRET="your-secret-key"
# Add OAuth provider credentials as needed
```

3. Run database migrations:

```bash
npx prisma migrate dev
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Development

### Database

This project uses Prisma with PostgreSQL. Schema files are located in `prisma/schema/`:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

### Authentication

Authentication is handled by Better Auth. Configuration is in `src/lib/auth.ts`. The auth client is initialized in `src/lib/auth-client.ts`.

### Meeting Module

The meeting module uses `lib-jitsi-meet` for WebRTC video conferencing. See `src/domains/meeting/Agents.md` for implementation guidance and API references.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Prisma Documentation](https://www.prisma.io/docs) - learn about Prisma ORM.
- [Better Auth Documentation](https://www.better-auth.com/docs) - learn about authentication setup.
- [Jitsi Meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api) - lib-jitsi-meet reference.

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
