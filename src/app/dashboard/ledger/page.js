"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Box,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"

export default function LedgerPage() {
  const { data: session } = useSession()
  const [ledger, setLedger] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    customerId: "",
    referenceType: "",
    startDate: "",
    endDate: "",
  })
  const [searchTerm, setSearchTerm] = useState("")

  // New ledger entry form
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryForm, setEntryForm] = useState({ customerId: "", amount: "", type: "debit", description: "" })
  const [submittingEntry, setSubmittingEntry] = useState(false)
  const [entryError, setEntryError] = useState("")

  const formatCurrency = (value) =>
    `Rs ${parseFloat(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers || [])
      }
    } catch (error) {
      setCustomers([])
    }
  }

  const fetchLedger = async (activeFilters) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("limit", "200")
      params.set("offset", "0")
      if (activeFilters.customerId) params.set("customerId", activeFilters.customerId)
      if (activeFilters.referenceType) params.set("referenceType", activeFilters.referenceType)
      if (activeFilters.startDate) params.set("startDate", activeFilters.startDate)
      if (activeFilters.endDate) params.set("endDate", activeFilters.endDate)

      const response = await fetch(`/api/ledger?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setLedger(data.ledger || [])
      } else {
        setLedger([])
      }
    } catch (error) {
      setLedger([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchLedger(filters)
  }, [])

  useEffect(() => {
    fetchLedger(filters)
  }, [filters])

  const handleSubmitEntry = async (e) => {
    e.preventDefault()
    if (!entryForm.customerId || !entryForm.amount) {
      setEntryError("Customer and amount are required")
      return
    }
    setEntryError("")
    setSubmittingEntry(true)
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(entryForm.customerId),
          amount: parseFloat(entryForm.amount),
          type: entryForm.type,
          description: entryForm.description,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create entry")
      setShowEntryModal(false)
      setEntryForm({ customerId: "", amount: "", type: "debit", description: "" })
      fetchLedger(filters)
    } catch (err) {
      setEntryError(err.message)
    } finally {
      setSubmittingEntry(false)
    }
  }

  const filteredLedger = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return ledger
    return ledger.filter((entry) => {
      const customerName = (entry.customerName || "").toLowerCase()
      const customerPhone = (entry.customerPhone || "").toLowerCase()
      const referenceId = String(entry.referenceId || "").toLowerCase()
      const referenceType = (entry.referenceType || "").toLowerCase()
      return (
        customerName.includes(term) ||
        customerPhone.includes(term) ||
        referenceId.includes(term) ||
        referenceType.includes(term)
      )
    })
  }, [ledger, searchTerm])

  if (loading && ledger.length === 0) {
    return (
      <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Loading ledger...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 3, lg: 4 }, bgcolor: "grey.50", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, justifyContent: "space-between", gap: 2, mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              Customer Ledger
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              View customer debit, credit, and balances.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {session?.user?.name || session?.user?.email}
            </Typography>
            <button
              onClick={() => { setShowEntryModal(true); setEntryError("") }}
              style={{ padding: "8px 16px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
            >
              + New Entry
            </button>
          </Box>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="ledger-customer-label">Customer</InputLabel>
                <Select
                  labelId="ledger-customer-label"
                  label="Customer"
                  value={filters.customerId}
                  onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
                >
                  <MenuItem value="">All Customers</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="ledger-reference-label">Reference Type</InputLabel>
                <Select
                  labelId="ledger-reference-label"
                  label="Reference Type"
                  value={filters.referenceType}
                  onChange={(e) => setFilters({ ...filters, referenceType: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="sale">Sale</MenuItem>
                  <MenuItem value="order">Order</MenuItem>
                  <MenuItem value="sale-payment">Sale Payment</MenuItem>
                  <MenuItem value="order-payment">Order Payment</MenuItem>
                  <MenuItem value="sale-return">Sale Return</MenuItem>
                  <MenuItem value="order-return">Order Return</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, phone, or reference"
              />
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell align="right">Pre Balance</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Credit</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLedger.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{entry.id || "N/A"}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {entry.customerName || "N/A"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.customerPhone || ""}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {entry.referenceType ? `${entry.referenceType} #${entry.referenceId || ""}` : "N/A"}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(entry.preBalance)}</TableCell>
                  <TableCell align="right">{formatCurrency(entry.debit)}</TableCell>
                  <TableCell align="right">{formatCurrency(entry.credit)}</TableCell>
                  <TableCell align="right">{formatCurrency(entry.balance)}</TableCell>
                </TableRow>
              ))}
              {!loading && filteredLedger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No ledger entries found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* New Ledger Entry Modal */}
      {showEntryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>New Ledger Entry</h2>
              <button onClick={() => setShowEntryModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#6b7280" }}>✕</button>
            </div>
            {entryError && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>{entryError}</div>}
            <form onSubmit={handleSubmitEntry} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Customer *</label>
                <select
                  required
                  value={entryForm.customerId}
                  onChange={(e) => setEntryForm({ ...entryForm, customerId: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Entry Type *</label>
                <select
                  value={entryForm.type}
                  onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
                >
                  <option value="debit">Debit (customer owes)</option>
                  <option value="credit">Credit (customer paid / return)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Amount (Rs) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Description (optional)</label>
                <input
                  type="text"
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder="e.g. Manual adjustment, opening balance..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
                <button type="button" onClick={() => setShowEntryModal(false)} style={{ flex: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>Cancel</button>
                <button type="submit" disabled={submittingEntry} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#4f46e5", color: "white", cursor: submittingEntry ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", opacity: submittingEntry ? 0.6 : 1 }}>
                  {submittingEntry ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Box>
  )
}
