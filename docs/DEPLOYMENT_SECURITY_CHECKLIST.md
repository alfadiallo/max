# Production Deployment Security Checklist

## 🚨 CRITICAL: Before Deploying to usemax.io

### ✅ What Gets Exposed to the Browser (Safe)

These variables are **safe** to expose because they're designed to be public:

1. **`NEXT_PUBLIC_SUPABASE_URL`** ✅
   - Public Supabase project URL
   - Safe to expose (required for client connections)
   - Example: `https://your-project.supabase.co`

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ✅
   - Anonymous/public API key
   - **Protected by RLS policies** - cannot bypass security
   - Safe to expose (required for client connections)
   - Even if someone has this key, RLS prevents unauthorized access

3. **`NEXT_PUBLIC_APP_URL`** ✅ (if used)
   - Your app URL
   - Safe to expose

### 🔒 What MUST Stay Secret (Server-Side Only)

These variables are **NEVER** exposed to the browser:

1. **`SUPABASE_SERVICE_ROLE_KEY`** 🔴 **CRITICAL**
   - **Full database access** - bypasses all RLS
   - **NEVER** use `NEXT_PUBLIC_` prefix
   - Only used in `src/lib/supabase/admin.ts` (server-side)
   - ✅ **Status**: Only used server-side, safe

2. **`OPENAI_API_KEY`** 🔴
   - Used for Whisper transcription
   - Only used in API routes (server-side)
   - ✅ **Status**: Only used server-side, safe

3. **`ANTHROPIC_API_KEY`** 🔴
   - Used for Claude analysis/translation
   - Only used in API routes (server-side)
   - ✅ **Status**: Only used server-side, safe

4. **`ELEVENLABS_API_KEY`** 🔴
   - Used for speech generation
   - Only used in API routes (server-side)
   - ✅ **Status**: Only used server-side, safe

---

## ✅ Security Audit Results

### Environment Variables Usage

| Variable | Used In | Exposed? | Status |
|----------|---------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | ✅ Yes (Safe) | ✅ OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | ✅ Yes (Safe) | ✅ OK |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ❌ No | ✅ SECURE |
| `OPENAI_API_KEY` | Server only | ❌ No | ✅ SECURE |
| `ANTHROPIC_API_KEY` | Server only | ❌ No | ✅ SECURE |
| `ELEVENLABS_API_KEY` | Server only | ❌ No | ✅ SECURE |

### Client-Side Code Analysis

✅ **`src/lib/supabase/client.ts`**:
- Only uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- No secrets exposed

✅ **`src/middleware.ts`**:
- Only uses public keys
- No secrets exposed

### Server-Side Code Analysis

✅ **`src/lib/supabase/admin.ts`**:
- Uses `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)
- **Only imported in server-side API routes**
- ✅ **Secure** - never exposed to client

✅ **API Routes**:
- All use server-side environment variables
- No secrets logged or exposed
- ✅ **Secure**

---

## 🔍 Pre-Deployment Checks

### 1. Verify .gitignore ✅

Your `.gitignore` should include:
```
.env
.env.local
.env*.local
*.env
```

**Action**: Verify these are in `.gitignore` ✅

### 2. Check for Hardcoded Keys ❌

**DO NOT** have hardcoded keys like:
```typescript
// ❌ BAD - Never do this
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Action**: Verify no hardcoded keys in code ✅

### 3. Verify Environment Variables in Deployment Platform

When deploying to Vercel/Netlify/etc., you need to set:

**Public Variables** (can be visible in Next.js build):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (optional)

**Secret Variables** (server-side only):
- `SUPABASE_SERVICE_ROLE_KEY` 🔴
- `OPENAI_API_KEY` 🔴
- `ANTHROPIC_API_KEY` 🔴
- `ELEVENLABS_API_KEY` 🔴

### 4. Verify No Logging of Secrets

Check that you don't have:
```typescript
// ❌ BAD
console.log('Key:', process.env.SUPABASE_SERVICE_ROLE_KEY)
console.error('Error:', { key: process.env.OPENAI_API_KEY })
```

**Action**: Audit code for secret logging ✅

### 5. Check Build Output

After building, check that secrets aren't in the bundle:
```bash
# Build the app
npm run build

# Check if service role key appears anywhere (should return nothing)
grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/
grep -r "service_role" .next/
```

**Action**: Test build output ✅

---

## 🚀 Deployment Steps

### Step 1: Choose Deployment Platform

**Recommended**: Vercel (best Next.js support)

### Step 2: Set Environment Variables

In your deployment platform (Vercel/Netlify/etc.):

1. Go to **Settings → Environment Variables**
2. Add each variable:

**Public Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (anon key)
NEXT_PUBLIC_APP_URL=https://usemax.io
```

**Secret Variables (Mark as "Sensitive"):**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service_role key)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
```

### Step 3: Configure Supabase

1. **Add your domain to Supabase Auth:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add `https://usemax.io` to **Site URL**
   - Add `https://usemax.io/**` to **Redirect URLs**

2. **Update RLS policies** (if needed):
   - Ensure production RLS policies are active
   - Test that users can only access their data

3. **Update Storage policies** (if needed):
   - Ensure storage buckets have proper RLS
   - Verify audio files are protected

### Step 4: Test Deployment

1. **Test authentication:**
   - Try logging in from production URL
   - Verify JWT tokens work
   - Test password reset flow

2. **Test API routes:**
   - Verify all API routes require authentication
   - Test Editor vs Admin access

3. **Verify no secrets in bundle:**
   - Check browser DevTools → Sources
   - Search for "SERVICE_ROLE" or "OPENAI_API_KEY"
   - Should find nothing

---

## 🔒 Post-Deployment Security

### 1. Monitor Supabase Logs

- Check Supabase Dashboard → Logs
- Watch for unusual API usage
- Monitor for failed authentication attempts

### 2. Set Up Alerts

- Enable Supabase email alerts for:
  - Unusual database activity
  - Failed authentication attempts
  - API key usage spikes

### 3. Regular Security Audits

- Review RLS policies quarterly
- Rotate API keys annually
- Update dependencies regularly
- Review access logs

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T:

1. **Don't use `NEXT_PUBLIC_` prefix for secrets:**
   ```typescript
   // ❌ WRONG
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
   
   // ✅ CORRECT
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. **Don't commit `.env` files:**
   - Always use `.gitignore`
   - Never commit secrets to git

3. **Don't log secrets:**
   ```typescript
   // ❌ WRONG
   console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)
   
   // ✅ CORRECT
   console.log('Admin operation started') // No secrets
   ```

4. **Don't expose secrets in error messages:**
   ```typescript
   // ❌ WRONG
   throw new Error(`Key missing: ${process.env.OPENAI_API_KEY}`)
   
   // ✅ CORRECT
   throw new Error('OpenAI API key not configured')
   ```

5. **Don't use service role key in client-side code:**
   - Always use admin client server-side only

---

## ✅ Final Checklist

Before going live:

- [ ] All secrets are server-side only (no `NEXT_PUBLIC_` prefix)
- [ ] `.env` files are in `.gitignore`
- [ ] No hardcoded keys in code
- [ ] Environment variables set in deployment platform
- [ ] Supabase Auth configured with production URL
- [ ] RLS policies enabled and tested
- [ ] Build tested locally (no secrets in bundle)
- [ ] Test authentication in production
- [ ] Test API routes in production
- [ ] Monitor Supabase logs after deployment

---

## 🎯 Summary

**Your Current Status: ✅ SECURE**

- ✅ Service role key is server-side only
- ✅ API keys are server-side only
- ✅ Public keys are properly prefixed
- ✅ No secrets in client-side code
- ✅ RLS protects data access

**What's Safe to Expose:**
- `NEXT_PUBLIC_SUPABASE_URL` - Required, safe
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Required, protected by RLS

**What's Protected:**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only ✅
- `OPENAI_API_KEY` - Server-side only ✅
- `ANTHROPIC_API_KEY` - Server-side only ✅
- `ELEVENLABS_API_KEY` - Server-side only ✅

**You're good to deploy!** 🚀

Just make sure to:
1. Set environment variables in your deployment platform
2. Configure Supabase Auth for your domain
3. Test everything after deployment

