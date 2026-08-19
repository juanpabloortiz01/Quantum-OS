"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Por favor ingresa tu correo y contraseña.")
      return
    }
    setIsLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Correo o contraseña incorrectos.")
      setIsLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1A1A1A]">Quantum OS</span>
          </div>
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Bienvenido de vuelta</h1>
          <p className="text-sm text-[#6B7280] mt-1">Ingresa a tu cuenta para continuar</p>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all text-[#1A1A1A] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all text-[#1A1A1A] disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-md">
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-[#1A1A1A] text-white font-medium py-3 text-sm rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs font-medium text-[#94A3B8]">
                O continuar con
              </span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full border border-[#E2E8F0] bg-white rounded-lg py-3 flex items-center justify-center gap-3 hover:bg-[#F9FAFB] transition-colors group shadow-sm disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#4B5563]" />
            ) : (
              <svg className="w-5 h-5 text-[#4B5563]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span className="text-sm font-medium text-[#4B5563] group-hover:text-[#1A1A1A]">
              Google
            </span>
          </button>

          <p className="text-center text-xs text-[#6B7280] pt-2">
            ¿No tienes cuenta?{" "}
            <Link href="/onboarding" className="text-[#1A1A1A] font-semibold hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-[#F1F5F9] bg-[#FBFBFA] flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#94A3B8]">Quantum Platform</span>
          <span className="text-[10px] font-semibold text-[#94A3B8]">v2.0</span>
        </div>
      </motion.div>
    </div>
  )
}
