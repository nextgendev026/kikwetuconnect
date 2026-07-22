# KikwetuConnect - Deployment Guide

Complete deployment guide for the KikwetuConnect platform. This guide covers pushing to GitHub, deploying to Vercel, and configuring production environment.

## Prerequisites

- Node.js 18+ installed
- Git installed and configured
- Supabase account with active project
- GitHub account
- Vercel account (optional but recommended)

## 1. GitHub Setup

### Initialize Repository (Already Done)

```bash
cd d:\Kikwetuconnect
git init
git remote add origin https://github.com/nextgendev026/kiwetu.git
git config user.email "dev@kikwetuconnect.dev"
git config user.name "KikwetuConnect Dev"
git add .
git commit -m "Initial commit: Complete KikwetuConnect platform with all core features"
```

### Push to GitHub

```bash
# Set main as default branch (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## 2. Supabase Setup

### Database Configuration

The database schema is in `database/schema.sql`. To apply it to your Supabase project:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Create a new query
5. Copy and paste the entire contents of `database/schema.sql`
6. Run the query

**Or use the Supabase CLI:**

```bash
supabase db push
```

### Verify Configuration

Your `.env.local` should contain:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

These are already configured in the provided `.env.local`.

## 3. Local Testing

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Test Key User Flows

1. **Authentication**
   - Visit `/signup` and create an account
   - Verify email
   - Login at `/login`

2. **Post Creation**
   - Click "Create" in navigation
   - Create a Baraza post
   - Create a deep-dive inquiry with bounty

3. **Discovery**
   - View `/feed` with posts
   - Click on topics at `/topics`
   - Explore regional hubs at `/baraza`

4. **Interaction**
   - Upvote posts and answers
   - Submit answers to questions
   - View notifications

5. **Search**
   - Use the search bar to find posts, people, topics

## 4. Deployment to Vercel

### Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import the GitHub repository `nextgendev026/kiwetu`
4. Configure project:
   - Framework: Next.js
   - Root Directory: ./
   - Node Version: 18

### Set Environment Variables

In Vercel project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://wweueuesywixxaxvoetfo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM3NjAsImV4cCI6MjEwMDMxOTc2MH0.gNzjituMPRQndHyY_zOF6806An96AAjwfSUL6sWgmQk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0Mzc2MCwiZXhwIjoyMTAwMzE5NzYwfQ.XA835WJOK82Yp-PVXH6chuXjyCT6M0-jh23r1UbSGCI
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=KikwetuConnect
```

### Deploy

Click **Deploy** to start the deployment. Vercel will:
1. Clone the repository
2. Install dependencies
3. Build the Next.js app
4. Deploy to CDN

Your app will be available at `https://your-project.vercel.app`

## 5. Post-Deployment Configuration

### Update Supabase URLs

After deployment, update Supabase settings:

1. Go to Supabase project settings
2. Add your Vercel deployment URL to allowed URLs

### Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain (e.g., `kikwetuconnect.com`)
3. Update DNS records as instructed

### Enable Production Logging

Monitor your app:
- **Vercel Analytics**: Available in Vercel dashboard
- **Supabase Logs**: Available in Supabase dashboard

## 6. Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Rollback on failures

To deploy a new version:

```bash
git add .
git commit -m "Feature: Add new functionality"
git push origin main
```

Vercel will automatically deploy the changes.

## 7. Troubleshooting

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Environment Variables Not Working

- Verify all keys in Vercel dashboard
- Rebuild deployment after adding variables
- Check `.env.local` is in `.gitignore` (never commit secrets)

### Database Connection Issues

- Verify Supabase URL is correct
- Check anon key is not expired
- Ensure RLS policies are enabled
- Test connection with: `npm run typecheck`

### Authentication Issues

- Verify callback URL in Supabase: `https://your-domain.com/auth/callback`
- Check email service is enabled in Supabase
- Test email verification flow

## 8. Monitoring & Maintenance

### Regular Checks

- **Weekly**: Check Vercel analytics for errors
- **Weekly**: Monitor Supabase database growth
- **Monthly**: Review moderation queue
- **Monthly**: Backup database (Supabase handles this)

### Performance Optimization

- Enable Vercel Edge Caching for static content
- Optimize images with Next.js Image component
- Consider implementing ISR (Incremental Static Regeneration)

## 9. Scaling Considerations

When ready to scale:

1. **Database**: Upgrade Supabase plan for more connections
2. **Storage**: Add object storage for media files
3. **Caching**: Implement Redis via Upstash
4. **Search**: Add full-text search with pg_search extension
5. **API**: Consider dedicated API server for heavy operations

## 10. Security Checklist

- [ ] Environment variables are in `.env.local` (never committed)
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is in place
- [ ] Sensitive data is not logged
- [ ] SSL/TLS is enabled (automatic on Vercel)
- [ ] Content Security Policy headers are set
- [ ] CSRF protection is implemented

## Support

For issues or questions:
- Email: hello@kikwetuconnect.example
- Documentation: See README.md
- Issues: GitHub issues tracker

---

**Last Updated**: July 2026
**Version**: 1.0.0
