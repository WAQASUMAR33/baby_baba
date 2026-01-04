# How to Create a User Account

You have several options to create a user account:

## Option 1: Using the Registration Page (Recommended)

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/register
   ```

3. Fill in the registration form:
   - Name (optional)
   - Email
   - Password (minimum 6 characters)
   - Confirm Password

4. Click "Create account"

5. You'll be redirected to the login page where you can sign in.

## Option 2: Using the Admin API Endpoint

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Use curl or any HTTP client to call the API:
   ```bash
   curl -X POST http://localhost:3000/api/admin/create-user \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123","name":"Admin User"}'
   ```

   Or using PowerShell:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/admin/create-user" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"email":"admin@example.com","password":"admin123","name":"Admin User"}'
   ```

## Option 3: Using the Browser Console

1. Start your Next.js development server
2. Open your browser's developer console
3. Run this JavaScript:
   ```javascript
   fetch('/api/admin/create-user', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'admin@example.com',
       password: 'admin123',
       name: 'Admin User'
     })
   })
   .then(res => res.json())
   .then(data => console.log(data))
   ```

## Default Test Account

If you want to quickly test, you can create an account with:
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Name**: `Admin User`

After creating an account, you can login at:
```
http://localhost:3000/login
```




