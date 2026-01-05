import { NextResponse } from 'next/server'
import { checkAllPermissions, getPermissionRequirements, getPermissionInstructions } from '@/lib/shopify-permissions'

/**
 * GET /api/shopify/permissions
 * Check current Shopify API permissions
 */
export async function GET(request) {
  try {
    console.log('Checking Shopify permissions...')
    
    const permissionStatus = await checkAllPermissions()
    const requirements = getPermissionRequirements()
    const instructions = getPermissionInstructions()

    return NextResponse.json({
      success: true,
      permissions: permissionStatus,
      requirements,
      instructions,
      configured: permissionStatus.allGranted,
    })
  } catch (error) {
    console.error('Error checking permissions:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check permissions',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}






