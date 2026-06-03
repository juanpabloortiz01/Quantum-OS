import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Google({
      id: "google-calendar",
      name: "Google Calendar",
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),



    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = String(credentials.email).toLowerCase().trim()
        const password = String(credentials.password)
        if (!isValidEmail(email)) return null
        if (password.length < 8) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null
        return user
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/onboarding" },
  callbacks: {
    async signIn({ account, user }) {
      if (account && account.provider === "google-calendar") {
        const updateData: any = {
          access_token: account.access_token,
          expires_at: account.expires_at,
        }
        if (account.refresh_token) {
          updateData.refresh_token = account.refresh_token
        }

        try {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            }
          })

          if (existingAccount) {
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              },
              data: updateData
            })
          }
        } catch (err) {
          console.error("[AUTH_SIGNIN_CALLBACK_ERROR]: Failed to update google-calendar tokens:", err)
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Después de Google OAuth ir al paso 1
      if (url.includes("/api/auth/callback/google") && !url.includes("google-calendar")) {
        return `${baseUrl}/onboarding?step=1`
      }
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return `${baseUrl}/onboarding`
    },
  },
})