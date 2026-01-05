"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  
  // Hooks must be called unconditionally
  const sessionData = useSession()
  const router = useRouter()

  // Safely destructure session data
  const session = sessionData?.data
  const status = sessionData?.status || "loading"

  useEffect(() => {
    // Use setTimeout to make setState asynchronous
    setTimeout(() => {
      setMounted(true)
    }, 0)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    try {
      if (status === "authenticated") {
        router.push("/dashboard")
      } else if (status === "unauthenticated") {
        router.push("/login")
      }
    } catch (err) {
      console.error("Error in navigation:", err)
      // Fallback to window.location if router fails
      if (typeof window !== "undefined") {
        if (status === "authenticated") {
          window.location.href = "/dashboard"
        } else if (status === "unauthenticated") {
          window.location.href = "/login"
        }
      }
    }
  }, [status, router, mounted])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  )
}
