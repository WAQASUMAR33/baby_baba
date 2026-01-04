# 🔑 Get Shopify Admin API Token - Step by Step

## ❌ Current Issue

Your token starts with `shpss_` which is a **Storefront API token** (for public access).
We need an **Admin API token** that starts with `shpat_`.

## ✅ How to Get Admin API Token

### Step 1: Go to Your Shopify Admin
Visit: `https://admin.shopify.com/store/YOUR-STORE`

Or if you know your store name: `https://YOUR-STORE.myshopify.com/admin`

### Step 2: Navigate to Apps Settings
1. Click **Settings** (bottom left corner, gear icon)
2. Click **Apps and sales channels** (in the left sidebar)
3. Click **Develop apps** at the top of the page

If you don't see "Develop apps":
- You might need to enable it first
- Click "Allow custom app development" and confirm

### Step 3: Create a New App
1. Click **"Create an app"** button (top right)
2. **App name**: Enter `Baby Baba Dashboard` (or any name you like)
3. **App developer**: Select yourself
4. Click **"Create app"**

### Step 4: Configure Admin API Scopes
1. Click **"Configure Admin API scopes"** button
2. Scroll down through the permissions list
3. Find and check these boxes:
   - ✅ `read_products` - Read products
   - ✅ `read_collections` - Read product listings
   - ✅ `read_inventory` - Read inventory (optional)
   - ✅ `read_product_listings` - Read product listings (optional)
4. Click **"Save"** at the top right corner

### Step 5: Install the App
1. You'll see an **"Install app"** button at the top
2. Click **"Install app"**
3. Confirm the installation in the popup

### Step 6: Get Your Admin API Access Token
1. After installation, you'll be on the "API credentials" tab
2. Scroll down to **"Admin API access token"** section
3. Click **"Reveal token once"** button
4. **COPY THE ENTIRE TOKEN** - it will look like:
   ```
   shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. ⚠️ **IMPORTANT**: You can only see this token ONCE!
   - If you miss it, you'll need to uninstall and reinstall the app
   - Or create a new app

### Step 7: Get Your Store's myshopify.com Domain
While you're in the admin:
1. Look at your browser's address bar
2. The URL format is: `https://STORE-NAME.myshopify.com/admin/...`
3. Your domain is: `STORE-NAME.myshopify.com`

For example:
- URL: `https://baby-bazar.myshopify.com/admin/apps`
- Domain: `baby-bazar.myshopify.com`

## 📝 What You Need

After following the steps above, you should have:

1. **Store Domain** (format: `store-name.myshopify.com`)
   - Example: `baby-bazar.myshopify.com`

2. **Admin API Access Token** (starts with `shpat_`)
   - Example: `shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## 🎯 Share These With Me

Once you have both:
1. Your `.myshopify.com` domain
2. Your `shpat_` token

Share them here and I'll update your `.env` file immediately!

## 🔍 Quick Check

### Current Token (Wrong)
```
shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ❌ Storefront token
```

### Need Token (Correct)
```
shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ✅ Admin token
```

## 📸 Visual Guide

When you're at: **Settings → Apps and sales channels → Develop apps**

You should see:
- List of custom apps (if any exist)
- "Create an app" button
- After creating: "Configure Admin API scopes" button
- After configuring: "Install app" button
- After installing: "Reveal token once" button

## 🆘 Troubleshooting

### "I don't see Develop apps"
- You need store owner/staff permissions
- Or the store owner needs to enable custom app development

### "I can't find the permissions"
- Make sure you clicked "Configure Admin API scopes"
- Scroll down - there are many permissions
- Use Ctrl+F to search for "read_products"

### "I already revealed the token and forgot to copy it"
- You'll need to create a new custom app
- Or uninstall and reinstall the existing app

### "Token still doesn't work"
- Make sure you copied the entire token
- Check for extra spaces at the beginning or end
- Verify the token starts with `shpat_`

## ✨ Once You Have the Correct Token

I'll update your `.env` file and you'll be able to:
- ✅ View all products from Shopify
- ✅ View all collections/categories
- ✅ Search and filter products
- ✅ See product images, prices, variants




