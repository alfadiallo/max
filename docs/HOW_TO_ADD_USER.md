# How to Add a New User in Max

## Current Setup
- Roles are stored in Supabase Auth's `user_metadata` field
- `findme@alfadiallo.com` has role "Admin" in user_metadata
- You want to add `alfadiallo@mac.com` as an "Editor"

## Method 1: Admin Dashboard (Easiest) ⭐

1. **Login as Admin**
   - Go to http://localhost:3000/dashboard
   - Login with your admin account (findme@alfadiallo.com)

2. **Open Manage Users**
   - Click on the "Manage Users" card in the dashboard
   - This will take you to `/admin/users`

3. **Invite New User**
   - Fill in the form:
     - **Email**: alfadiallo@mac.com
     - **Full Name**: Alfa Diallo
     - **Role**: Editor
   - Click "Send Invitation"

4. **Done!**
   - The user is created in both `auth.users` and `max_users`
   - An invitation email is sent to their email address
   - They can click the link to set their password and login

## Method 2: Supabase Dashboard (Manual)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://app.supabase.com/
   - Select your project: sutzvbpsflwqdzcjtscr

2. **Go to Authentication > Users**
   - Click on "Authentication" in the left sidebar
   - Click on "Users"

3. **Create New User**
   - Click the "Add user" button (top right)
   - Select "Create new user"
   
4. **Fill in user details**
   - **Email**: alfadiallo@mac.com
   - **Password**: (generate a secure password or set one)
   - **Auto Confirm User**: Toggle ON (if you want them to login immediately)
   - **User Metadata**: Click to expand
     - Add:
       ```json
       {
         "full_name": "Alfa Diallo",
         "role": "Editor"
       }
       ```

5. **Click "Create user"**

6. **Done!**
   - User is created in Supabase Auth
   - You need to manually create the entry in `max_users` table

7. **Add to max_users table**
   - Go to "Table Editor" in Supabase
   - Open the `max_users` table
   - Click "Insert row"
   - Fill in:
     - **id**: Copy the UUID from the auth.users table (from Authentication > Users)
     - **email**: alfadiallo@mac.com
     - **full_name**: Alfa Diallo
   - Click "Save"

## Method 3: API Direct (For Developers)

You can also call the API directly:

```bash
curl -X POST http://localhost:3000/api/admin/invite-user \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "email": "alfadiallo@mac.com",
    "full_name": "Alfa Diallo",
    "role": "Editor"
  }'
```

**Note:** Requires admin authentication and the SUPABASE_SERVICE_ROLE_KEY to be set.

## Current User Roles

Based on the code:
- **Admin**: findme@alfadiallo.com
- **Editor**: (to be created) alfadiallo@mac.com

These are stored in `auth.users.user_metadata.role`.

