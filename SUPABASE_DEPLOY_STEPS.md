# Supabase Edge Function Deployment Steps

## ✅ Step 1: CLI Installed
Supabase CLI is now installed via Homebrew.

## 📋 Next Steps:

### Step 2: Login to Supabase
```bash
supabase login
```
This will open your browser to authenticate.

### Step 3: Link Your Project
You'll need your **Project Reference ID** from Supabase Dashboard:
- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
- Look for "Project URL": `https://YOUR_PROJECT_REF.supabase.co`
- The part before `.supabase.co` is your Project Reference ID

Then run:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Deploy the Edge Function
```bash
supabase functions deploy compress-audio
```

### Step 5: Set Environment Variables
You'll need these from Supabase Dashboard → Project Settings → API:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Important:** 
- Replace `YOUR_PROJECT_REF` with your actual project reference ID
- Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key (keep this secret!)

### Step 6: Verify Deployment
Check if the function is deployed:
```bash
supabase functions list
```

You should see `compress-audio` in the list.

## 🎯 After Deployment

Once deployed, your transcription API will automatically use the Edge Function to compress large files (>25MB) before sending to OpenAI Whisper.

