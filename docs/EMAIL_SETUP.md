# Email Configuration for User Invitations

## Current Issue
Emails show as "sent successfully" but don't arrive because:
1. **Supabase's default email service** has strict limitations:
   - Only **2 emails per hour** rate limit
   - Intended for **testing only**
   - May be blocked by email providers

2. **`generateLink()` doesn't automatically send emails** - it only generates a magic link

## Solution: Configure Custom SMTP

You need to set up a custom SMTP provider to send invitation emails reliably.

### Recommended SMTP Providers
1. **Resend** (Easiest, built for developers) - https://resend.com
2. **SendGrid** - https://sendgrid.com
3. **Mailgun** - https://mailgun.com
4. **Amazon SES** - https://aws.amazon.com/ses/

### Setup Steps

#### 1. Create Account with SMTP Provider
Example with Resend (easiest):
- Sign up at https://resend.com
- Verify your domain (or use their test domain)
- Get your SMTP credentials

#### 2. Configure in Supabase Dashboard
1. Go to: https://app.supabase.com/project/sutzvbpsflwqdzcjtscr/auth/providers
2. Scroll to **Email Templates** section
3. Click **SMTP Settings**
4. Enter your SMTP credentials:
   - **SMTP Host**: `smtp.resend.com` (or your provider's host)
   - **SMTP Port**: `587` or `465`
   - **SMTP User**: Your SMTP username
   - **SMTP Password**: Your SMTP password
   - **SMTP Sender Name**: Your app name (e.g., "Max")
   - **SMTP Sender Email**: Your verified email address

5. Click **Save**

#### 3. Test Email Delivery
- Go to Authentication → Users → Invite user
- Send a test invitation
- Check the recipient's inbox (and spam folder)

### Alternative: Manual Password Setup
If you don't want to set up SMTP yet, you can:
1. Create users with a temporary password
2. Manually share the password with users
3. Users can reset their password on first login

## Current Code Status
The invite endpoint currently:
- ✅ Creates the user successfully
- ✅ Sets `email_confirm: true` (so user can login immediately)
- ⚠️ Generates invite link but doesn't send email automatically
- ⚠️ Requires SMTP configuration for email delivery

## Quick Fix for Now
If emails aren't working:
1. User is created and can login immediately (since `email_confirm: true`)
2. Share the temporary password manually with the user
3. User can login and reset password if needed

Or configure SMTP as described above for automatic email delivery.

