# Shopify API Integration - Complete Guide 🛍️

## ✅ What's Integrated

Your Baby Baba dashboard now has **full Shopify integration** to fetch products and categories (collections) from your Shopify store.

## 📦 Installed Packages

- ✅ `@shopify/shopify-api` - Official Shopify API library
- ✅ `dotenv` - Environment variable management

## 🔧 Configuration Required

### Step 1: Get Shopify Credentials

You need to get your Shopify Admin API credentials:

1. **Go to your Shopify Admin**: `https://your-store.myshopify.com/admin`

2. **Create a Custom App**:
   - Go to: **Settings** → **Apps and sales channels** → **Develop apps**
   - Click **"Create an app"**
   - Name it: "Baby Baba Dashboard"
   - Click **"Create app"**

3. **Configure Admin API Scopes**:
   - Click **"Configure Admin API scopes"**
   - Select these permissions:
     - ✅ `read_products`
     - ✅ `read_product_listings`
     - ✅ `read_inventory`
     - ✅ `read_collections`
   - Click **"Save"**

4. **Install the App**:
   - Click **"Install app"**
   - Confirm the installation

5. **Get Your Access Token**:
   - Click **"Reveal token once"**
   - **COPY THE TOKEN** (you can only see it once!)

6. **Get Your Store Domain**:
   - Your store domain format: `your-store.myshopify.com`
   - Example: If your store is `baby-baba.myshopify.com`, that's your domain

### Step 2: Update .env File

Your `.env` file has been updated with placeholders. Replace them with your actual credentials:

```env
# Shopify API Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-01
```

**Example:**
```env
SHOPIFY_STORE_DOMAIN=baby-baba.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SHOPIFY_API_VERSION=2024-01
```

### Step 3: Restart Your Server

After updating `.env`:

```bash
# Stop the server (Ctrl+C)
npm run dev
```

## 🎯 Features

### 1. Products Page (`/dashboard/products`)
- ✅ Fetch all products from Shopify
- ✅ Display product images, titles, prices
- ✅ Show product variants count
- ✅ Show product status (active/draft)
- ✅ Search products by name or vendor
- ✅ Refresh button to reload data
- ✅ Links to view products in Shopify store
- ✅ Responsive grid layout

### 2. Categories Page (`/dashboard/categories`)
- ✅ Fetch all collections (custom + smart)
- ✅ Display collection images and titles
- ✅ Show product count per collection
- ✅ Show collection status (published/draft)
- ✅ Refresh button to reload data
- ✅ Links to view collections in Shopify store
- ✅ Responsive grid layout

### 3. API Routes
- ✅ `/api/shopify/products` - Get all products
- ✅ `/api/shopify/collections` - Get all collections
- ✅ Error handling with detailed messages
- ✅ Support for pagination and filtering

### 4. Shopify Helper Library (`src/lib/shopify.js`)
- ✅ `getProducts()` - Fetch all products
- ✅ `getProduct(id)` - Fetch single product
- ✅ `getCollections()` - Fetch all collections
- ✅ `getCollection(id)` - Fetch single collection
- ✅ `getCollectionProducts(id)` - Get products in collection
- ✅ `getProductCount()` - Get total product count
- ✅ `searchProducts(query)` - Search products
- ✅ `isShopifyConfigured()` - Check if configured

## 📁 Files Created

1. **`src/lib/shopify.js`** - Shopify API helper functions
2. **`src/app/api/shopify/products/route.js`** - Products API endpoint
3. **`src/app/api/shopify/collections/route.js`** - Collections API endpoint
4. **`src/app/dashboard/products/page.js`** - Products display page
5. **`src/app/dashboard/categories/page.js`** - Categories display page
6. **`.env`** - Updated with Shopify credentials (needs your values)

## 🚀 How to Use

### Access Products
1. Login to dashboard
2. Click **"Products"** in sidebar
3. View all your Shopify products
4. Use search to filter products
5. Click product links to view in store

### Access Categories
1. Login to dashboard
2. Click on sidebar (or manually go to `/dashboard/categories`)
3. View all your Shopify collections
4. Click collection links to view in store

## 🔍 Testing

### Test Without Shopify
If you don't have Shopify credentials yet:
- The pages will show an error message
- You can still navigate the dashboard
- Error handling is in place

### Test With Shopify
Once configured:
1. Go to `/dashboard/products`
2. Should see all your products
3. Go to `/dashboard/categories`
4. Should see all your collections

## 🎨 UI Features

- **Responsive Design**: Works on mobile, tablet, desktop
- **Search**: Real-time search on products page
- **Loading States**: Spinner while fetching data
- **Error Handling**: Clear error messages with retry
- **Empty States**: Helpful messages when no data
- **Image Fallbacks**: Default icons when no images
- **Status Badges**: Visual indicators for active/draft
- **Hover Effects**: Cards lift on hover
- **Grid Layout**: Responsive grid adapts to screen size

## 📊 Data Displayed

### Products
- Product image
- Product title
- Vendor name
- Price (first variant)
- Variant count
- Status (active/draft)
- Link to store

### Collections
- Collection image (or gradient placeholder)
- Collection title
- Description (truncated)
- Product count
- Status (published/draft)
- Link to store

## 🔐 Security

- ✅ API token stored in environment variables
- ✅ Never exposed to client
- ✅ Server-side API calls only
- ✅ Error details hidden in production
- ✅ Protected dashboard routes

## ⚙️ Customization

### Change Products Per Page
In `src/lib/shopify.js`:
```javascript
const data = await shopifyFetch(`/products.json?limit=250`) // Change 250
```

### Add More Product Fields
In `src/app/dashboard/products/page.js`, access more fields:
- `product.description`
- `product.tags`
- `product.product_type`
- `product.created_at`

### Customize Display
Edit the JSX in:
- `src/app/dashboard/products/page.js`
- `src/app/dashboard/categories/page.js`

## 🐛 Troubleshooting

### Error: "Shopify credentials not configured"
- Check `.env` file has correct values
- Restart the server after updating `.env`

### Error: "401 Unauthorized"
- Your access token is invalid or expired
- Create a new custom app in Shopify
- Get a new access token

### Error: "403 Forbidden"
- Your app doesn't have the required permissions
- Go to Shopify Admin → Apps → Your App
- Add `read_products` and `read_collections` scopes

### No Products Showing
- Check your Shopify store has products
- Verify products are not archived
- Try the refresh button

### Images Not Loading
- Check image URLs in Shopify
- Some products may not have images
- Fallback icons will display

## 📝 Next Steps

1. **Configure Shopify** (add credentials to `.env`)
2. **Restart server**
3. **Test products page**
4. **Test categories page**
5. **Customize the UI** to match your brand
6. **Add more features**:
   - Product details page
   - Category filter on products
   - Inventory management
   - Order management

## 🎉 Ready!

Your Shopify integration is complete! Just add your credentials and restart the server.

Need help? Check the Shopify Admin API documentation:
https://shopify.dev/docs/api/admin-rest






