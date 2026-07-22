# KikwetuConnect

Kenya's local knowledge network for trusted answers, regional conversations, and multilingual discovery.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with custom design tokens (OKLCH color space)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Deployment**: Vercel

## Design System

Colors (OKLCH):
- **Deep Obsidian** (`#121212`): Primary dark background
- **Savannah Gold** (`#C6A860`): Accent highlights, badges, warnings
- **Acacia Green** (`#438854`): Verified experts, success states, voting
- **Rich Earth Brown** (`#8B5E3C`): Secondary cards, category colors

Typography:
- **Plus Jakarta Sans**: UI text, headings
- **IBM Plex Mono**: Code, metadata, technical surfaces

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── posts/         # Posts CRUD
│   │   ├── votes/         # Voting system
│   │   └── answers/       # Answers CRUD
│   ├── feed/              # Home feed
│   ├── baraza/            # Explore page
│   ├── create/            # Create post/question
│   ├── notifications/     # Notifications
│   ├── profile/           # User profile
│   ├── topics/            # Topics directory
│   ├── bookmarks/         # Saved posts
│   ├── login/             # Authentication
│   ├── signup/            # Registration
│   └── admin/             # Moderation panel
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components
│   ├── navigation.tsx     # Navigation components
│   └── providers/         # Context providers
├── lib/
│   ├── supabase.ts        # Supabase client & types
│   └── utils.ts           # Utility functions
├── providers/             # React context providers
└── globals.css            # Global styles & Tailwind

supabase/
├── functions/             # Edge Functions
│   ├── translate/         # AI translation
│   └── summarize/         # AI summarization
├── config.toml            # Supabase config
└── schema.sql             # Database schema

database/
└── schema.sql             # Complete SQL schema with RLS
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Local Development

1. **Clone and install**
```bash
git clone <repo>
cd kikwetuconnect
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials and API keys.

3. **Set up Supabase**
- Create a new Supabase project
- Run the SQL schema from `database/schema.sql` in the SQL Editor
- Enable Realtime for tables: `posts`, `answers`, `votes`, `notifications`
- Deploy Edge Functions from `supabase/functions/`

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

### Supabase Setup Details

#### Database
Run the complete schema from `database/schema.sql` which includes:
- Tables: `profiles`, `posts`, `answers`, `votes`, `topics`, `post_topics`, `user_topics`, `notifications`, `translations`, `moderation`, `tokens`, `badges`, `user_badges`
- Row Level Security policies
- Triggers for: `updated_at`, profile creation, vote counts, answer counts, Heshima rating

#### Auth
Configure in Supabase Dashboard:
- Email/Password auth
- OAuth providers: Google, Apple
- Redirect URLs: `http://localhost:3000/auth/callback` (dev), `https://your-domain.com/auth/callback` (prod)

#### Realtime
Enable Realtime for:
- `posts` (new posts)
- `answers` (new answers)
- `votes` (vote updates)
- `notifications` (real-time notifications)

#### Edge Functions
Deploy from `supabase/functions/`:
```bash
supabase functions deploy translate
supabase functions deploy summarize
```

## Features

### Core Features
- **Multi-format Feed**: Baraza posts, deep-dive inquiries, articles
- **Regional Hubs**: County-based filtering (47 Kenyan counties)
- **Heshima Rating**: Gamified reputation system (0-1000+)
- **Verified Experts**: Professional verification with green badges
- **Token Bounties**: Reward tokens for quality answers
- **Multilingual**: English, Kiswahili, Sheng support with AI translation
- **AI Summarization**: Thread and article summaries

### Engagement
- Upvote/downvote on posts and answers
- Save/bookmark posts
- Share posts
- Real-time notifications
- Topic following
- Community Jury moderation (high Heshima users)

### Admin/Moderation
- Report queue with evidence
- Content removal, user warnings
- Expert verification workflow
- Analytics dashboard

## API Routes

### Posts
- `GET /api/posts` - List posts (paginated, filterable)
- `POST /api/posts` - Create post

### Votes
- `POST /api/votes` - Toggle vote (upvote/downvote)
- `DELETE /api/votes` - Remove vote

### Answers
- `POST /api/answers` - Create answer
- `PUT /api/answers` - Update answer / mark expert solution

## Deployment

### Vercel

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
GOOGLE_TRANSLATE_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

### Supabase Production

1. Run migrations on production database
2. Deploy Edge Functions
3. Configure Auth providers for production URLs
4. Enable Realtime

## License

MIT