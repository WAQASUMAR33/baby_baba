# 🛍️ Shopify Environment Variables Setup

## ✅ Already Added to .env File

Your `.env` file now has these Shopify variables:

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-admin-api-access-token
SHOPIFY_API_VERSION=2024-01
```

## 🔧 What You Need to Do

Replace the placeholder values with your actual Shopify credentials:

### 1. SHOPIFY_STORE_DOMAIN
**What it is:** Your Shopify store URL
**Format:** `yourstore.myshopify.com` (without https://)
**Example:** `baby-baba.myshopify.com`

### 2. SHOPIFY_ACCESS_TOKEN
**What it is:** Your Admin API access token
**Format:** Starts with `shpat_`
**Example:** `shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 3. SHOPIFY_API_VERSION
**What it is:** API version to use
**Default:** `2024-01` (already set, no need to change)

## 📝 How to Get Your Credentials

### Step-by-Step:

1. **Go to Shopify Admin**
   ```
   https://YOUR-STORE.myshopify.com/admin
   ```

2. **Settings → Apps and sales channels**
   - Click "Develop apps" (at the top)
   - Or go directly to: `https://YOUR-STORE.myshopify.com/admin/settings/apps/development`

3. **Create a Custom App**
   - Click "Create an app"
   - App name: `Baby Baba Dashboard`
   - Click "Create app"

4. **Configure Admin API Scopes**
   - Click "Configure Admin API scopes" button
   - Scroll down and find these permissions:
     - ✅ Check `read_products`
     - ✅ Check `read_collections`
   - Click "Save" at the top right

5. **Install the App**
   - Click "Install app" button at the top
   - Click "Install" in the confirmation popup

6. **Get Your Access Token**
   - You'll see "API credentials" tab
   - Under "Admin API access token"
   - Click **"Reveal token once"**
   - **COPY THE ENTIRE TOKEN** (it's long!)
   - ⚠️ Important: You can only see it once!

7. **Get Your Store Domain**
   - Look at your browser URL
   - If it's `https://baby-baba.myshopify.com/admin`
   - Your domain is: `baby-baba.myshopify.com`

## ✏️ How to Update .env File

### Option 1: Manual Edit
1. Open `.env` file in your editor
2. Replace the placeholder values:

```env
# BEFORE (placeholders):
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-admin-api-access-token

# AFTER (your actual values):
SHOPIFY_STORE_DOMAIN=baby-baba.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_1234567890abcdefghijklmnop1234567
```

### Option 2: Using PowerShell (Quick)
Share your credentials and I'll create the command for you!

## 🔄 After Updating

1. **Save the `.env` file**
2. **Restart your development server**:
   ```bash
   # Press Ctrl+C to stop the server
   npm run dev
   ```

## ✅ Test Your Integration

1. Login to dashboard: `http://localhost:3000/login`
2. Click **"Products"** in the sidebar
3. You should see all your Shopify products!
4. Click **"Categories"** in the sidebar
5. You should see all your Shopify collections!

## 🐛 Troubleshooting

### "Shopify credentials not configured"
- Make sure you replaced BOTH placeholders
- No spaces before or after the `=` sign
- No quotes around the values

### "401 Unauthorized"
- Your access token is incorrect
- Go back and create a new token

### "403 Forbidden"
- Missing API permissions
- Go back to Shopify and add `read_products` and `read_collections` scopes

### Token Copied Wrong
- Token should be one long string with no spaces
- Should start with `shpat_`
- Usually 30-50 characters long

## 📋 Example of Complete .env File

```env
DATABASE_URL=mysql://root:@localhost:3306/mydb2

NEXTAUTH_SECRET=vAyWrNiJupbyfq7fGtNJsSRM3SwzHcKsu435xHL6yWA=
NEXTAUTH_URL=http://localhost:3000

# Shopify API Configuration
SHOPIFY_STORE_DOMAIN=baby-baba.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SHOPIFY_API_VERSION=2024-01
```

## 🎯 Current Status

- ✅ Shopify variables added to .env
- ✅ Integration code ready
- ✅ UI pages created
- ⏳ **Waiting for your Shopify credentials**

---

**Ready to add your credentials?** Just share:
1. Your store domain (e.g., `yourstore.myshopify.com`)
2. Your access token (starts with `shpat_`)

And I'll help you add them to the .env file!




