"use client"

import { SessionProvider } from "next-auth/react"
import ErrorBoundary from "./error-boundary"

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  )
}






