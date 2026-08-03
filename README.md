# KikwetuConnect

**Kenya's local knowledge network. Your people. Your language. Your Baraza.**

A Quora + Twitter + Instagram + LinkedIn hybrid platform built for the Kenyan digital ecosystem — community-driven knowledge sharing with localized context, multi-language support, and verified expertise.

## Latest Features (v2.1)

- **Real-time Presence** — Instant Online/Offline dots everywhere (sidebar, chat headers, conversation list) with 15s heartbeat + focus sync
- **Keyboard-safe Mobile Chat** — VisualViewport-based layout; composer stays above on-screen keyboard on iOS & Android
- **Background Push Notifications** — Web Push via Service Worker; works when app is closed (iOS: requires PWA install; Android: works from browser)
- **Apple-style Chat UI** — Clean, minimal bubbles; distraction-free composer; proportional viewport sizing
- **Private Chat Media** — Media bucket private; chat uploads via short-lived signed URLs only
- **Following with Live Status** — Sidebar & chat widget show people you follow with green/grey presence dots
- **Savannah Wildlife Badges** — Rebranded ecosystem badges (🦅🦒🦁🦓🐆🦩🐘🦏🐃) with sunset-gradient cards
- **Unique Mobile Numbers** — Client + DB enforcement; friendly duplicate toast on signup/settings

## Core Features

- **Authentication & Profiles** — Email/password auth, email verification, password reset, Heshima reputation ratings, county-based identity
- **Content Creation** — Baraza posts, Q&A deep-dives, articles, polls, safety updates, Mtaa marketplace listings, token bounties, multi-media support
- **Community Engagement** — Upvote/downvote, real-time notifications, bookmarks, topic following, personalized feed
- **Regional Discovery** — 47 county-based hubs, trending conversations by region, national vs. local trends
- **Trust & Safety** — Heshima reputation system, community jury moderation, admin dashboard, verified expert badges
- **Real-Time** — Live notifications, active user presence, instant updates via Supabase Realtime
- **Wallet & Tokens** — Token-based economy, tips, bounties, payouts
- **Specialized Spaces** — Professionals directory, Nyumba Kumi safety alerts, student hub, quizzes, marketplace, community sessions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS with OKLch color system (Savannah theme) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Deployment | Vercel |
| Package Manager | npm |

## Quick Start

```bash
# Clone
git clone https://github.com/nextgendev026/kikwetuconnect.git
cd kikwetuconnect

# Install
npm install

# Environment (edit with your Supabase credentials)
cp .env.example .env.local

# Develop
npm run dev

# Build
npm run build && npm run start
```

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Landing page
│   ├── (app)/             # Authenticated layout shell
│   ├── admin/             # Moderation dashboard
│   ├── api/               # API routes (posts, votes, answers, webhooks, push)
│   ├── auth/              # Auth callback
│   ├── baraza/            # Regional hub pages
│   ├── bookmarks/         # Saved posts
│   ├── create/            # Post creation
│   ├── explore/           # Discovery feed
│   ├── feed/              # Main personalized feed
│   ├── login/             # Login page
│   ├── market/            # Mtaa marketplace
│   ├── messages/          # Direct messages (keyboard-safe, real-time)
│   ├── notifications/     # Notification center
│   ├── nyumba/            # Nyumba Kumi safety alerts
│   ├── onboarding/        # New user onboarding
│   ├── posts/             # Post detail view
│   ├── professionals/     # Professionals directory
│   ├── profile/           # User profile
│   ├── quizzes/           # Community quizzes
│   ├── search/            # Search
│   ├── sessions/          # Live sessions
│   ├── settings/          # Account settings
│   ├── spaces/            # Community spaces
│   ├── students/          # Student hub
│   ├── topics/            # Topic discovery
│   ├── wallet/            # Token wallet
│   ├── AppShell.tsx       # Main app layout (sidebar + right panel + chat widget)
│   ├── globals.css        # Global styles (OKLch Savannah theme)
│   ├── layout.tsx         # Root layout
│   └── middleware.ts      # Auth & route protection
├── components/
│   ├── layout/            # Layout components
│   ├── providers/         # Supabase & Realtime providers
│   ├── ui/                # Reusable UI components (PostCard, etc.)
│   ├── Sidebar.tsx        # Desktop sidebar nav (following + presence)
│   ├── MobileNav.tsx      # Mobile bottom nav
│   └── CreateModal.tsx    # Global create post modal
├── hooks/
│   ├── usePresence.ts     # Real-time presence with listener registry
│   ├── useConversations.ts# Conversation + message hooks
│   ├── useKeyboardViewport.ts # VisualViewport sync for chat
│   └── usePushNotifications.ts # Web Push subscription
├── lib/
│   ├── database.types.ts  # Full TypeScript types for all 29 tables
│   ├── i18n.ts            # Internationalization utilities
│   ├── server-supabase.ts # Server-side Supabase client (createApiClient)
│   ├── supabase.ts        # Browser Supabase client
│   ├── push-notifications.ts # Web Push dispatch (web-push)
│   ├── sound.ts           # WebAudio notification sounds
│   └── browser-notify.ts  # Native notification bridge
└── providers/
    ├── auth-provider.tsx  # Auth context
    ├── notification-provider.tsx # Notification toasts + native bridge
    ├── toast-provider.tsx # In-app toasts
    └── supabase-provider.tsx # Supabase context
```

## Database

29 tables across the Supabase PostgreSQL schema:

- **Core**: profiles, posts, answers, votes, topics, follows, saves
- **Engagement**: notifications, messages, tips, tokens, badges, user_badges
- **Specialized**: spaces, space_members, professionals, sessions, marketplace_listings, nyumba_kumi_alerts
- **Learning**: quizzes, quiz_questions, quiz_results
- **Moderation**: moderation, audit_logs, translations, parent_links, post_topics, user_topics
- **Chat**: conversations, conversation_participants, messages, typing, reactions

Full schema with RLS policies in `supabase/migrations/`. All migrations applied via direct query.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service_role key (admin operations)
NEXT_PUBLIC_APP_URL=                # App URL (https://kikwetuconnect.vercel.app)
NEXT_PUBLIC_APP_NAME=KikwetuConnect
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # Web Push VAPID public key
VAPID_PRIVATE_KEY=                  # Web Push VAPID private key
VAPID_EMAIL=noreply@kikwetuconnect.com
```

## Design System

- **Colors** — Savannah theme using OKLch: Night (14% .025 151), Gold (75% .14 84), Green (55% .13 151), Earth (48% .10 55)
- **Typography** — Plus Jakarta Sans (display/body), IBM Plex Mono (metadata)
- **Spacing** — 4pt rhythm (4, 8, 12, 16, 24, 32, 48, 64px)
- **Layout** — Mobile-first with bottom nav, desktop sidebar + right panel + live users + chat widget
- **Chat** — Apple-style bubbles, clean composer, proportional viewport, VisualViewport keyboard handling

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Set up Supabase
npx supabase login
npx supabase link --project-ref your-project-ref
# Apply migrations via direct query (not db push):
npx supabase db query --linked --file supabase/migrations/<migration>.sql
```

## License

MIT