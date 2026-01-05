import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { findUserByEmail } from "@/lib/db"

// Get secret from environment or use fallback
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'vAyWrNiJupbyfq7fGtNJsSRM3SwzHcKsu435xHL6yWA='
// For Vercel, use VERCEL_URL if NEXTAUTH_URL is not set
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

// Validate secret is set
if (!NEXTAUTH_SECRET || NEXTAUTH_SECRET.length < 32) {
  console.error('⚠️  WARNING: NEXTAUTH_SECRET is not properly set!')
}

// Log configuration (without sensitive data)
if (process.env.NODE_ENV === 'development') {
  console.log('NextAuth Config:', {
    hasSecret: !!NEXTAUTH_SECRET,
    secretLength: NEXTAUTH_SECRET?.length,
    url: NEXTAUTH_URL,
    vercelUrl: process.env.VERCEL_URL
  })
}

// Export authOptions for use in other API routes
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials")
            return null
          }

          const email = credentials.email.trim().toLowerCase()
          const password = credentials.password

          // Use direct SQL for reliable authentication
          const user = await findUserByEmail(email)

          if (!user) {
            console.log("User not found:", email)
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            console.log("Invalid password for user:", email)
            return null
          }

          console.log("Login successful for user:", email)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || user.email,
          }
        } catch (error) {
          console.error("Login error:", error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
      }
      return session
    },
  },
  secret: NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  trustHost: true, // Required for Next.js 16+ and Vercel
  // Ensure proper URL handling for Vercel
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
}

// Use direct SQL for authentication (more reliable than Prisma with adapter)
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

