// Test script to create a product via API
// Run: node scripts/test-create-product.js

const http = require('http');

// Sample product data
const productData = {
  // Basic Information
  title: "Test Baby Cotton Onesie",
  description: "Soft and comfortable cotton onesie for babies. Perfect for everyday wear. Made from 100% organic cotton.",
  
  // Pricing
  price: "24.99",
  compare_at_price: "34.99",
  cost_per_item: "12.00",
  
  // Inventory
  sku: "BB-TEST-001",
  barcode: "123456789012",
  track_quantity: true,
  inventory_quantity: "50",
  continue_selling: false,
  
  // Shipping
  weight: "0.3",
  weight_unit: "kg",
  requires_shipping: true,
  
  // Product Organization
  product_type: "Baby & Toddler",
  vendor: "Baby Baba",
  tags: "baby, cotton, onesie, organic, comfortable",
  
  // SEO
  seo_title: "Organic Baby Cotton Onesie - Soft & Comfortable",
  seo_description: "Premium quality baby onesie made from 100% organic cotton. Soft, breathable, and perfect for your little one.",
  
  // Status
  status: "active",
};

// Prepare the POST request
const postData = JSON.stringify(productData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/shopify/products/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('🧪 Testing Product Creation API...\n');
console.log('📦 Product Data:');
console.log('   Title:', productData.title);
console.log('   Price: Rs ' + productData.price);
console.log('   SKU:', productData.sku);
console.log('   Status:', productData.status);
console.log('\n🔄 Sending request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('\n⏳ Please wait...\n');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);
    console.log('─'.repeat(50));
    
    try {
      const result = JSON.parse(responseData);
      
      if (result.success) {
        console.log('✅ SUCCESS! Product created successfully!\n');
        console.log('📦 Product Details:');
        console.log('   ID:', result.product.id);
        console.log('   Title:', result.product.title);
        console.log('   Status:', result.product.status);
        console.log('   Vendor:', result.product.vendor);
        console.log('   Product Type:', result.product.product_type);
        
        if (result.product.variants && result.product.variants.length > 0) {
          const variant = result.product.variants[0];
          console.log('\n💰 Pricing:');
          console.log('   Price: Rs ' + variant.price);
          console.log('   SKU:', variant.sku);
          console.log('   Inventory:', variant.inventory_quantity);
        }
        
        console.log('\n🔗 View in Shopify Admin:');
        console.log('   https://babybazar-pk.myshopify.com/admin/products/' + result.product.id);
        
      } else {
        console.log('❌ FAILED! Product creation failed.\n');
        console.log('Error:', result.error);
        if (result.details) {
          console.log('\nDetails:', result.details);
        }
      }
      
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', responseData);
    }
    
    console.log('\n' + '─'.repeat(50));
  });
});

req.on('error', (error) => {
  console.log('❌ Request Error:', error.message);
  console.log('\n💡 Make sure your development server is running:');
  console.log('   npm run dev');
});

req.write(postData);
req.end();

