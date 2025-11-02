# Admin User Invitation Setup Checklist

## Prerequisites

### 1. ✅ Database Tables
The `max_users` table should already exist from your initial migrations. Verify:

```sql
-- Run this in Supabase SQL Editor to check
SELECT * FROM max_users LIMIT 1;
```

If the table doesn't exist, run:
```sql
CREATE TABLE IF NOT EXISTS max_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_users_email ON max_users(email);
```

### 2. ✅ Environment Variables
Ensure `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sutzvbpsflwqdzcjtscr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  ← CRITICAL for admin operations
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required for creating users. Get it from:
- Supabase Dashboard → Settings → API → `service_role` key

### 3. ✅ RLS Policies
The admin client uses service role key, so it bypasses RLS. No policy changes needed.

### 4. ✅ Admin User Role
Your admin user (`findme@alfadiallo.com`) must have `role: "Admin"` in `user_metadata`.

Verify:
```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as name
FROM auth.users
WHERE email = 'findme@alfadiallo.com';
```

If role is missing, update it:
- In Supabase Dashboard → Authentication → Users
- Find your user → Edit → User Metadata → Add: `{"role": "Admin"}`

## Testing

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Login as admin:**
   - Go to http://localhost:3000/dashboard
   - Login with findme@alfadiallo.com

3. **Access Admin Panel:**
   - You should see "Manage Users" card on dashboard
   - Click it to go to /admin/users

4. **Invite a test user:**
   - Email: test@example.com
   - Name: Test User
   - Role: Editor
   - Click "Send Invitation"

5. **Check results:**
   - Check Supabase Dashboard → Authentication → Users (should see new user)
   - Check `max_users` table (should have new entry)
   - Check email inbox for invitation email

## Troubleshooting

### "Missing Supabase configuration" error
→ Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`

### "Forbidden: Admin role required" error
→ Your user needs `role: "Admin"` in user_metadata

### User created but no email sent
→ Check Supabase Dashboard → Authentication → Email Templates
→ Verify email is configured (SMTP settings)

### "Failed to create user" error
→ Check Supabase logs in Dashboard → Logs → Auth Logs
→ Verify email isn't already registered

