# Product Sync Guide for 14,000+ Products

## Overview
This guide explains how to sync all 14,000 products from Shopify to your local database without timeout issues.

## New Features Added

### 1. Advanced Sync Utility Page
**Location**: `/dashboard/sync-products`

A dedicated page for syncing large product catalogs with:
- **Batch Processing**: Syncs products in configurable chunks (default: 1000 products per batch)
- **Real-time Progress Tracking**: Visual progress bar and percentage
- **Detailed Logging**: See exactly what's happening during the sync
- **Status Dashboard**: View Shopify vs Local product counts
- **No Timeout Issues**: Processes in manageable batches to avoid serverless function timeouts

### 2. Enhanced API Endpoints

#### POST `/api/products/sync`
**Query Parameters**:
- `batchSize` (optional): Number of products to sync in this batch (default: 1000)
- `offset` (optional): Starting offset for pagination (default: 0)
- `fullSync` (optional): If true, syncs all products in one go (default: false)

**Examples**:
```bash
# Sync first 1000 products
POST /api/products/sync?batchSize=1000&offset=0

# Sync next 1000 products
POST /api/products/sync?batchSize=1000&offset=1000

# Full sync (may timeout for large catalogs)
POST /api/products/sync?fullSync=true
```

#### GET `/api/products/sync`
Returns current sync status:
```json
{
  "success": true,
  "shopifyProducts": 14000,
  "localProducts": 5000,
  "syncPercentage": 36,
  "remaining": 9000
}
```

## How to Sync 14,000 Products

### Method 1: Using the Advanced Sync Utility (Recommended)

1. Navigate to `/dashboard/sync-products` in your browser
2. Review the current sync status
3. Set your preferred batch size (recommended: 1000 for 14K products)
4. Click "Sync All Products (Batch Mode)"
5. Watch the progress in real-time
6. The sync will automatically process all products in batches

**Advantages**:
- ✅ No timeout issues
- ✅ Real-time progress tracking
- ✅ Detailed logs
- ✅ Can pause and resume (by refreshing status)
- ✅ Handles errors gracefully

### Method 2: Using the Quick Sync Button

1. Go to `/dashboard/products`
2. Click "Quick Sync" button
3. This will attempt to sync up to 50,000 products in one go
4. **Warning**: May timeout if it takes longer than 60 seconds

**Use this for**:
- Small incremental syncs
- Testing
- When you have fewer products

### Method 3: Programmatic Sync (Advanced)

You can create a script to sync products programmatically:

```javascript
async function syncAllProducts() {
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const response = await fetch(
      `/api/products/sync?batchSize=${batchSize}&offset=${offset}`,
      { method: 'POST' }
    )
    
    const result = await response.json()
    
    if (result.success) {
      console.log(`Synced ${result.imported} products`)
      offset = result.nextOffset
      hasMore = result.hasMore
    } else {
      console.error('Sync failed:', result.error)
      break
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}
```

## Performance Estimates

For **14,000 products**:
- **Batch Size: 1000** → ~14 batches → ~7-10 minutes total
- **Batch Size: 2000** → ~7 batches → ~5-7 minutes total
- **Batch Size: 500** → ~28 batches → ~10-15 minutes total

Each batch takes approximately 30-45 seconds depending on:
- Product complexity (variants, images, etc.)
- Database performance
- Network speed

## Troubleshooting

### Sync Stops or Fails
1. Check the logs in the Advanced Sync Utility
2. Verify your Shopify API credentials are correct
3. Check database connection
4. Try reducing batch size to 500

### Timeout Errors
- Use the Advanced Sync Utility instead of Quick Sync
- Reduce batch size
- Check server logs for specific errors

### Incomplete Sync
1. Go to `/dashboard/sync-products`
2. Check the sync status
3. Click "Sync All Products" again - it will continue from where it left off

## Technical Details

### Database Schema
Products are stored in two tables:
- `Product`: Main product information
- `ProductVariant`: Product variants with pricing and inventory

### Sync Process
1. Fetch products from Shopify API (250 per API call)
2. Process in batches of configurable size
3. Upsert each product and its variants to database
4. Track progress and handle errors
5. Return summary with counts

### API Rate Limits
Shopify has rate limits:
- REST API: 2 requests/second (burst: 40 requests)
- The sync includes small delays to respect these limits

## Best Practices

1. **First Sync**: Use batch size of 1000 via Advanced Sync Utility
2. **Regular Updates**: Use Quick Sync for incremental updates
3. **Monitor Progress**: Keep the Advanced Sync Utility page open to watch logs
4. **Off-Peak Hours**: Run large syncs during off-peak hours
5. **Backup First**: Consider backing up your database before first sync

## Access the Advanced Sync Utility

Navigate to: **`/dashboard/sync-products`**

Or from the Products page, click the **"Advanced Sync"** button in the header.
