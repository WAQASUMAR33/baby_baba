"use client"

import { useState, useEffect } from "react"

export default function ProductSyncUtility() {
    const [syncStatus, setSyncStatus] = useState(null)
    const [syncing, setSyncing] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
    const [logs, setLogs] = useState([])
    const [batchSize, setBatchSize] = useState(1000)

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, { timestamp, message, type }])
    }

    const fetchSyncStatus = async () => {
        try {
            const response = await fetch('/api/products/sync')
            const data = await response.json()
            setSyncStatus(data)
            return data
        } catch (error) {
            console.error('Error fetching sync status:', error)
            return null
        }
    }

    const syncAllProducts = async () => {
        setSyncing(true)
        setLogs([])
        addLog('🚀 Starting full product sync...', 'info')

        try {
            // Get initial status
            const status = await fetchSyncStatus()
            if (!status || !status.success) {
                addLog('❌ Failed to get sync status', 'error')
                return
            }

            const totalProducts = status.shopifyProducts
            addLog(`📊 Found ${totalProducts} products in Shopify`, 'info')
            addLog(`📦 Currently have ${status.localProducts} products in local database`, 'info')

            let offset = 0
            let totalSynced = status.localProducts
            let batchNumber = 1

            // Sync in batches
            while (offset < totalProducts) {
                const remainingProducts = totalProducts - offset
                const currentBatchSize = Math.min(batchSize, remainingProducts)

                addLog(`🔄 Batch ${batchNumber}: Syncing products ${offset + 1} to ${offset + currentBatchSize}...`, 'info')

                const response = await fetch(`/api/products/sync?batchSize=${currentBatchSize}&offset=${offset}`, {
                    method: 'POST'
                })

                const result = await response.json()

                if (result.success) {
                    totalSynced += result.imported
                    offset = result.nextOffset

                    const percentage = Math.round((totalSynced / totalProducts) * 100)
                    setProgress({
                        current: totalSynced,
                        total: totalProducts,
                        percentage: percentage
                    })

                    addLog(`✅ Batch ${batchNumber} complete: ${result.imported} products synced (${result.failed} failed)`, 'success')
                    addLog(`📊 Overall Progress: ${totalSynced}/${totalProducts} (${percentage}%)`, 'info')

                    batchNumber++

                    // Check if we're done
                    if (!result.hasMore || offset >= totalProducts) {
                        addLog(`🎉 Sync complete! Total products synced: ${totalSynced}`, 'success')
                        break
                    }

                    // Small delay between batches to avoid overwhelming the server
                    await new Promise(resolve => setTimeout(resolve, 500))
                } else {
                    addLog(`❌ Batch ${batchNumber} failed: ${result.error}`, 'error')
                    break
                }
            }

            // Refresh final status
            await fetchSyncStatus()
        } catch (error) {
            addLog(`❌ Sync error: ${error.message}`, 'error')
        } finally {
            setSyncing(false)
        }
    }

    const syncFullDirect = async () => {
        setSyncing(true)
        setLogs([])
        addLog('🚀 Starting direct full sync (may timeout for large catalogs)...', 'warning')

        try {
            const response = await fetch('/api/products/sync?fullSync=true', {
                method: 'POST'
            })

            const result = await response.json()

            if (result.success) {
                addLog(`✅ Sync complete: ${result.imported} products synced (${result.failed} failed)`, 'success')
                await fetchSyncStatus()
            } else {
                addLog(`❌ Sync failed: ${result.error}`, 'error')
            }
        } catch (error) {
            addLog(`❌ Sync error: ${error.message}`, 'error')
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchSyncStatus()
    }, [])

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Product Sync Utility</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Sync all products from Shopify to your local database
                </p>
            </div>

            {/* Sync Status Card */}
            {syncStatus && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs font-medium text-blue-600 uppercase">Shopify Products</p>
                            <p className="mt-2 text-2xl font-bold text-blue-900">{syncStatus.shopifyProducts?.toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-xs font-medium text-green-600 uppercase">Local Products</p>
                            <p className="mt-2 text-2xl font-bold text-green-900">{syncStatus.localProducts?.toLocaleString()}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-xs font-medium text-purple-600 uppercase">Sync Progress</p>
                            <p className="mt-2 text-2xl font-bold text-purple-900">{syncStatus.syncPercentage}%</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-xs font-medium text-orange-600 uppercase">Remaining</p>
                            <p className="mt-2 text-2xl font-bold text-orange-900">{syncStatus.remaining?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {syncing && progress.total > 0 && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Syncing Progress</span>
                        <span className="text-sm font-semibold text-indigo-600">{progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-600 text-center">
                        {progress.current.toLocaleString()} / {progress.total.toLocaleString()} products
                    </p>
                </div>
            )}

            {/* Control Panel */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Controls</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Batch Size (products per batch)
                    </label>
                    <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        min="100"
                        max="5000"
                        step="100"
                        disabled={syncing}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Recommended: 1000 for large catalogs, 2500 for smaller ones
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={syncAllProducts}
                        disabled={syncing}
                        className={`flex-1 min-w-[200px] inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white ${syncing
                                ? 'bg-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            }`}
                    >
                        {syncing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Syncing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Sync All Products (Batch Mode)
                            </>
                        )}
                    </button>

                    <button
                        onClick={fetchSyncStatus}
                        disabled={syncing}
                        className="px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        Refresh Status
                    </button>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                        <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">For Large Catalogs (14,000+ products)</h3>
                            <p className="mt-1 text-sm text-yellow-700">
                                Use <strong>Batch Mode</strong> to sync products in chunks. This prevents timeout errors and provides real-time progress tracking.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Sync Logs</h2>
                    <button
                        onClick={() => setLogs([])}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Clear Logs
                    </button>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                    {logs.length === 0 ? (
                        <p className="text-gray-500">No logs yet. Start a sync to see progress...</p>
                    ) : (
                        logs.map((log, index) => (
                            <div
                                key={index}
                                className={`mb-1 ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-green-400' :
                                            log.type === 'warning' ? 'text-yellow-400' :
                                                'text-gray-300'
                                    }`}
                            >
                                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
