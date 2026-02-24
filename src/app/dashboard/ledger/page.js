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
          <Typography variant="body2" color="text.secondary">
            {session?.user?.name || session?.user?.email}
          </Typography>
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
    </Box>
  )
}
