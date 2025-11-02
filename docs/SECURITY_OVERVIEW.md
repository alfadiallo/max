# Max Application Security Overview

## 🔒 Security Architecture

### Supabase Security Model

Max uses **Supabase** as its backend, which provides multiple layers of security:

1. **Row Level Security (RLS)** - Database-level access control
2. **JWT Authentication** - Token-based authentication
3. **API Key Separation** - Anon key vs Service Role key
4. **HTTPS/SSL** - Encrypted connections (in production)

---

## 🛡️ Access Control Layers

### Layer 1: Authentication (Supabase Auth)

**Who needs to authenticate:**
- ✅ All users must be authenticated to access the application
- ✅ Authentication handled via Supabase Auth (JWT tokens)
- ✅ Tokens stored in HTTP-only cookies (via SSR)
- ✅ Session automatically refreshed

**Authentication flow:**
1. User logs in → Receives JWT token
2. Token stored in secure cookie
3. Token included in all API requests
4. Supabase validates token on each request

### Layer 2: Middleware Protection (Next.js)

**Route protection:**
- ✅ `/dashboard` - Requires authentication
- ✅ `/projects` - Requires authentication  
- ✅ `/insight` - Requires authentication
- ✅ `/admin` - Requires authentication
- ✅ `/login`, `/register` - Redirects if already authenticated

**Role-based routing:**
- **Editors**: Restricted to `/projects` only (redirected from other routes)
- **Admins**: Full access to all routes

### Layer 3: API Route Authentication

**All API routes check authentication:**
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser()
if (!user || userError) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**API routes protected:**
- `/api/projects` - Must be authenticated
- `/api/audio/*` - Must be authenticated
- `/api/transcriptions/*` - Must be authenticated
- `/api/insight/*` - Must be authenticated
- `/api/admin/*` - Must be Admin role

---

## 🔐 Row Level Security (RLS) Policies

### RLS Status
✅ **RLS is ENABLED** on all `max_*` tables

This means:
- **Even if someone bypasses the API**, they cannot access data they shouldn't
- **Database-level enforcement** of access rules
- **No direct database access** without proper authentication

### Access Rules by Role

#### **Regular Users**
- ✅ Can view/update **only their own** projects
- ✅ Can view/update **only their own** audio files
- ✅ Can view/update **only their own** transcriptions
- ✅ Can create new projects (assigned to them)

#### **Editor Role**
- ✅ Can view **ALL** projects (not just their own)
- ✅ Can view **ALL** audio files in all projects
- ✅ Can upload files to **ANY** project
- ✅ Can view **ALL** transcriptions
- ✅ Can edit transcriptions for **ANY** project
- ❌ **Cannot** access `/dashboard`, `/insight`, `/admin`
- ❌ **Cannot** access "Final", "Analysis", or "Translations" tabs
- ❌ **Cannot** promote transcriptions to final

#### **Admin Role**
- ✅ **Full access** to all data
- ✅ Can invite new users
- ✅ Can access all routes and features
- ✅ Can view/edit all projects and transcriptions

### RLS Policy Examples

**Example 1: Projects Table**
```sql
-- Regular users can only see their own projects
SELECT USING (auth.uid() = created_by)

-- Editors/Admins can see all projects  
SELECT USING (auth.uid() = created_by OR is_editor_or_admin())
```

**Example 2: Audio Files**
```sql
-- Users can only see files in their own projects
SELECT USING (
  EXISTS (
    SELECT 1 FROM max_projects 
    WHERE max_projects.id = max_audio_files.project_id 
    AND (max_projects.created_by = auth.uid() OR is_editor_or_admin())
  )
)
```

---

## 🔑 API Keys & Secrets

### Key Types

#### 1. **NEXT_PUBLIC_SUPABASE_ANON_KEY** (Public)
- **Location**: Exposed to browser (in client-side code)
- **Permissions**: Limited by RLS policies
- **Use**: Client-side Supabase calls
- **Security**: Protected by RLS - cannot bypass access rules

#### 2. **SUPABASE_SERVICE_ROLE_KEY** (Secret) ⚠️
- **Location**: Server-side only (`.env.local`, never in client)
- **Permissions**: **BYPASSES ALL RLS** - full database access
- **Use**: Admin operations (user creation, user sync)
- **Security**: **MUST BE KEPT SECRET** - Never commit to git

### Environment Variables Security

✅ **Good practices in place:**
- `.env.local` in `.gitignore` (not committed)
- Service role key only used server-side
- Admin endpoints verify Admin role before using service key

---

## 🚨 Security Concerns & Vulnerabilities

### ✅ Strengths

1. **RLS Enabled**: Database-level security even if API is bypassed
2. **Multi-layer protection**: Middleware + API checks + RLS
3. **Role-based access**: Clear separation between Editor and Admin
4. **JWT tokens**: Secure, time-limited authentication
5. **HTTPS in production**: Encrypted connections

### ⚠️ Potential Vulnerabilities

#### 1. **Service Role Key Exposure** (HIGH RISK)
**Risk**: If `SUPABASE_SERVICE_ROLE_KEY` is exposed, attacker has full database access

**Mitigations in place:**
- ✅ Key stored in `.env.local` (not in git)
- ✅ Only used server-side
- ✅ Admin endpoints verify role before using it

**Recommendations:**
- ⚠️ **Never** log the service role key
- ⚠️ **Rotate** the key if accidentally exposed
- ⚠️ **Monitor** Supabase logs for unusual admin API usage

#### 2. **Editor Access to All Data** (MEDIUM RISK)
**Risk**: Editors can view/edit all projects, including sensitive data

**Current behavior:**
- ✅ By design - Editors need access to all projects for transcription work
- ⚠️ No audit log of Editor actions
- ⚠️ No way to track what Editors are viewing/editing

**Recommendations:**
- ⚠️ Consider adding audit logging for Editor actions
- ⚠️ Consider restricting Editor access to specific projects (project-level permissions)
- ⚠️ Monitor for unusual access patterns

#### 3. **Client-Side Role Checks** (LOW RISK)
**Risk**: Role checks in UI can be bypassed by modifying client code

**Mitigations in place:**
- ✅ **RLS policies enforce access at database level** (even if UI is bypassed)
- ✅ API routes verify roles server-side
- ✅ Middleware enforces route restrictions

**Example:**
- User modifies client to show "Admin Dashboard" button
- But RLS prevents them from accessing admin data
- Middleware redirects them from `/admin` routes

#### 4. **API Route Authentication** (LOW RISK)
**Risk**: API routes might miss authentication checks

**Current state:**
- ✅ Most routes check authentication
- ⚠️ Some routes might not check role permissions

**Recommendations:**
- ⚠️ Audit all API routes for consistent authentication
- ⚠️ Consider adding role checks to more endpoints
- ⚠️ Add request rate limiting

#### 5. **Password Security** (MEDIUM RISK)
**Current state:**
- ✅ Passwords handled by Supabase Auth (bcrypt hashing)
- ✅ Password reset flow implemented
- ⚠️ No password complexity requirements enforced
- ⚠️ No two-factor authentication (2FA)

**Recommendations:**
- ⚠️ Enable password complexity requirements in Supabase Dashboard
- ⚠️ Consider implementing 2FA for Admin accounts
- ⚠️ Enforce password rotation policies

---

## 🔍 Who Can Access What?

### Database Access

| Role | Direct DB Access | Via API (RLS Enforced) |
|------|------------------|------------------------|
| **Unauthenticated** | ❌ None | ❌ None |
| **Regular User** | ❌ None (RLS blocks) | ✅ Own projects only |
| **Editor** | ❌ None (RLS blocks) | ✅ All projects (limited features) |
| **Admin** | ❌ None (RLS blocks) | ✅ All data |
| **Service Role Key** | ✅ **FULL ACCESS** | ✅ **BYPASSES RLS** |

### Application Access

| Route | Regular User | Editor | Admin |
|-------|-------------|--------|-------|
| `/dashboard` | ✅ | ❌ (redirected) | ✅ |
| `/projects` | ✅ | ✅ | ✅ |
| `/insight` | ✅ | ❌ (redirected) | ✅ |
| `/admin` | ❌ | ❌ | ✅ |
| `/login` | ✅ | ✅ | ✅ |

### Data Access

| Data Type | Regular User | Editor | Admin |
|-----------|-------------|--------|-------|
| **Own Projects** | ✅ Full | ✅ View/Edit | ✅ Full |
| **Other Users' Projects** | ❌ | ✅ View/Edit (limited) | ✅ Full |
| **Audio Files** | ✅ Own only | ✅ All | ✅ All |
| **Transcriptions** | ✅ Own only | ✅ All (Original/Edits only) | ✅ All |
| **Analysis/Translations** | ✅ Own only | ❌ | ✅ All |

---

## 🛠️ Security Best Practices

### ✅ Currently Implemented

1. ✅ RLS enabled on all tables
2. ✅ JWT authentication required
3. ✅ Role-based access control
4. ✅ Server-side validation
5. ✅ Environment variables for secrets
6. ✅ HTTPS in production (via Supabase)
7. ✅ Password reset flow

### ⚠️ Recommended Improvements

1. **Audit Logging**
   - Log all Editor/Admin actions
   - Track data access patterns
   - Monitor for suspicious activity

2. **Rate Limiting**
   - Prevent brute force attacks
   - Limit API request frequency
   - Protect against DDoS

3. **Enhanced Authentication**
   - Implement 2FA for Admin accounts
   - Enforce password complexity
   - Session timeout management

4. **Data Encryption**
   - Encrypt sensitive fields at rest (if required)
   - Ensure all connections use HTTPS/TLS

5. **Regular Security Audits**
   - Review RLS policies periodically
   - Test for unauthorized access
   - Update dependencies for security patches

6. **Access Monitoring**
   - Set up alerts for unusual access patterns
   - Monitor Supabase logs
   - Track Editor activity

---

## 📊 Security Checklist

- [x] RLS enabled on all tables
- [x] Authentication required for all routes
- [x] API routes verify authentication
- [x] Role-based access control implemented
- [x] Service role key kept secret
- [x] Environment variables not in git
- [x] Password reset flow implemented
- [ ] Audit logging implemented
- [ ] Rate limiting implemented
- [ ] 2FA for Admin accounts
- [ ] Password complexity requirements
- [ ] Security monitoring/alerts

---

## 🚨 What If Service Role Key Is Compromised?

**Immediate actions:**
1. **Rotate the key** in Supabase Dashboard (Settings → API)
2. **Review access logs** to see what was accessed
3. **Update `.env.local`** with new key
4. **Revoke old key** immediately

**Supabase Dashboard:**
- Settings → API → Rotate service_role key

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security#examples)

---

## 🔐 Summary

**Current Security Level: ⚠️ MODERATE to GOOD**

**Strengths:**
- ✅ Strong database-level security (RLS)
- ✅ Multi-layer access control
- ✅ Role-based permissions

**Areas for Improvement:**
- ⚠️ Add audit logging
- ⚠️ Implement rate limiting
- ⚠️ Add 2FA for sensitive accounts
- ⚠️ Enhance monitoring

**Overall:** The application has a solid security foundation with RLS and authentication. The main risk is the service role key, which should be carefully guarded. Editor access to all data is by design but should be monitored.

