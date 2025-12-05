# Vercel Environment Variable Setup - AI Fix

## Problem
AI features not working in production (https://ykshub.vercel.app) because `VITE_GOOGLE_AI_API_KEY` is not set.

## Solution - 5 Minutes

### Step 1: Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

### Step 2: Select Your Project
- Click on `yks-takip-sistemi` or `ykshub` project

### Step 3: Settings → Environment Variables
```
Navigate to: Settings tab → Environment Variables
```

### Step 4: Add the API Key Variable
**Variable Name**: `VITE_GOOGLE_AI_API_KEY`
**Value**: `AIzaSyBmjqecYWGf8b8Erwpsq16yKwHf3ss0QuI`

**Important**: 
- Check ALL boxes: ✓ Production, ✓ Preview, ✓ Development
- Click "Save"

### Step 5: Trigger Redeploy
```
1. Go to "Deployments" tab
2. Find latest deployment
3. Click "..." (three dots)
4. Select "Redeploy"
5. Wait 2-3 minutes for build
```

### Step 6: Verify
```
1. Visit: https://ykshub.vercel.app
2. Click: SmartCoach → "AI ile Oluştur"
3. Should see AI analysis (not error)
4. Open DevTools Console → should see no API KEY error
```

## If Still Not Working
1. Hard refresh: Ctrl+Shift+Delete → clear cache → refresh
2. Check DevTools: Network tab → see if API call succeeds
3. Console should show: ✅ Google AI initialized

## .env.local (Local Development)
Your local `.env.local` already has:
```
VITE_GOOGLE_AI_API_KEY=AIzaSyBmjqecYWGf8b8Erwpsq16yKwHf3ss0QuI
```
So `npm run dev` works locally.

## Summary
- **Local Dev** (npm run dev): ✅ Works with .env.local
- **Production** (ykshub.vercel.app): ❌ Needs Vercel env var
- **Action**: Add env var to Vercel + Redeploy = ✅ AI works

Go do Step 1-5 now, then report back!
