// Shopify Permission Checker - Runtime validation

/**
 * Check if the app has required permissions by making test API calls
 */

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01'

/**
 * Make a test API call to check permissions
 * @param {string} endpoint - API endpoint to test
 * @returns {Promise<object>} - Result with hasPermission and error
 */
async function testPermission(endpoint) {
  try {
    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    })

    if (response.status === 403) {
      return {
        hasPermission: false,
        error: 'Forbidden - Missing permission',
        status: 403,
      }
    }

    if (response.status === 401) {
      return {
        hasPermission: false,
        error: 'Unauthorized - Invalid token',
        status: 401,
      }
    }

    if (response.ok) {
      return {
        hasPermission: true,
        status: response.status,
      }
    }

    return {
      hasPermission: false,
      error: `HTTP ${response.status}`,
      status: response.status,
    }
  } catch (error) {
    return {
      hasPermission: false,
      error: error.message,
      status: null,
    }
  }
}

export async function checkAllPermissions() {
  const permissions = {
    read_products: await testPermission('/products.json?limit=1'),
    write_products: await testPermission('/products.json'), // Will fail on POST if no permission
    read_collections: await testPermission('/custom_collections.json?limit=1'),
  }

  const summary = {
    allGranted: Object.values(permissions).every(p => p.hasPermission),
    granted: Object.entries(permissions)
      .filter(([_, p]) => p.hasPermission)
      .map(([name]) => name),
    missing: Object.entries(permissions)
      .filter(([_, p]) => !p.hasPermission)
      .map(([name]) => name),
    details: permissions,
  }

  return summary
}

/**
 * Check specific permission
 * @param {string} permission - Permission name
 * @returns {Promise<boolean>} - Whether permission is granted
 */
export async function hasPermission(permission) {
  const endpoints = {
    read_products: '/products.json?limit=1',
    write_products: '/products.json',
    read_collections: '/custom_collections.json?limit=1',
  }

  const endpoint = endpoints[permission]
  if (!endpoint) {
    return false
  }

  const result = await testPermission(endpoint)
  return result.hasPermission
}

/**
 * Get permission requirements for features
 * @returns {object} - Feature to permissions mapping
 */
export function getPermissionRequirements() {
  return {
    'View Products': ['read_products'],
    'Create/Edit Products': ['read_products', 'write_products'],
    'View Categories': ['read_collections'],
  }
}

/**
 * Get instructions for adding permissions
 * @returns {object} - Instructions object
 */
export function getPermissionInstructions() {
  return {
    url: `https://${SHOPIFY_STORE_DOMAIN}/admin/settings/apps/development`,
    steps: [
      'Go to Shopify Admin → Settings → Apps and sales channels',
      'Click "Develop apps"',
      'Click on your app (e.g., "Baby Bazar Dashboard")',
      'Click "Configure" under Admin API',
      'Add the required permissions',
      'Click "Save"',
      'Click "Install app" (or "Reinstall" if already installed)',
      'Restart your development server',
    ],
    requiredPermissions: [
      { name: 'read_products', description: 'View products' },
      { name: 'write_products', description: 'Create and edit products' },
      { name: 'read_collections', description: 'View collections/categories' },
    ],
  }
}

export default {
  checkAllPermissions,
  hasPermission,
  getPermissionRequirements,
  getPermissionInstructions,
}







