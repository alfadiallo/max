# Fix Storage Bucket Permissions

The error is from the Storage bucket, not the database!

## Steps to fix:

1. Go to your Supabase Dashboard
2. Click **Storage** in the left menu
3. Click on **max-audio** bucket
4. Go to **Policies** tab
5. Click **New Policy**
6. Select **"Allow public uploads"** or create custom policy:
   - Policy name: "Allow authenticated uploads"
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: Leave empty (true)
7. Click **Save**

This will allow authenticated users to upload files to the bucket.

