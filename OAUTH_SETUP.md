# OAuth Provider Setup Guide

## Overview
This guide explains how to enable Google, Discord, and Twitch OAuth authentication in your ARENA application.

## Prerequisites
- Access to your Supabase project dashboard
- Admin access to create OAuth applications on Google, Discord, and Twitch

## Error: "provider is not enabled"
If you see this error when trying to sign in with OAuth, it means the provider needs to be enabled in your Supabase project settings.

---

## 1. Enable Google OAuth

### Step 1: Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**

### Step 2: Enable in Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Toggle **Enable Sign in with Google**
6. Paste your **Client ID** and **Client Secret**
7. Click **Save**

---

## 2. Enable Discord OAuth

### Step 1: Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give your application a name (e.g., "ARENA")
4. Navigate to **OAuth2** in the left sidebar
5. Add redirect URIs:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
6. Copy the **Client ID** and **Client Secret**

### Step 2: Enable in Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Discord** in the list
5. Toggle **Enable Sign in with Discord**
6. Paste your **Client ID** and **Client Secret**
7. Click **Save**

---

## 3. Enable Twitch OAuth

### Step 1: Create Twitch Application
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Click **Register Your Application**
3. Fill in the application details:
   - **Name**: ARENA (or your app name)
   - **OAuth Redirect URLs**: 
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
   - **Category**: Choose appropriate category (e.g., Website Integration)
4. Click **Create**
5. Copy the **Client ID**
6. Click **New Secret** to generate a **Client Secret**
7. Copy the **Client Secret** (you won't be able to see it again)

### Step 2: Enable in Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Twitch** in the list
5. Toggle **Enable Sign in with Twitch**
6. Paste your **Client ID** and **Client Secret**
7. Click **Save**

---

## Finding Your Supabase Project Reference

Your Supabase project reference is in your project URL:
```
https://[YOUR-PROJECT-REF].supabase.co
```

You can find it in:
1. Supabase Dashboard > Project Settings > General > Reference ID
2. Your Supabase project URL
3. Your `SUPABASE_URL` environment variable

---

## Testing OAuth Providers

After enabling each provider:

1. **Test Sign In**:
   - Go to your ARENA sign-in page
   - Click the OAuth button (Google/Discord/Twitch)
   - You should be redirected to the provider's login page
   - After successful login, you'll be redirected back to ARENA

2. **Verify User Creation**:
   - Check Supabase Dashboard > Authentication > Users
   - You should see a new user with the provider's email
   - The user's profile should be automatically created

3. **Check for Errors**:
   - If you see errors, check the browser console
   - Check Supabase Dashboard > Logs for authentication errors
   - Verify redirect URIs match exactly

---

## Common Issues

### Issue: "Redirect URI mismatch"
**Solution**: Ensure the redirect URI in your OAuth application matches exactly:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

### Issue: "Invalid client credentials"
**Solution**: Double-check that you copied the Client ID and Client Secret correctly.

### Issue: "Provider is not enabled"
**Solution**: Make sure you toggled the provider ON in Supabase and clicked Save.

### Issue: "Email already registered"
**Solution**: If a user already has an account with email/password, they cannot use OAuth with the same email. They need to use their original login method or reset their password.

---

## Security Best Practices

1. **Keep Secrets Secure**:
   - Never commit Client Secrets to version control
   - Store them only in Supabase dashboard
   - Rotate secrets periodically

2. **Restrict Redirect URIs**:
   - Only add necessary redirect URIs
   - Use HTTPS in production
   - Avoid wildcard URIs

3. **Monitor Usage**:
   - Check Supabase logs regularly
   - Monitor for suspicious authentication attempts
   - Set up alerts for failed logins

4. **User Consent**:
   - Clearly explain what data you're accessing
   - Provide privacy policy and terms of service
   - Allow users to revoke OAuth access

---

## Additional Configuration

### Customize OAuth Scopes

By default, ARENA requests basic profile information. To request additional scopes:

1. **Google**: Edit `signInWithGoogle()` in `AuthContext.tsx`:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`,
       scopes: 'email profile', // Add more scopes as needed
     },
   });
   ```

2. **Discord**: Available scopes include `identify`, `email`, `guilds`
3. **Twitch**: Available scopes include `user:read:email`, `user:read:subscriptions`

### Handle OAuth Callbacks

The application automatically handles OAuth callbacks at `/auth/callback`. If you need custom logic:

1. Create a callback page at `src/pages/AuthCallback.tsx`
2. Add route in `routes.tsx`
3. Handle token exchange and user creation

---

## Support

If you encounter issues:

1. Check [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
2. Review provider-specific documentation:
   - [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
   - [Discord OAuth](https://discord.com/developers/docs/topics/oauth2)
   - [Twitch OAuth](https://dev.twitch.tv/docs/authentication)
3. Check Supabase community forums
4. Review ARENA's SECURITY.md for authentication details

---

## Checklist

Before going live, ensure:

- [ ] All OAuth providers are enabled in Supabase
- [ ] Redirect URIs are correctly configured
- [ ] Client IDs and Secrets are saved in Supabase
- [ ] OAuth buttons work on sign-in and sign-up pages
- [ ] Users can successfully authenticate with each provider
- [ ] User profiles are automatically created after OAuth login
- [ ] Email notifications work for OAuth users
- [ ] Terms and Privacy Policy are accepted before OAuth
- [ ] OAuth providers are tested in production environment

---

**Last Updated**: 2026-04-22
**Version**: 1.0
