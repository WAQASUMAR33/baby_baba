"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Home() {
  const sessionData = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Safely destructure session data
  const session = sessionData?.data
  const status = sessionData?.status || "loading"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    if (status === "authenticated") {
      router.push("/dashboard")
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router, mounted])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  )
}
