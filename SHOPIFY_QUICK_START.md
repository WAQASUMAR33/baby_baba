# 🚀 Shopify Integration - Quick Start

## ✅ What's Done

Your dashboard now has **Shopify integration** ready to go! Here's what you can do:

1. ✅ Fetch products from Shopify
2. ✅ Fetch categories/collections from Shopify
3. ✅ Display products with images, prices, variants
4. ✅ Display categories with product counts
5. ✅ Search products by name or vendor
6. ✅ Beautiful responsive UI

## 🔑 Get Your Shopify Credentials (5 minutes)

### Step 1: Go to Shopify Admin
Visit: `https://YOUR-STORE.myshopify.com/admin`

### Step 2: Create a Custom App
1. Go to: **Settings** → **Apps and sales channels**
2. Click **"Develop apps"** (at the top)
3. Click **"Create an app"**
4. Name: `Baby Baba Dashboard`
5. Click **"Create app"**

### Step 3: Configure API Access
1. Click **"Configure Admin API scopes"**
2. Scroll down and check these boxes:
   - ✅ `read_products`
   - ✅ `read_collections`
3. Click **"Save"** at the top right

### Step 4: Install the App
1. Click **"Install app"** at the top
2. Click **"Install"** in the popup

### Step 5: Get Your Access Token
1. Click **"API credentials"** tab
2. Under "Admin API access token"
3. Click **"Reveal token once"**
4. **COPY THE TOKEN** (looks like: `shpat_xxxxx...`)
   - ⚠️ You can only see it once!
   - If you miss it, you'll need to regenerate

### Step 6: Get Your Store Domain
Your store domain is in the format: `your-store.myshopify.com`
- Example: If you access your admin at `baby-baba.myshopify.com/admin`
- Your domain is: `baby-baba.myshopify.com`

## 📝 Update Your .env File

Open `.env` file in your project root and replace these lines:

```env
# Replace these with your actual values:
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-admin-api-access-token
```

**Example:**
```env
SHOPIFY_STORE_DOMAIN=baby-baba.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## 🔄 Restart Your Server

After updating `.env`:

```bash
# Press Ctrl+C to stop the server
# Then start it again:
npm run dev
```

## 🎉 Test It Out!

1. **Login** to your dashboard: `http://localhost:3000/login`
   - Email: `theitxprts@gmail.com`
   - Password: `786ninja`

2. **View Products**: Click "Products" in the sidebar
   - You'll see all your Shopify products
   - Try the search feature
   - Click product links to view in store

3. **View Categories**: Click "Categories" in the sidebar
   - You'll see all your Shopify collections
   - See product counts per category

## 📱 New Pages Available

- `/dashboard/products` - All products from Shopify
- `/dashboard/categories` - All collections from Shopify

## 🎨 Features

### Products Page
- ✅ Product images
- ✅ Product titles & prices
- ✅ Vendor names
- ✅ Variant counts
- ✅ Status badges (active/draft)
- ✅ Real-time search
- ✅ Refresh button
- ✅ Links to view in store

### Categories Page
- ✅ Category images
- ✅ Category titles & descriptions
- ✅ Product counts
- ✅ Status badges (published/draft)
- ✅ Refresh button
- ✅ Links to view in store

## 🛠️ Sidebar Updated

Your sidebar now has:
- 🏠 Dashboard
- 📦 Orders
- 🛍️ Products (NEW - connects to Shopify)
- 🏷️ Categories (NEW - connects to Shopify)
- 👥 Customers
- 📊 Analytics
- ⚙️ Settings

## 🐛 Troubleshooting

### "Shopify credentials not configured"
- Make sure you updated `.env` with real values
- Restart the server after changing `.env`

### "401 Unauthorized"
- Your access token is incorrect
- Create a new custom app and get a new token

### "403 Forbidden"
- Missing API permissions
- Go back to Shopify and add `read_products` and `read_collections` scopes

### No products showing
- Make sure your Shopify store has products
- Check products are published (not archived)
- Click the refresh button

## 📚 Files Structure

```
src/
├── lib/
│   └── shopify.js              # Shopify API helper functions
├── app/
│   ├── api/
│   │   └── shopify/
│   │       ├── products/
│   │       │   └── route.js    # Products API endpoint
│   │       └── collections/
│   │           └── route.js    # Collections API endpoint
│   └── dashboard/
│       ├── products/
│       │   └── page.js         # Products display page
│       └── categories/
│           └── page.js         # Categories display page
```

## ✨ What's Next?

After you get it working, you can:
1. Customize the product/category card designs
2. Add filtering options (by vendor, price, etc.)
3. Add pagination for large catalogs
4. Create product detail pages
5. Add inventory management
6. Integrate order management

## 🎯 Current Status

- ✅ Shopify API integration complete
- ✅ Products page created
- ✅ Categories page created
- ✅ API routes configured
- ✅ Sidebar navigation updated
- ⏳ **Waiting for you to add Shopify credentials**

---

**Need the credentials?** Follow the steps above to get your:
1. Store domain (e.g., `your-store.myshopify.com`)
2. Access token (starts with `shpat_`)

Then update `.env` and restart the server!







