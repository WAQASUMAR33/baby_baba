import { withAuth } from "next-auth/middleware"

const middleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
})

export default middleware

export const config = {
  matcher: ["/dashboard/:path*"]
}

