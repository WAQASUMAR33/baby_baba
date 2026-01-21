"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "react-hot-toast"
import ErrorBoundary from "./error-boundary"

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        <Toaster position="top-right" />
        {children}
      </SessionProvider>
    </ErrorBoundary>
  )
}






