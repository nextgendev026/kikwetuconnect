# 🔐 Vercel Environment Variables Setup Guide

Step-by-step guide to configure environment variables for production deployment on Vercel.

## 📋 Your Environment Variables

Copy these exact values to Vercel. They're already configured in `.env.production`.

### Required Variables (Must Have)

```env
# Supabase - Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://wweueuesywixxaxvoetfo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM3NjAsImV4cCI6MjEwMDMxOTc2MH0.gNzjituMPRQndHyY_zOF6806An96AAjwfSUL6sWgmQk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0Mzc2MCwiZXhwIjoyMTAwMzE5NzYwfQ.XA835WJOK82Yp-PVXH6chuXjyCT6M0-jh23r1UbSGCI

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_NAME=KikwetuConnect
NODE_ENV=production
```

### Optional Variables (Nice to Have)

```env
# Google OAuth (sign in with Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth (sign in with Apple)
NEXT_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret

# Translation API (AI translation)
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key

# OpenAI (content summarization)
OPENAI_API_KEY=your_openai_api_key

# Analytics & Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key

# Database Optimization
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=900

# Caching Configuration
REVALIDATE_FEED=3600
REVALIDATE_POSTS=1800
REVALIDATE_TOPICS=86400
```

---

## 🚀 How to Set Up on Vercel

### Method 1: Web Dashboard (Recommended)

**Step 1: Go to Vercel Project Settings**
1. Visit: https://vercel.com/dashboard
2. Click on your project (kiwetu)
3. Go to Settings tab

**Step 2: Environment Variables Section**
1. Click "Environment Variables" in the sidebar
2. You should see an input form

**Step 3: Add Variables**
For each variable below, click "Add Variable" and enter:

#### Copy-Paste These Variables

```
NEXT_PUBLIC_SUPABASE_URL
https://wweueuesywixxaxvoetfo.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM3NjAsImV4cCI6MjEwMDMxOTc2MH0.gNzjituMPRQndHyY_zOF6806An96AAjwfSUL6sWgmQk

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0Mzc2MCwiZXhwIjoyMTAwMzE5NzYwfQ.XA835WJOK82Yp-PVXH6chuXjyCT6M0-jh23r1UbSGCI

NEXT_PUBLIC_APP_URL
https://your-project.vercel.app

NEXT_PUBLIC_APP_NAME
KikwetuConnect

NODE_ENV
production
```

**Step 4: Select Environment**
- Development: Only for dev deployments
- Preview: For preview deployments (optional)
- Production: ✅ Check this for production

**Step 5: Save**
- Click "Save" for each variable
- Redeploy to apply changes

**Step 6: Redeploy**
1. Go to "Deployments" tab
2. Click "Redeploy" on latest deployment
3. Wait for build to complete

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://wweueuesywixxaxvoetfo.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZXV1ZXVzeXdpeGF4dm9ldGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM3NjAsImV4cCI6MjEwMDMxOTc2MH0.gNzjituMPRQndHyY_zOF6806An96AAjwfSUL6sWgmQk

# ... repeat for all variables

# Redeploy
vercel deploy --prod
```

### Method 3: Upload .env.production File

```bash
# 1. Copy environment file
cp .env.production .env.local

# 2. Deploy (Vercel will read variables)
vercel deploy --prod
```

---

## ✅ Verification Checklist

After adding environment variables:

- [ ] All 6 required variables added
- [ ] Production environment selected
- [ ] Project redeployed
- [ ] Deployment successful (no build errors)
- [ ] Can login with demo accounts
- [ ] Database queries work
- [ ] Supabase connection confirmed
- [ ] No 500 errors on pages

---

## 🧪 Test After Deployment

### 1. Check Environment Variables
```bash
# Visit your Vercel URL
# Open browser console (F12)
# Should see: Supabase client initialized

# Or check:
fetch('/api/posts').then(r => r.json()).then(console.log)
```

### 2. Test Database Connection
```
1. Go to login page
2. Try to login with demo account
3. Should work without errors
4. Check Supabase for auth logs
```

### 3. Test All Features
```
1. Create a post
2. Vote on content
3. Check notifications
4. Access admin dashboard
5. Search posts
```

---

## 🚨 Common Issues & Fixes

### Issue: "Invalid URL" Error
**Cause**: SUPABASE_URL not set  
**Fix**: Copy exact URL: `https://wweueuesywixxaxvoetfo.supabase.co`

### Issue: "401 Unauthorized"
**Cause**: SUPABASE_ANON_KEY incorrect  
**Fix**: Copy from Supabase dashboard → Settings → API Keys

### Issue: Database queries fail
**Cause**: SERVICE_ROLE_KEY not set  
**Fix**: Add SUPABASE_SERVICE_ROLE_KEY variable

### Issue: "NEXT_PUBLIC_APP_URL" undefined
**Cause**: Variable not set  
**Fix**: Set to your Vercel deployment URL

### Issue: Redeploy doesn't pick up changes
**Cause**: Cache not cleared  
**Fix**: 
1. Go to Deployments
2. Click "..." on latest
3. Select "Clear Cache"
4. Redeploy

---

## 📋 Variable Explanation

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Database endpoint | Supabase Dashboard → Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server API key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Production domain | Your Vercel deployment URL |
| `NEXT_PUBLIC_APP_NAME` | App name | Set to: KikwetuConnect |
| `NODE_ENV` | Environment | Set to: production |

---

## 🔒 Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS:**

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **`NEXT_PUBLIC_*` variables are public** - They're exposed in frontend code
3. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - Only use server-side (not in frontend)
4. **Rotate keys periodically** - Check Supabase security settings
5. **Use different keys per environment** - Dev/Preview/Production separate

---

## 📞 Support

**If variables don't work:**

1. Double-check copy-paste (no extra spaces)
2. Verify Supabase credentials are active
3. Restart build in Vercel
4. Check browser console for errors
5. Review Supabase auth logs

**Resources:**
- Vercel Docs: https://vercel.com/docs/concepts/environment-variables
- Supabase Docs: https://supabase.com/docs
- GitHub Issues: https://github.com/nextgendev026/kiwetu/issues

---

## ✨ You're All Set!

Once variables are configured and deployment succeeds, your KikwetuConnect app is live on Vercel! 🚀

**Next Steps:**
1. Share your Vercel URL
2. Invite testers
3. Monitor performance
4. Gather feedback
5. Iterate and improve

---

**Version**: 2.0.0  
**Last Updated**: July 2026  
**Status**: Production Ready ✅
