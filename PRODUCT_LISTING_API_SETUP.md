# 🛍️ Shopify Product Listing API Integration

## ✅ What's New

Your dashboard now supports **both** Shopify APIs:

### 1. **Admin Products API** (existing)
- Manage all products (draft, active, archived)
- Full CRUD operations
- Access: `/dashboard/products`

### 2. **Product Listing API** (new)
- View products published to your sales channel
- Lightweight API for published products only
- Access: `/dashboard/listings`

## 🔑 Update Shopify Permissions

To use the Product Listing API, you need additional permissions:

### Steps:

1. **Go to Shopify Admin**:
   ```
   https://babybazar-pk.myshopify.com/admin/settings/apps/development
   ```

2. **Click** on your app (`Baby Baba Dashboard`)

3. **Click** "Configure" under Admin API

4. **Add these permissions**:
   - ✅ `read_products` (you have this)
   - ✅ `write_products` (you have this)
   - ✅ `read_collections` (you have this)
   - ✅ `read_product_listings` ⬅️ **ADD THIS**
   - ✅ `write_product_listings` ⬅️ **ADD THIS** (optional, for publishing)

5. **Save** and **Reinstall** the app

6. **Restart your server**:
   ```bash
   # Press Ctrl+C
   npm run dev
   ```

## 📋 New Features

### 1. **Product Listings Page** (`/dashboard/listings`)
- View all published products
- See products available in your sales channels
- Cleaner, focused view of active listings
- Real-time sync with Shopify

### 2. **Auto-Publish on Create**
- When you create a product with status "Active"
- It's automatically published to your sales channel
- Appears in both Products and Listings pages

### 3. **New API Endpoints**

#### Get Product Listings
```
GET /api/shopify/listings
```
Returns all products published to your sales channel

#### Publish Product
```
POST /api/shopify/listings/publish
Body: { "product_id": 123 }
```
Publishes a product to your sales channel

### 4. **New Sidebar Link**
- **"Listings"** added between Products and Categories
- Direct access to published products

## 🎯 What's the Difference?

### Products Page (`/dashboard/products`)
- **All products** (draft, active, archived)
- Full management capabilities
- Uses **Admin Products API**
- For internal product management

### Listings Page (`/dashboard/listings`)
- **Only published products**
- Read-only view
- Uses **Product Listing API**
- Shows what customers see
- Optimized for sales channels

## 📁 New Files Created

1. **`src/lib/shopify-listings.js`** - Product Listing API helpers
2. **`src/app/api/shopify/listings/route.js`** - Get listings endpoint
3. **`src/app/api/shopify/listings/publish/route.js`** - Publish product endpoint
4. **`src/app/dashboard/listings/page.js`** - Listings display page

## 🔄 Updated Files

1. **`src/app/api/shopify/products/create/route.js`** - Auto-publish active products
2. **`src/app/dashboard/layout.js`** - Added Listings link in sidebar

## 🎨 UI Features

### Listings Page:
- ✅ Grid layout with product cards
- ✅ Product images
- ✅ Price display
- ✅ "Published" badge
- ✅ Refresh button
- ✅ Info banner explaining Product Listing API
- ✅ Empty state message
- ✅ Error handling

## 📊 How It Works

### Creating a Product:

1. **User creates product** via "Add Product" form
2. **Status = Draft**: Product created, NOT published
3. **Status = Active**: Product created AND published to sales channel
4. **Product appears in**:
   - Products page (always)
   - Listings page (only if published)

### Workflow:

```
Create Product (Active)
  ↓
Admin Products API creates product
  ↓
Product Listing API publishes it
  ↓
Appears in both Products & Listings
```

## 🧪 Testing

### Test Product Listings:

1. **Update permissions** (see steps above)
2. **Restart server**
3. **Go to**: `http://localhost:3000/dashboard/listings`
4. **You should see**: All your published products

### Test Auto-Publish:

1. **Go to**: `http://localhost:3000/dashboard/products/add`
2. **Create product** with Status = "Active"
3. **Check**:
   - `/dashboard/products` - product is there ✅
   - `/dashboard/listings` - product is there ✅

### Test Draft Product:

1. **Create product** with Status = "Draft"
2. **Check**:
   - `/dashboard/products` - product is there ✅
   - `/dashboard/listings` - product NOT there ✅

## 🔧 API Functions Available

### From `shopify-listings.js`:

```javascript
// Get all product listings
getProductListings(params)

// Get specific product listing
getProductListing(productListingId)

// Get product IDs
getProductListingIds(params)

// Get count
getProductListingCount()

// Publish product
createProductListing(productId, body)

// Unpublish product
deleteProductListing(productId)

// Get collection listings
getCollectionListings(params)
```

## 🎁 Benefits

### Why Use Product Listing API?

1. **Performance**: Lighter API, faster responses
2. **Focused**: Only published products
3. **Sales Channel Ready**: See exactly what customers see
4. **Multiple Channels**: Manage products across different channels
5. **Separation**: Keep draft work separate from published products

## 🚀 Next Steps

After updating permissions:

1. ✅ Check `/dashboard/listings` works
2. ✅ Create a test product (active status)
3. ✅ Verify it appears in both pages
4. ✅ Create a draft product
5. ✅ Verify it only appears in Products page

## 🆘 Troubleshooting

### "Missing permissions" error
- Make sure you added `read_product_listings` permission
- Reinstalled the app
- Restarted the server

### No listings showing
- Make sure you have products with status = "active"
- Draft products won't appear in listings
- Check Shopify admin to confirm products are published

### 403 Forbidden
- App needs `read_product_listings` permission
- Go back to Shopify and add the permission

---

**Ready to test!** Update your permissions and check out the new Listings page! 🎉






