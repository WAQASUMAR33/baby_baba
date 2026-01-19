// Test script to create multiple products
// Run: node scripts/test-multiple-products.js

const http = require('http');

// Sample products
const testProducts = [
  {
    title: "Baby Cotton T-Shirt",
    description: "Soft cotton t-shirt for babies",
    price: "15.99",
    sku: "BB-TSHIRT-001",
    inventory_quantity: "100",
    product_type: "Baby & Toddler",
    vendor: "Baby Baba",
    tags: "baby, cotton, t-shirt",
    status: "active",
  },
  {
    title: "Toddler Denim Jeans",
    description: "Comfortable denim jeans for toddlers",
    price: "29.99",
    compare_at_price: "39.99",
    sku: "BB-JEANS-001",
    inventory_quantity: "75",
    product_type: "Baby & Toddler",
    vendor: "Baby Baba",
    tags: "toddler, denim, jeans, pants",
    status: "active",
  },
  {
    title: "Baby Soft Blanket",
    description: "Ultra-soft fleece blanket for babies",
    price: "34.99",
    sku: "BB-BLANKET-001",
    inventory_quantity: "50",
    product_type: "Baby & Toddler",
    vendor: "Baby Baba",
    tags: "baby, blanket, soft, fleece",
    status: "draft",
  },
  {
    title: "Baby Bath Towel Set",
    description: "Set of 3 absorbent bath towels",
    price: "24.99",
    sku: "BB-TOWEL-SET-001",
    inventory_quantity: "60",
    product_type: "Baby & Toddler",
    vendor: "Baby Baba",
    tags: "baby, towel, bath, set",
    status: "active",
  },
  {
    title: "Baby Organic Body Lotion",
    description: "Natural and organic body lotion for sensitive baby skin",
    price: "18.99",
    sku: "BB-LOTION-001",
    inventory_quantity: "150",
    product_type: "Health & Beauty",
    vendor: "Baby Baba",
    tags: "baby, lotion, organic, skincare",
    status: "active",
  },
];

let successCount = 0;
let failCount = 0;

function createProduct(productData, index) {
  return new Promise((resolve) => {
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

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (result.success) {
            successCount++;
            console.log(`✅ [${index + 1}/${testProducts.length}] Created: "${productData.title}" (ID: ${result.product.id})`);
          } else {
            failCount++;
            console.log(`❌ [${index + 1}/${testProducts.length}] Failed: "${productData.title}" - ${result.error}`);
          }
          
        } catch (error) {
          failCount++;
          console.log(`❌ [${index + 1}/${testProducts.length}] Error: "${productData.title}" - ${error.message}`);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      failCount++;
      console.log(`❌ [${index + 1}/${testProducts.length}] Request Error: "${productData.title}" - ${error.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function createAllProducts() {
  console.log('🧪 Testing Multiple Product Creation\n');
  console.log(`📦 Creating ${testProducts.length} test products...\n`);
  console.log('─'.repeat(50));

  for (let i = 0; i < testProducts.length; i++) {
    await createProduct(testProducts[i], i);
    // Wait 1 second between requests to avoid rate limiting
    if (i < testProducts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('─'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${testProducts.length}`);
  console.log('\n🔗 View products in Shopify Admin:');
  console.log('   https://babybazar-pk.myshopify.com/admin/products');
  console.log('\n🔗 Or in your dashboard:');
  console.log('   http://localhost:3000/dashboard/products');
}

createAllProducts();







