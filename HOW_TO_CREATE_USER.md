# How to Create User Account

## Method 1: Using Registration Page (Easiest - Recommended)

1. **Start your Next.js development server:**
   ```bash
   npm run dev
   ```
   Wait until you see: `✓ Ready in Xms` and `○ Local: http://localhost:3000`

2. **Open your browser and go to:**
   ```
   http://localhost:3000/register
   ```

3. **Fill in the registration form:**
   - **Name**: Test User (optional)
   - **Email**: `theitxprts@gmail.com`
   - **Password**: `786ninja`
   - **Confirm Password**: `786ninja`

4. **Click "Create account"**

5. **You'll be redirected to the login page. Login with:**
   - Email: `theitxprts@gmail.com`
   - Password: `786ninja`

## Method 2: Using the Script (Requires Server Running)

1. **First, start your server:**
   ```bash
   npm run dev
   ```
   Keep this terminal running.

2. **Open a NEW terminal window and run:**
   ```bash
   npm run create-user
   ```

## Method 3: Using PowerShell API Call

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **In PowerShell, run:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"theitxprts@gmail.com","password":"786ninja","name":"Test User"}'
   ```

## Troubleshooting

If you get errors:

1. **Make sure MySQL is running:**
   - Check your MySQL service is started
   - Verify your `DATABASE_URL` in `.env` file is correct

2. **Make sure the Next.js server is running:**
   - You should see `✓ Ready` in the terminal
   - The server should be accessible at `http://localhost:3000`

3. **Check the database connection:**
   ```bash
   npx prisma db pull
   ```
   This will verify your database connection.

4. **If user already exists:**
   - You'll get an error saying "User already exists"
   - You can just login at `http://localhost:3000/login`

## Verify User Was Created

After creating the user, you can verify by:

1. **Login at:** `http://localhost:3000/login`
2. **Or check Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   Then open `http://localhost:5555` and check the `User` table.






