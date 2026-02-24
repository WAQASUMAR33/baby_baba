"use client"

import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { EnhancedPOSPage } from "@/app/dashboard/sales/create/page"

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [convertingId, setConvertingId] = useState(null)

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      const params = new URLSearchParams()
      params.append("status", "order")
      params.append("limit", "100")
      params.append("offset", "0")
      const response = await fetch(`/api/sales?${params}`)
      const data = await response.json()
      if (data.success) {
        setOrders(data.sales || [])
      } else {
        toast.error(data.error || "Failed to load orders")
      }
    } catch (error) {
      toast.error(error.message || "Failed to load orders")
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const convertOrder = async (orderId) => {
    try {
      setConvertingId(orderId)
      const response = await fetch("/api/orders/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to convert order")
      }
      toast.success(`Order #${orderId} converted to sale`)
      await fetchOrders()
    } catch (error) {
      toast.error(error.message || "Failed to convert order")
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <Box sx={{ p: { xs: 3, lg: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Orders
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <EnhancedPOSPage mode="order" />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Booked Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orders.length} pending
            </Typography>
          </Box>
          <Button variant="outlined" onClick={fetchOrders} disabled={loadingOrders}>
            Refresh
          </Button>
        </Box>

        {loadingOrders ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Loading orders...
            </Typography>
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No booked orders found.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>#{order.id}</TableCell>
                    <TableCell>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </TableCell>
                    <TableCell>{order.customerName || "Walk-in"}</TableCell>
                    <TableCell>{order.items?.length || 0}</TableCell>
                    <TableCell>
                      {parseFloat(order.total || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Chip label={order.status || "order"} size="small" color="warning" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => convertOrder(order.id)}
                        disabled={convertingId === order.id}
                      >
                        {convertingId === order.id ? "Converting..." : "Convert to Sale"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
