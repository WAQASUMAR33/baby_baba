"use client"

import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function SettingsPage() {
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      setChecking(true)
      const response = await fetch('/api/shopify/permissions')
      const data = await response.json()

      if (data.success) {
        setPermissions(data)
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your Shopify integration and API permissions
        </p>
      </div>

      {/* Shopify Configuration Status */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Shopify Connection</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Store Domain</p>
                <p className="text-sm text-gray-500">{process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'Not configured'}</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">API Version</p>
                <p className="text-sm text-gray-500">{process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2024-01'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Access Token</p>
                <p className="text-sm text-gray-500">••••••••••••••••</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Configured
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Status */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Permissions</h2>
            <p className="text-sm text-gray-500 mt-1">Runtime permission check</p>
          </div>
          <button
            onClick={checkPermissions}
            disabled={checking}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {checking ? 'Checking...' : 'Recheck'}
          </button>
        </div>
        <div className="p-6">
          {permissions ? (
            <>
              {/* Overall Status */}
              <div className={`mb-6 p-4 rounded-lg ${permissions.permissions.allGranted ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex">
                  {permissions.permissions.allGranted ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${permissions.permissions.allGranted ? 'text-green-800' : 'text-yellow-800'}`}>
                      {permissions.permissions.allGranted ? 'All Permissions Granted' : 'Some Permissions Missing'}
                    </h3>
                    <p className={`text-sm mt-1 ${permissions.permissions.allGranted ? 'text-green-700' : 'text-yellow-700'}`}>
                      {permissions.permissions.allGranted
                        ? 'Your app has all required permissions to function properly.'
                        : `Missing ${permissions.permissions.missing.length} permission(s). Some features may not work.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Permission Details */}
              <div className="space-y-3">
                {permissions.instructions.requiredPermissions.map((perm) => {
                  const hasIt = permissions.permissions.granted.includes(perm.name)
                  return (
                    <div key={perm.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        {hasIt ? (
                          <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hasIt ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {hasIt ? 'Granted' : 'Missing'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Instructions if missing permissions */}
              {!permissions.permissions.allGranted && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">How to Add Missing Permissions:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    {permissions.instructions.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                  <div className="mt-4">
                    <a
                      href={permissions.instructions.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Open Shopify Settings
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Click &quot;Recheck&quot; to verify permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature Requirements */}
      {permissions && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Feature Requirements</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(permissions.requirements).map(([feature, perms]) => {
                const allGranted = perms.every(p => permissions.permissions.granted.includes(p))
                return (
                  <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{feature}</p>
                      <p className="text-xs text-gray-500">Requires: {perms.join(', ')}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${allGranted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {allGranted ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




