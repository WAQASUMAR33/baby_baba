# Vercel Deployment Guide

## Required Environment Variables

Make sure to set these environment variables in your Vercel project settings:

### 1. NextAuth Configuration
- **NEXTAUTH_URL**: Your production URL (e.g., `https://your-app.vercel.app`)
  - Vercel automatically provides `VERCEL_URL`, but you should set `NEXTAUTH_URL` explicitly
  - If not set, the app will try to use `https://${VERCEL_URL}` as fallback
  
- **NEXTAUTH_SECRET**: A random secret string (minimum 32 characters)
  - Generate one using: `openssl rand -base64 32`
  - Or use an online generator: https://generate-secret.vercel.app/32

### 2. Database Configuration
- **DATABASE_URL**: Your MySQL connection string
  - Format: `mysql://username:password@host:port/database`
  - Example: `mysql://user:pass@host:3306/dbname`

### 3. Shopify Configuration (if using Shopify features)
- **SHOPIFY_STORE_DOMAIN**: Your Shopify store domain
- **SHOPIFY_ACCESS_TOKEN**: Your Shopify access token
- **SHOPIFY_API_VERSION**: Shopify API version (default: 2024-01)

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production**, **Preview**, and **Development** environments
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Common Issues and Solutions

### Login Not Working / Not Redirecting to Dashboard

**Issue**: Login succeeds but doesn't redirect to dashboard

**Solutions**:
1. **Check NEXTAUTH_URL**: Must be set to your exact Vercel domain
   - Go to Vercel dashboard → Settings → Environment Variables
   - Set `NEXTAUTH_URL` to `https://your-app.vercel.app` (without trailing slash)

2. **Check NEXTAUTH_SECRET**: Must be set and at least 32 characters
   - Generate a new secret if needed
   - Make sure it's the same across all environments

3. **Check Database Connection**: 
   - Verify `DATABASE_URL` is correct
   - Ensure your database allows connections from Vercel's IP addresses
   - Check Vercel function logs for database connection errors

4. **Check Browser Console**: 
   - Open browser DevTools → Console
   - Look for any errors related to authentication or API calls

### Session Not Persisting

**Issue**: User gets logged out immediately after login

**Solutions**:
1. Ensure `NEXTAUTH_URL` uses `https://` (not `http://`)
2. Check that cookies are being set (DevTools → Application → Cookies)
3. Verify `trustHost: true` is set in NextAuth config (already configured)

### API Routes Returning 500 Errors

**Issue**: API routes fail in production but work locally

**Solutions**:
1. Check Vercel function logs: Dashboard → Deployments → Select deployment → Functions tab
2. Verify all environment variables are set correctly
3. Check database connection string format
4. Ensure database server allows connections from Vercel

## Testing the Deployment

1. **Test Login**:
   - Navigate to `/login`
   - Enter credentials
   - Should redirect to `/dashboard` after successful login

2. **Check Session**:
   - After login, refresh the page
   - Should remain logged in
   - Check browser cookies for `next-auth.session-token`

3. **Test API Routes**:
   - Check Vercel function logs for any errors
   - Test API endpoints that require authentication

## Debugging

### Enable Debug Mode

In Vercel environment variables, you can temporarily set:
```
NODE_ENV=development
```

This will enable NextAuth debug logging (check Vercel function logs).

### Check Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click on a deployment
5. Check **Functions** tab for server-side logs
6. Check **Runtime Logs** for real-time logs

## Quick Checklist

- [ ] `NEXTAUTH_URL` is set to your Vercel domain (https://)
- [ ] `NEXTAUTH_SECRET` is set and at least 32 characters
- [ ] `DATABASE_URL` is correctly formatted
- [ ] All environment variables are set for Production environment
- [ ] Application has been redeployed after setting environment variables
- [ ] Database allows connections from Vercel
- [ ] Tested login flow in production
- [ ] Checked browser console for client-side errors
- [ ] Checked Vercel function logs for server-side errors


