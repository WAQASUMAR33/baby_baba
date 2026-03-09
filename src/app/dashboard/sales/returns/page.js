"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function SaleReturnsPage() {
  const [saleIdInput, setSaleIdInput] = useState("")
  const [sale, setSale] = useState(null)
  const [loadingSale, setLoadingSale] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [returnQuantities, setReturnQuantities] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Return history
  const [returns, setReturns] = useState([])
  const [loadingReturns, setLoadingReturns] = useState(false)

  const fetchReturns = async () => {
    try {
      setLoadingReturns(true)
      const res = await fetch('/api/sales/returns?limit=50')
      const data = await res.json()
      if (data.success) setReturns(data.returns || [])
    } catch {}
    finally { setLoadingReturns(false) }
  }

  useEffect(() => { fetchReturns() }, [])

  // Refund split
  const [cashInput, setCashInput] = useState("")          // what cashier types
  const [cashManuallySet, setCashManuallySet] = useState(false)

  // Customer for ledger
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const saleItems = useMemo(() => Array.isArray(sale?.items) ? sale.items : [], [sale])

  // ── Fetch sale ──────────────────────────────────────────────────────────────
  const fetchSale = async () => {
    const trimmed = saleIdInput.trim()
    if (!trimmed) { setError("Enter a sale ID"); return }
    setError(""); setSuccessMessage(""); setLoadingSale(true)
    setSale(null); setReturnQuantities({})
    setCashInput(""); setCashManuallySet(false)
    setSelectedCustomerId(""); setSelectedCustomerName(""); setSelectedCustomerBalance(null); setCustomerSearch("")

    try {
      const res = await fetch(`/api/sales?limit=1&offset=0&saleId=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load sale")
      const fetchedSale = data.sales?.[0]
      if (!fetchedSale) throw new Error("Sale not found")
      setSale(fetchedSale)
      const qtyState = {}
      ;(fetchedSale.items || []).forEach(item => {
        qtyState[String(item.variantId || item.productId)] = 0
      })
      setReturnQuantities(qtyState)
      // Pre-fill customer if sale has one
      if (fetchedSale.customerId) {
        setSelectedCustomerId(String(fetchedSale.customerId))
        setSelectedCustomerName(fetchedSale.customerName || "")
        setCustomerSearch(fetchedSale.customerName || "")
      }
    } catch (err) {
      setError(err.message || "Failed to load sale")
    } finally {
      setLoadingSale(false)
    }
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  const fetchCustomers = async () => {
    if (customers.length > 0 || loadingCustomers) return
    setLoadingCustomers(true)
    try {
      const res = await fetch("/api/customers")
      const data = await res.json()
      if (data.success) setCustomers(data.customers || [])
    } catch {}
    finally { setLoadingCustomers(false) }
  }

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(term) ||
      (c.phoneNumber || c.phone_number || "").toLowerCase().includes(term)
    )
  }, [customers, customerSearch])

  // ── Return quantities ───────────────────────────────────────────────────────
  const getItemKey = (item) => String(item.variantId || item.productId || item.key)

  const updateReturnQuantity = (item, value) => {
    const key = getItemKey(item)
    const maxQty = parseInt(item.quantity ?? item.soldQty ?? 0) || 0
    const parsed = parseInt(value)
    const clamped = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), maxQty)
    setReturnQuantities(prev => ({ ...prev, [key]: clamped }))
  }
  const incrementReturnQty = (item) => updateReturnQuantity(item, (parseInt(returnQuantities[getItemKey(item)]) || 0) + 1)
  const decrementReturnQty = (item) => updateReturnQuantity(item, (parseInt(returnQuantities[getItemKey(item)]) || 0) - 1)

  const filteredSaleItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return saleItems
    return saleItems.filter(item =>
      (item.title || "").toLowerCase().includes(term) ||
      (item.sku || "").toLowerCase().includes(term)
    )
  }, [saleItems, searchTerm])

  const selectedReturnItems = useMemo(() =>
    saleItems
      .map(item => {
        const qty = parseInt(returnQuantities[String(item.variantId || item.productId)]) || 0
        return { productId: String(item.productId), variantId: String(item.variantId), title: item.title, quantity: qty }
      })
      .filter(i => i.quantity > 0),
    [saleItems, returnQuantities]
  )

  const returnCartItems = useMemo(() =>
    saleItems
      .map(item => {
        const key = String(item.variantId || item.productId)
        const returnQty = parseInt(returnQuantities[key]) || 0
        if (!returnQty) return null
        const soldQty = parseInt(item.quantity || 0)
        const unitPrice = parseFloat(item.price || 0)
        const totalDiscount = parseFloat(item.discount || 0)
        const discountPerUnit = soldQty > 0 ? totalDiscount / soldQty : 0
        const netUnitPrice = Math.max(0, unitPrice - discountPerUnit)
        return { key, title: item.title, sku: item.sku, soldQty, returnQty, unitPrice, totalDiscount, discountPerUnit, netUnitPrice, lineTotal: netUnitPrice * returnQty }
      })
      .filter(Boolean),
    [saleItems, returnQuantities]
  )

  // ── Financial summary ───────────────────────────────────────────────────────
  const paidAmount = useMemo(() => {
    const rcv = parseFloat(sale?.amountReceived || 0)
    const chg = Math.max(0, parseFloat(sale?.change || 0))
    return Math.max(0, rcv - chg)
  }, [sale])

  const saleSubtotal = useMemo(() => {
    const v = parseFloat(sale?.subtotal ?? 0)
    if (v) return v
    return saleItems.reduce((s, i) => s + parseFloat(i.price || 0) * parseInt(i.quantity || 0), 0)
  }, [sale, saleItems])

  const saleDiscount = useMemo(() => parseFloat(sale?.discount ?? 0), [sale])
  const saleTotal = useMemo(() => parseFloat(sale?.total ?? 0), [sale])
  const saleDue = useMemo(() => saleTotal - paidAmount, [saleTotal, paidAmount])

  const returnAmount = useMemo(() =>
    returnCartItems.reduce((s, i) => s + i.lineTotal, 0),
    [returnCartItems]
  )

  // Auto-sync cash input with returnAmount unless cashier manually changed it
  useEffect(() => {
    if (!cashManuallySet) {
      setCashInput(returnAmount > 0 ? returnAmount.toFixed(2) : "")
    }
  }, [returnAmount, cashManuallySet])

  // Derived split amounts
  const cashAmount = useMemo(() => {
    const v = parseFloat(cashInput)
    if (!Number.isFinite(v)) return returnAmount
    return Math.max(0, Math.min(v, returnAmount))
  }, [cashInput, returnAmount])

  const ledgerAmount = useMemo(() =>
    Math.max(0, parseFloat((returnAmount - cashAmount).toFixed(2))),
    [returnAmount, cashAmount]
  )

  // Fetch customers as soon as ledger amount becomes > 0
  useEffect(() => {
    if (ledgerAmount > 0) fetchCustomers()
  }, [ledgerAmount])

  // Look up balance whenever customers load or selected customer changes
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const cust = customers.find(c => String(c.id) === selectedCustomerId)
      if (cust) setSelectedCustomerBalance(parseFloat(cust.balance ?? 0))
    }
  }, [customers, selectedCustomerId])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submitReturn = async () => {
    if (!sale?.id) { setError("Load a sale first"); return }
    if (selectedReturnItems.length === 0) { setError("Select at least one item to return"); return }
    if (ledgerAmount > 0 && !selectedCustomerId) {
      setError("Select a customer to credit the ledger amount to their account")
      return
    }
    setError(""); setSuccessMessage(""); setSubmitting(true)

    try {
      const res = await fetch("/api/sales/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sale.id,
          items: selectedReturnItems,
          cashAmount,
          customerId: ledgerAmount > 0 ? selectedCustomerId : undefined,
          customerName: selectedCustomerName || sale.customerName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to process return")

      const fmt = (n) => `Rs ${parseFloat(n).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`
      let msg = `Return processed.`
      if (data.cashAmount > 0) msg += ` Cash refund: ${fmt(data.cashAmount)}.`
      if (data.ledgerAmount > 0) msg += ` ${fmt(data.ledgerAmount)} credited to ${selectedCustomerName || "customer"}'s ledger.`
      setSuccessMessage(msg)

      // Reset quantities
      const qtyState = {}
      saleItems.forEach(item => { qtyState[String(item.variantId || item.productId)] = 0 })
      setReturnQuantities(qtyState)
      setCashManuallySet(false)
      fetchReturns()
    } catch (err) {
      setError(err.message || "Failed to process return")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!saleIdInput) {
      setSale(null); setError(""); setSuccessMessage("")
      setReturnQuantities({}); setSearchTerm("")
      setCashInput(""); setCashManuallySet(false)
      setSelectedCustomerId(""); setSelectedCustomerName(""); setSelectedCustomerBalance(null); setCustomerSearch("")
    }
  }, [saleIdInput])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sale Returns</h1>
          <p className="mt-2 text-sm text-gray-600">Return items — choose how much cash to return and the rest goes to the customer's ledger</p>
        </div>
        <Link href="/dashboard/sales" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
          Back to Sales
        </Link>
      </div>

      {/* Sale ID input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sale ID</label>
            <input
              type="text"
              value={saleIdInput}
              onChange={(e) => setSaleIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSale()}
              placeholder="Enter sale ID and press Enter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={fetchSale}
            disabled={loadingSale}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {loadingSale ? "Loading…" : "Load Sale"}
          </button>
        </div>
      </div>

      {loadingSale && <div className="mb-6"><LoadingSpinner size="md" text="Loading sale details…" /></div>}
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {successMessage && <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">{successMessage}</div>}

      {sale && (
        <div className="flex flex-col xl:flex-row gap-6">

          {/* ── Left: Sale Items ── */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sale #{sale.id}</h2>
                  <p className="text-sm text-gray-500">
                    {sale.customerName || "Walk-in"} · {new Date(sale.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-900">Total: Rs {parseFloat(sale.total || 0).toLocaleString()}</div>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {saleItems.length === 0 ? (
                <p className="text-sm text-gray-500">No items found.</p>
              ) : filteredSaleItems.length === 0 ? (
                <p className="text-sm text-gray-500">No items match your search.</p>
              ) : (
                filteredSaleItems.map(item => {
                  const key = String(item.variantId || item.productId)
                  const soldQty = parseInt(item.quantity) || 0
                  const selectedQty = parseInt(returnQuantities[key]) || 0
                  return (
                    <div key={key} className="rounded-lg border border-gray-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Sold: {soldQty} · Rs {parseFloat(item.price || 0).toLocaleString()} ea
                          {parseFloat(item.discount) > 0 && ` · Disc: Rs ${parseFloat(item.discount).toLocaleString()}`}
                        </div>
                        {item.sku && <div className="text-xs text-gray-400">SKU: {item.sku}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => decrementReturnQty(item)} disabled={selectedQty === 0}
                          className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 font-bold">−</button>
                        <span className="w-8 text-center text-sm font-semibold">{selectedQty}</span>
                        <button onClick={() => incrementReturnQty(item)} disabled={selectedQty >= soldQty}
                          className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 font-bold">+</button>
                        <button onClick={() => incrementReturnQty(item)} disabled={selectedQty >= soldQty}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
                          Add
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Right: Return Bill ── */}
          <div className="w-full xl:w-[460px] bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">Return Bill</h3>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">

              {/* Sale summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Subtotal", value: saleSubtotal },
                  { label: "Discount", value: saleDiscount },
                  { label: "Total", value: saleTotal },
                  { label: "Paid", value: paidAmount },
                  { label: "Due", value: saleDue },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <div className="text-xs text-gray-500 uppercase">{label}</div>
                    <div className="text-xs font-semibold text-gray-800 mt-0.5">Rs {value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Return cart */}
              {returnCartItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                  No items selected for return
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Net/u</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returnCartItems.map(item => (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{item.title}</div>
                            {item.sku && <div className="text-xs text-gray-400">{item.sku}</div>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => decrementReturnQty(item)} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs">−</button>
                              <input type="number" min="0" max={item.soldQty} value={item.returnQty}
                                onChange={(e) => updateReturnQuantity(item, e.target.value)}
                                className="w-10 text-center text-xs px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button onClick={() => incrementReturnQty(item)} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs">+</button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">Rs {item.netUnitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold">Rs {item.lineTotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-700">Total Refund</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-indigo-700">Rs {returnAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ── Refund Split ─────────────────────────────────────────────── */}
              {returnCartItems.length > 0 && (
                <div className="rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800">Refund Split</p>
                    <span className="text-base font-bold text-indigo-700">
                      Rs {returnAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Cash input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Cash to Return (Rs)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max={returnAmount}
                        step="1"
                        value={cashInput}
                        onChange={(e) => { setCashManuallySet(true); setCashInput(e.target.value) }}
                        placeholder="0.00"
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => { setCashInput(returnAmount.toFixed(2)); setCashManuallySet(false) }}
                        className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 whitespace-nowrap"
                        title="Full cash refund"
                      >
                        All Cash
                      </button>
                      <button
                        onClick={() => { setCashInput("0"); setCashManuallySet(true) }}
                        className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 whitespace-nowrap"
                        title="Add full amount to ledger"
                      >
                        All Ledger
                      </button>
                    </div>
                  </div>

                  {/* Split summary bars */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-3 border-2 transition-colors ${cashAmount > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">💵</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cash</span>
                      </div>
                      <div className={`text-lg font-bold ${cashAmount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                        Rs {cashAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Give to customer</div>
                    </div>
                    <div className={`rounded-xl p-3 border-2 transition-colors ${ledgerAmount > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">📒</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ledger</span>
                      </div>
                      <div className={`text-lg font-bold ${ledgerAmount > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                        Rs {ledgerAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Store credit</div>
                    </div>
                  </div>

                  {/* Validation hint */}
                  {cashAmount + ledgerAmount !== returnAmount && returnAmount > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠ Cash ({cashAmount.toFixed(2)}) + Ledger ({ledgerAmount.toFixed(2)}) ≠ Return ({returnAmount.toFixed(2)})
                    </p>
                  )}

                  {/* Customer picker — only when ledger > 0 */}
                  {ledgerAmount > 0 && (
                    <div className="pt-1 border-t border-indigo-100">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Customer Account <span className="text-red-500">*</span>
                        <span className="ml-1 font-normal text-gray-400">(required for ledger credit)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value)
                            setSelectedCustomerId("")
                            setSelectedCustomerName("")
                            setSelectedCustomerBalance(null)
                            setShowCustomerDropdown(true)
                          }}
                          onFocus={() => { setShowCustomerDropdown(true); fetchCustomers() }}
                          onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                          placeholder="Search by name or phone…"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selectedCustomerId ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white'}`}
                        />
                        {showCustomerDropdown && (
                          <div className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                            {loadingCustomers ? (
                              <div className="px-4 py-3 text-sm text-gray-500">Loading customers…</div>
                            ) : filteredCustomers.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500">No customers found</div>
                            ) : (
                              filteredCustomers.map(c => (
                                <button key={c.id} type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setSelectedCustomerId(String(c.id))
                                    setSelectedCustomerName(c.name || "")
                                    setSelectedCustomerBalance(parseFloat(c.balance ?? 0))
                                    const phone = c.phoneNumber || c.phone_number || ""
                                    setCustomerSearch(`${c.name}${phone ? ` (${phone})` : ""}`)
                                    setShowCustomerDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                                >
                                  <span className="font-medium text-gray-900">{c.name}</span>
                                  {(c.phoneNumber || c.phone_number) && (
                                    <span className="ml-2 text-xs text-gray-400">({c.phoneNumber || c.phone_number})</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {selectedCustomerId ? (
                        <div className="mt-2 text-xs bg-indigo-50 rounded-lg px-3 py-2 space-y-0.5">
                          <div className="flex items-center gap-2 text-indigo-700 font-medium">
                            <span>✓</span>
                            <span>
                              <strong>Rs {ledgerAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</strong>
                              {" "}will be credited to <strong>{selectedCustomerName}</strong>'s account
                            </span>
                          </div>
                          {selectedCustomerBalance !== null && (
                            <div className={`pl-5 font-semibold ${
                              selectedCustomerBalance > 0 ? 'text-red-600' :
                              selectedCustomerBalance < 0 ? 'text-green-600' :
                              'text-gray-500'
                            }`}>
                              Current balance:{' '}
                              {selectedCustomerBalance > 0
                                ? `Rs ${parseFloat(selectedCustomerBalance).toLocaleString('en-PK', { minimumFractionDigits: 2 })} due`
                                : selectedCustomerBalance < 0
                                  ? `Rs ${Math.abs(parseFloat(selectedCustomerBalance)).toLocaleString('en-PK', { minimumFractionDigits: 2 })} credit`
                                  : 'No outstanding balance'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-red-500">Select a customer to apply ledger credit</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-500">
                {selectedReturnItems.length} item{selectedReturnItems.length !== 1 ? "s" : ""} · Refund Rs {returnAmount.toLocaleString()}
              </div>
              <button
                onClick={submitReturn}
                disabled={
                  submitting ||
                  selectedReturnItems.length === 0 ||
                  (ledgerAmount > 0 && !selectedCustomerId)
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    {cashAmount > 0 && ledgerAmount > 0
                      ? "Process Return (Split)"
                      : ledgerAmount > 0
                        ? "Credit to Ledger"
                        : "Process Cash Refund"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return History ── */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Return History</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loadingReturns ? (
            <div className="p-10 text-center"><LoadingSpinner size="md" text="Loading history…" /></div>
          ) : returns.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No returns recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Return #', 'Sale #', 'Date & Time', 'Employee', 'Customer', 'Items', 'Cash Refund', 'Ledger Credit', 'Total Refund'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map(ret => (
                    <tr key={ret.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">#{ret.id}</td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">#{ret.saleId}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{ret.employeeName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{ret.customerName || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs">
                        {Array.isArray(ret.items) && ret.items.length > 0
                          ? ret.items.map(i => `${i.title} ×${i.quantity}`).join(', ')
                          : <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-700 whitespace-nowrap">
                        {parseFloat(ret.cashAmount) > 0 ? `Rs ${parseFloat(ret.cashAmount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-700 whitespace-nowrap">
                        {parseFloat(ret.ledgerAmount) > 0 ? `Rs ${parseFloat(ret.ledgerAmount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">
                        Rs {parseFloat(ret.returnAmount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
