# Create User Account Instructions

## Quick Method: Use the Registration Page

1. **Start your Next.js server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:3000/register
   ```

3. **Fill in the form:**
   - Email: `theitxprts@gmail.com`
   - Password: `786ninja`
   - Name: (optional)
   - Confirm Password: `786ninja`

4. **Click "Create account"**

5. **Login at:**
   ```
   http://localhost:3000/login
   ```

## Alternative: Use the API Endpoint

Once your server is running, you can use PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/create-user" -Method POST -ContentType "application/json" -Body '{"email":"theitxprts@gmail.com","password":"786ninja","name":"Test User"}'
```

Or use the test script:
```bash
npm run create-test-user
```

**Note:** Make sure your MySQL server is running and the DATABASE_URL in your `.env` file is correct.






