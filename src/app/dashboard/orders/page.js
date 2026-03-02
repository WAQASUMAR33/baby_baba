"use client"

import { Suspense } from "react"
import { Box, Typography } from "@mui/material"
import { EnhancedPOSPage } from "@/app/dashboard/sales/create/page"

export default function OrdersPage() {
  return (
    <Box sx={{ p: { xs: 3, lg: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Orders
        </Typography>
      </Box>
      <Suspense fallback={<div className="text-gray-500 p-4">Loading...</div>}>
        <EnhancedPOSPage mode="order" />
      </Suspense>
    </Box>
  )
}
