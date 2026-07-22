# KikwetuConnect

Kenya's local knowledge network. Your people. Your language. Your Baraza.

A Quora + Twitter + Instagram + LinkedIn hybrid platform built specifically for the Kenyan digital ecosystem. KikwetuConnect brings together community-driven knowledge sharing with localized context, multi-language support, and verified expertise.

## 🌍 What is KikwetuConnect?

KikwetuConnect is a community knowledge platform that bridges the gap between casual local discourse and verified expert insights. It's designed for Kenya with:

- **Localized Content**: County-based hubs and region-specific discussions
- **Multi-Language**: English, Kiswahili, Sheng, and regional languages
- **Verified Expertise**: Community jury system and expert badges
- **Community Reputation**: Heshima rating system based on contributions
- **Knowledge Exchange**: Q&A, short-form posts, and deep discussions
- **Real-Time Engagement**: Live notifications and updates

## ✨ Core Features

### 1. Authentication & Profiles
- Email/password signup and login
- Email verification
- Password reset
- User profiles with Heshima ratings
- County-based identity

### 2. Content Creation
- **Baraza Posts**: Short-form updates and quick thoughts
- **Deep-Dive Inquiries**: Structured Q&A with expert answers
- **Articles**: Long-form educational content
- **Bounty System**: Attach tokens to urgent questions
- **Multi-Media**: Support for text, images, video, audio

### 3. Community Engagement
- Upvote/downvote on posts and answers
- Real-time notifications
- Bookmarks for saving content
- Follow topics to shape your feed
- Search posts, people, and topics

### 4. Regional Discovery
- County-based hubs (47 Kenyan counties)
- Trending conversations by region
- National trends vs. local trending
- Active members per hub

### 5. Trust & Safety
- Heshima reputation system
- Community jury moderation
- Report system for harmful content
- Admin moderation dashboard
- Verified expert badges

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/nextgendev026/kiwetu.git
cd kiwetu

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Setup

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
kikwetuconnect/
├── src/
│   ├── app/
│   │   ├── (public)/          # Public landing page
│   │   ├── admin/             # Admin/moderation pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── baraza/            # Regional hubs
│   │   ├── bookmarks/         # Saved posts
│   │   ├── create/            # Post creation
│   │   ├── feed/              # Main feed
│   │   ├── login/             # Login page
│   │   ├── notifications/     # Notifications
│   │   ├── posts/             # Post detail page
│   │   ├── profile/           # User profile
│   │   ├── search/            # Search page
│   │   ├── signup/            # Signup page
│   │   ├── topics/            # Topics discovery
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   ├── ui/                # UI components
│   │   └── providers/         # Context providers
│   ├── lib/                   # Utility functions
│   ├── providers/             # App providers
│   └── app/globals.css        # Global styles
├── database/
│   └── schema.sql             # Database schema
├── supabase/
│   └── functions/             # Edge functions
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## 🗄️ Database Schema

The platform uses Supabase PostgreSQL with 13 tables:

- **profiles**: User data, Heshima ratings, verification status
- **posts**: Baraza posts, questions, articles
- **answers**: Responses to questions
- **votes**: Upvotes/downvotes on content
- **topics**: Content categories
- **post_topics**: Post-topic relationships
- **user_topics**: User topic follows
- **notifications**: Real-time alerts
- **translations**: Content translations
- **moderation**: Report queue
- **tokens**: User wallet/ledger
- **badges**: Achievement system
- **user_badges**: User badge relationships

See `database/schema.sql` for complete schema with RLS policies.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with OKLch color system
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel
- **Package Manager**: npm

## 🎨 Design System

### Colors
- **Acacia Green** (`#438854`): Success, verified badges
- **Savannah Gold** (`#C6A860`): Highlights, warnings
- **Rich Earth Brown** (`#8B5E3C`): Secondary cards
- **Ink/Obsidian** (`#121212`): Dark backgrounds

### Typography
- **Display**: Plus Jakarta Sans (800, 56-104px)
- **Body**: Plus Jakarta Sans (400-600, 15-18px)
- **Metadata**: IBM Plex Mono

### Spacing
- 4pt rhythm: 4, 8, 12, 16, 24, 32px increments

## 🔐 Security

- Row-level security (RLS) on all tables
- Authentication via Supabase GoTrue
- Input validation with Zod
- Protected API routes
- Admin access control
- CSRF protection
- Content sanitization

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - User signup
- `POST /api/auth/login` - User login
- `GET /auth/callback` - OAuth callback

### Content
- `POST /api/posts/create` - Create post
- `POST /api/answers/create` - Submit answer
- `POST /api/votes/create` - Vote on content

### Discovery
- `GET /api/search` - Full-text search
- `POST /api/topics/follow` - Follow topic
- `GET /api/posts` - Fetch posts with filters

### Notifications
- `GET /api/notifications` - Fetch notifications
- `POST /api/notifications/mark-read` - Mark as read

## 🚀 Deployment

### Deploy to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

See `DEPLOYMENT.md` for detailed instructions.

### Environment for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 📱 Supported Platforms

- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Chrome Android)
- Tablet (iPad, Android tablets)

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Design System](./kikwetuconnect-design-system.html) - UI/UX guidelines
- [Technical Spec](./kikwetuconnect-technical-handoff-deck.html) - Full technical specification

## 🤝 Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

For questions or issues:
- **Email**: hello@kikwetuconnect.example
- **Issues**: [GitHub Issues](https://github.com/nextgendev026/kiwetu/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nextgendev026/kiwetu/discussions)

## 🙏 Acknowledgments

- Design system inspired by Kikwetu mockups
- Supabase for backend infrastructure
- Vercel for hosting and deployment
- Kenya's tech community for inspiration

---

**KikwetuConnect** - Building the first Baraza for Kenya's digital future.

Made with ❤️ by the KikwetuConnect team
