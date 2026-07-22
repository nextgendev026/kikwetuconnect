# 🎭 KikwetuConnect Demo Accounts

Quick reference for testing accounts and credentials.

## Demo Account Credentials

### 1️⃣ Admin Account
```
Email:     admin@kikwetuconnect.demo
Password:  Demo@Admin123
Username:  admin_demo
County:    Nairobi
Heshima:   1000 (★★★★★ Expert)
Status:    Verified Expert
Access:    Full admin dashboard, moderation, user management
```

**Best For**: Testing admin features, moderation, analytics

### 2️⃣ Regular User Account
```
Email:     user@kikwetuconnect.demo
Password:  Demo@User123
Username:  user_demo
County:    Mombasa
Heshima:   150 (★★ Regular User)
Status:    Regular User
Access:    Feed, create posts, answer questions, vote
```

**Best For**: Testing user features, content creation, voting

### 3️⃣ Expert Account
```
Email:     expert@kikwetuconnect.demo
Password:  Demo@Expert123
Username:  expert_demo
County:    Kisumu
Heshima:   750 (★★★★ Expert)
Status:    Verified Expert
Access:    Expert badge, moderation, higher visibility
```

**Best For**: Testing expert features, verification, moderation

---

## 🚀 Quick Start Testing

### 1. Create Demo Accounts
```bash
npx ts-node scripts/seed-demo-accounts.ts
```

### 2. Login & Explore
1. Visit `/login`
2. Use any demo credentials above
3. Explore features

### 3. Test Key Flows

**User Flow (use any account)**
- [ ] Create a Baraza post
- [ ] Create a question with bounty
- [ ] Vote on posts/answers
- [ ] Save a post to bookmarks
- [ ] Follow a topic
- [ ] Check notifications

**Admin Flow (admin account only)**
- [ ] Visit `/admin/dashboard`
- [ ] Check statistics
- [ ] Go to moderation queue `/admin/moderation`
- [ ] Review reports
- [ ] Manage content

**Expert Flow (expert account)**
- [ ] Create an answer to a question
- [ ] Verify your expert status in profile
- [ ] Check moderation access
- [ ] Review high-visibility answers

---

## 🎯 Testing Scenarios

### Scenario 1: Content Creation
```
1. Login as: user_demo (user account)
2. Click "Create" button
3. Create a Baraza post
4. Create a question with 50 token bounty
5. Verify posts appear in feed
```

### Scenario 2: Community Interaction
```
1. Login as: user_demo
2. Find a post in feed
3. Upvote the post
4. Submit an answer to a question
5. Check notifications for engagement
```

### Scenario 3: Expert Moderation
```
1. Login as: admin_demo
2. Visit /admin/dashboard
3. Check pending reports count
4. Go to moderation queue
5. Review and action a report
```

### Scenario 4: Regional Discovery
```
1. Login as: user_demo or any user
2. Go to /baraza
3. View county hubs (47 counties)
4. Click on your county hub
5. View region-specific posts
```

### Scenario 5: Topic Following
```
1. Login as: user_demo
2. Go to /topics
3. Follow 3-4 topics
4. Go to /feed
5. Verify feed is filtered by followed topics
```

---

## 📊 Account Capabilities Matrix

| Feature | Admin | User | Expert |
|---------|-------|------|--------|
| Create Posts | ✅ | ✅ | ✅ |
| Create Questions | ✅ | ✅ | ✅ |
| Answer Questions | ✅ | ✅ | ✅ |
| Vote | ✅ | ✅ | ✅ |
| Moderation Access | ✅ | ❌ | ✅ |
| Admin Dashboard | ✅ | ❌ | ❌ |
| Expert Badge | ✅ | ❌ | ✅ |
| Higher Visibility | ✅ | ❌ | ✅ |
| Report Content | ✅ | ✅ | ✅ |

---

## 🔄 Password Reset Testing

To test password reset flow:

```bash
# 1. Go to /forgot-password
# 2. Enter demo account email
# 3. Check Supabase email logs
# 4. Follow reset link
# 5. Set new password
```

---

## ⚡ Performance Testing

### Check Page Load Times
```bash
# Development
npm run dev

# Build test
npm run build
npm run start

# Lighthouse
npm run lighthouse
```

### Test Animations
1. Visit any page
2. Observe slide-up animations on cards
3. Click modals to see scale-in animations
4. Hover buttons to see glow effects
5. Check tooltip on hover

---

## 🎨 Visual Testing Checklist

- [ ] Brand colors visible (green, gold, brown)
- [ ] Logo SVG displays correctly
- [ ] Responsive layout on mobile
- [ ] Animations are smooth (no jank)
- [ ] Dark mode renders correctly
- [ ] Cards have proper shadows
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Forms validate input
- [ ] Error messages display

---

## 🚨 Known Issues & Workarounds

### Issue: Demo accounts already exist
**Solution**: Update email to unique value or delete from Supabase first

### Issue: Password not accepted
**Solution**: Verify password meets requirements (8+ chars, uppercase, number, special)

### Issue: Supabase connection error
**Solution**: Check .env.local has correct credentials

### Issue: Email confirmation error
**Solution**: Ensure email service is enabled in Supabase

---

## 📱 Device Testing

### Desktop (1920x1080)
- [ ] Full sidebar visible
- [ ] All buttons clickable
- [ ] Animations smooth

### Tablet (768x1024)
- [ ] Sidebar collapses
- [ ] Layout responsive
- [ ] Touch targets adequate

### Mobile (375x812)
- [ ] Hamburger menu works
- [ ] Bottom navigation visible
- [ ] Content readable
- [ ] Tap targets 48px+

---

## 💡 Tips for Testing

1. **Clear Cache**: Ctrl+Shift+Delete in browser
2. **Incognito Mode**: Avoid session conflicts
3. **Network Throttling**: Test slow connections
4. **Multiple Tabs**: Test real-time updates
5. **Different Browsers**: Chrome, Firefox, Safari

---

## ✅ Verification Checklist

- [ ] All demo accounts can login
- [ ] Feed displays posts correctly
- [ ] Creating posts works
- [ ] Voting updates counts
- [ ] Notifications appear
- [ ] Admin dashboard accessible
- [ ] Search functionality works
- [ ] Regional filters work
- [ ] Topic following works
- [ ] Bookmarks save posts
- [ ] UI is modern and polished
- [ ] Animations are smooth
- [ ] Mobile layout works
- [ ] Performance is acceptable

---

**Ready to test? Login now!**

🔗 Your local: `http://localhost:3000`  
🔗 Your production: `https://your-domain.vercel.app`

---

**Questions?** Check README.md or PRODUCTION_SETUP.md
