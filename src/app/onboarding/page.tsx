"use client"

import { signIn, useSession } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Instagram, Facebook, Mail, Phone, Upload, CheckCircle, Scan, ArrowLeft, ArrowRight, RefreshCw, Loader2, Copy } from "lucide-react"
import { finalizeOnboarding, registerQuantumUser, sendTestPing, getCloudinaryConfig, setupEvolutionInstance, checkEvolutionConnectionState } from "./action"

const NICHES = [
  { id: "gastro", label: "GASTRONOMÍA", desc: "Pedidos · Menú · Delivery" },
  { id: "retail", label: "REVENTA / E-COMMERCE", desc: "Catálogo · Stock · Envíos" },
  { id: "clinic", label: "CLÍNICA / SERVICIOS", desc: "Citas · Pacientes · Agenda" },
]

const AVAILABLE_NEEDS = [
  { id: "calendar", label: "AGENDAR_CITAS" },
  { id: "ocr", label: "VALIDAR_PAGOS" },
  { id: "crm", label: "GESTIÓN_CLIENTES" },
  { id: "orders", label: "TOMAR_PEDIDOS" },
  { id: "catalog", label: "CATÁLOGO_DIGITAL" },
  { id: "shipping", label: "LOGÍSTICA_ENVÍOS" },
]

function OnboardingContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status ?? "loading"
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pingStatus, setPingStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  // States for EVO QR/Code Sync
  const [connectionMethod, setConnectionMethod] = useState<"qr" | "code" | null>(null)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [evoLoading, setEvoLoading] = useState(false)
  const [evoConnected, setEvoConnected] = useState(false)

  const [formData, setFormData] = useState({
    niche: "",
    needs: [] as string[],
    contextData: {
      companyName: "",
      service: "",
      scheduleDays: [] as string[],
      openTime: "09:00",
      closeTime: "18:00",
      description: "",
      address: "",
      website: "",
      instagram: "",
      facebook: "",
      contactEmail: "",
      contactPhone: "",
    },
    products: [] as any[],
    testPhone: "",
  })

  const [analyzingStep, setAnalyzingStep] = useState<"IDLE" | "SUBIENDO" | "ANALIZANDO" | "COMPLETADO" | "ERROR">("IDLE")
  const [currentProduct, setCurrentProduct] = useState<any>({
    url_foto: "",
    categoria: "",
    color_principal: "",
    color_secundario: "",
    marca: "",
    caracteristicas: "",
    estilo: "",
  })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 4 && connectionMethod && !evoConnected) {
      interval = setInterval(async () => {
        const res = await checkEvolutionConnectionState()
        if (res.connected) {
          setEvoConnected(true)
          clearInterval(interval)
          // Automático a dashboard tras 1s
          setTimeout(() => {
            handleFinalize()
          }, 1500)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [step, connectionMethod, evoConnected])

  const handleEvoConnect = async (method: "qr" | "code") => {
    setEvoLoading(true)
    setConnectionMethod(method)
    const res = await setupEvolutionInstance(method, formData.testPhone)
    if (res.success) {
      if (method === "qr") setQrBase64(res.base64!)
      if (method === "code") setPairingCode(res.pairingCode!)
    }
    setEvoLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setAnalyzingStep("SUBIENDO")

    try {
      const config = await getCloudinaryConfig()
      const rawPreset = config.uploadPreset
      const cleanPreset = rawPreset.trim()

      const formDataUpload = new FormData()
      formDataUpload.append("upload_preset", cleanPreset)
      formDataUpload.append("file", file)

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        { method: "POST", body: formDataUpload }
      )

      if (!cloudinaryRes.ok) throw new Error("Fallo al subir foto")

      const cloudinaryData = await cloudinaryRes.json()
      const imageUrl = cloudinaryData.secure_url

      setCurrentProduct((prev: any) => ({ ...prev, url_foto: imageUrl }))
      setAnalyzingStep("ANALIZANDO")

      const aiRes = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl })
      })
      const result = await aiRes.json()

      if (result.success) {
        setCurrentProduct((prev: any) => ({
          ...prev,
          categoria: result.data.categoria || prev.categoria,
          color_principal: result.data.color_principal || prev.color_principal,
          color_secundario: result.data.color_secundario || prev.color_secundario,
          marca: result.data.marca || prev.marca,
          caracteristicas: result.data.caracteristicas || prev.caracteristicas,
          estilo: result.data.estilo || prev.estilo,
        }))
        setAnalyzingStep("COMPLETADO")
      } else {
        throw new Error("Fallo en Análisis de Ia")
      }
    } catch (err) {
      console.error(err)
      setAnalyzingStep("ERROR")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProduct = () => {
    if (formData.products.length >= 10) return
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, currentProduct]
    }))
    setCurrentProduct({ url_foto: "", categoria: "", color_principal: "", color_secundario: "", marca: "", caracteristicas: "", estilo: "" })
    setAnalyzingStep("IDLE")
  }

  const updateContext = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contextData: { ...prev.contextData, [field]: value },
    }))
  }

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const days = prev.contextData.scheduleDays
      return {
        ...prev,
        contextData: {
          ...prev.contextData,
          scheduleDays: days.includes(day)
            ? days.filter((d) => d !== day)
            : [...days, day],
        },
      }
    })
  }

  // Leer errores de NextAuth en la URL (ej. OAuthAccountNotLinked o Configuration)
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(`Auth_Error: ${errorParam}`)
    }
  }, [searchParams])

  // Si está autenticado, redirigir al dashboard o avanzar a paso 1
  useEffect(() => {
    if (status === "authenticated") {
      // Optimistic update para evitar parpadeos
      if (step === 0 && searchParams.get("step") === "1") {
        setStep(1)
      }

      fetch("/api/check-onboarding")
        .then((r) => r.json())
        .then((data) => {
          if (data.completed) {
            router.push("/dashboard")
          } else if (step === 0) {
            setStep(1)
          }
        })
        .catch(() => {
          if (step === 0) setStep(1) // Fallback
        })
    }
  }, [status, step, searchParams, router])

  const toggleNeed = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      needs: prev.needs.includes(id)
        ? prev.needs.filter((n) => n !== id)
        : [...prev.needs, id],
    }))
  }

  const handleContinue = async () => {
    setError("")

    if (!isValidEmail(email)) {
      setError("CORREO_INVÁLIDO")
      return
    }
    if (password.length < 8) {
      setError("CONTRASEÑA_MÍNIMO_8_CARACTERES")
      return
    }
    if (password !== confirmPassword) {
      setError("LAS_CONTRASEÑAS_NO_COINCIDEN")
      return
    }

    setIsLoading(true)
    const result = await registerQuantumUser({ email, password })
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Login automático después del registro
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("ERROR_DE_AUTENTICACIÓN")
      return
    }

    setStep(1)
  }

  const handlePing = async () => {
    setPingStatus("sending")
    const result = await sendTestPing(formData.testPhone)
    setPingStatus(result.success ? "sent" : "error")
  }

  const handleFinalize = async () => {
    if (!session?.user?.id) return
    setIsLoading(true)
    await finalizeOnboarding({
      userId: session.user.id,
      niche: formData.niche,
      needs: formData.needs,
      contextData: formData.contextData,
      products: formData.products,
      testPhone: formData.testPhone,
    })
    setIsLoading(false)
  }

  return (
    <div
      className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4 selection:bg-[#00FFFF] selection:text-black"
      style={{ fontFamily: "var(--font-inter, sans-serif)" }}
    >
      {/* SCANLINES */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 4px)",
        }}
      />

      {/* GRID */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#00FFFF 1px,transparent 1px),linear-gradient(to bottom,#00FFFF 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div
            className="font-mono text-xs font-bold tracking-widest text-white"
            style={{ fontFamily: "var(--font-fira-code, monospace)" }}
          >
            &gt; QUANTUM <span className="text-[#00FFFF]">|</span>
          </div>
          {step > 0 && (
            <div
              className="flex items-center gap-2 font-mono text-[10px] text-[#00FFFF] tracking-widest"
              style={{ fontFamily: "var(--font-fira-code, monospace)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
              PASO_{step.toString().padStart(2, "0")}/03
            </div>
          )}
        </div>

        {/* TARJETA */}
        <div className="border border-[#1A1A1A] bg-[#0D0D0D] relative overflow-hidden">
          {/* Esquinas cian */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00FFFF]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00FFFF]" />

          {/* Línea superior */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF]/30 to-transparent" />

          {/* Barra de progreso */}
          {step > 0 && (
            <div className="px-8 pt-6">
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="flex-1 h-[2px] transition-all duration-500"
                    style={{ background: s <= step ? "#00FFFF" : "#1A1A1A" }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Título */}
            <div className="mb-8 text-center">
              <div
                className="font-mono text-[10px] text-[#444] tracking-[0.2em] uppercase mb-2"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                QUANTUM_OS // PROTOCOLO_INIT
              </div>
              <h1
                className="font-mono text-xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                {step === 0 && "ACCESO_AL_SISTEMA"}
                {step === 1 && "CONFIGURAR_AGENTE"}
                {step === 2 && "MEMORIA_BASE"}
                {step === 3 && "CATÁLOGO_IA"}
                {step === 4 && "SINCRONIZAR_WHATSAPP"}
              </h1>
            </div>

            <AnimatePresence mode="wait">
              {/* ── PASO 0: AUTH ── */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label
                      className="block font-mono text-[10px] text-[#555] uppercase mb-2 tracking-widest"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      CORREO_ELECTRÓNICO
                    </label>
                    <input
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF]/50 outline-none transition-all font-mono text-white"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    />
                  </div>

                  <AnimatePresence>
                    {email.length > 2 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col gap-4 overflow-hidden"
                      >
                        <div>
                          <label
                            className="block font-mono text-[10px] text-[#555] uppercase mb-2 tracking-widest"
                            style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                          >
                            CONTRASEÑA
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF]/50 outline-none transition-all font-mono text-white"
                          />
                        </div>
                        <div>
                          <label
                            className="block font-mono text-[10px] text-[#555] uppercase mb-2 tracking-widest"
                            style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                          >
                            CONFIRMAR_CONTRASEÑA
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF]/50 outline-none transition-all font-mono text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <p
                      className="font-mono text-[9px] text-red-500 uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      ERROR: {error}
                    </p>
                  )}

                  <button
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="w-full bg-white text-black font-mono font-bold py-3 text-xs uppercase tracking-widest hover:bg-[#00FFFF] transition-colors disabled:opacity-50"
                    style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                  >
                    {isLoading ? "PROCESANDO..." : "[ CONTINUAR ]"}
                  </button>

                  {/* Divisor */}
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#1A1A1A]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span
                        className="bg-[#0D0D0D] px-4 font-mono text-[10px] text-[#444] uppercase tracking-widest"
                        style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                      >
                        o continuar con
                      </span>
                    </div>
                  </div>

                  {/* Google */}
                  <button
                    onClick={() =>
                      signIn("google", {
                        callbackUrl: "/onboarding?step=1",
                      })
                    }
                    className="w-full border border-[#222] bg-[#111] py-3 flex items-center justify-center gap-3 hover:border-[#00FFFF]/30 hover:bg-[#151515] transition-all group"
                  >
                    <svg className="w-4 h-4 text-[#666] group-hover:text-[#00FFFF] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span
                      className="font-mono text-[10px] tracking-widest text-[#666] group-hover:text-white transition-colors uppercase"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      INICIAR_CON_GMAIL
                    </span>
                  </button>

                  <p className="text-center font-mono text-[10px] text-[#333] tracking-widest">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-[#00FFFF] hover:underline">
                      INICIAR_SESIÓN
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ── PASO 1: NICHO + NECESIDADES ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <span
                      className="font-mono text-[10px] text-[#555] block mb-3 uppercase tracking-[0.2em]"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      01_SECTOR_DEL_NEGOCIO
                    </span>
                    <div className="flex flex-col gap-[1px] bg-[#1A1A1A]">
                      {NICHES.map((niche) => (
                        <button
                          key={niche.id}
                          onClick={() => setFormData({ ...formData, niche: niche.id })}
                          className="py-3 px-4 text-left transition-all flex items-center justify-between"
                          style={{
                            background:
                              formData.niche === niche.id
                                ? "rgba(0,255,255,0.06)"
                                : "#0D0D0D",
                            borderLeft:
                              formData.niche === niche.id
                                ? "2px solid #00FFFF"
                                : "2px solid transparent",
                          }}
                        >
                          <span
                            className="font-mono text-[10px] tracking-widest"
                            style={{
                              fontFamily: "var(--font-fira-code, monospace)",
                              color:
                                formData.niche === niche.id ? "#00FFFF" : "#555",
                            }}
                          >
                            {niche.label}
                          </span>
                          <span className="font-mono text-[9px] text-[#333]">
                            {niche.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span
                      className="font-mono text-[10px] text-[#555] block mb-3 uppercase tracking-[0.2em]"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      02_HABILIDADES_DEL_AGENTE
                    </span>
                    <div className="grid grid-cols-2 gap-[1px] bg-[#1A1A1A]">
                      {AVAILABLE_NEEDS.map((need) => {
                        const active = formData.needs.includes(need.id)
                        return (
                          <button
                            key={need.id}
                            onClick={() => toggleNeed(need.id)}
                            className="flex items-center gap-3 p-3 text-left transition-all"
                            style={{
                              background: active
                                ? "rgba(0,255,255,0.04)"
                                : "#0D0D0D",
                            }}
                          >
                            <div
                              className="w-3 h-3 border flex items-center justify-center flex-shrink-0"
                              style={{ borderColor: active ? "#00FFFF" : "#333" }}
                            >
                              {active && (
                                <div className="w-1.5 h-1.5 bg-[#00FFFF]" />
                              )}
                            </div>
                            <span
                              className="font-mono text-[9px] tracking-widest"
                              style={{
                                fontFamily: "var(--font-fira-code, monospace)",
                                color: active ? "#fff" : "#555",
                              }}
                            >
                              {need.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!formData.niche}
                    className="w-full py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                    style={{
                      fontFamily: "var(--font-fira-code, monospace)",
                      background: formData.niche ? "white" : "transparent",
                      color: formData.niche ? "black" : "#555",
                      border: formData.niche ? "none" : "1px solid #2A2A2A",
                    }}
                  >
                    [ SIGUIENTE_PASO ]
                  </button>
                </motion.div>
              )}

              {/* ── PASO 2: MEMORIA BASE ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-mono text-[10px] text-[#555] uppercase tracking-[0.2em]"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      03_MEMORIA_BASE
                    </span>
                    <span
                      className="font-mono text-[9px] text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      RAG_READY
                    </span>
                  </div>

                  <div className="border-l-2 border-[#00FFFF] bg-[#00FFFF]/5 p-3 mb-2">
                    <p className="font-mono text-[9px] text-[#00FFFF] uppercase tracking-widest leading-relaxed">
                      // AVISO_DE_COMPILACIÓN<br />
                      <span className="text-[#888]">El contexto de tu Agente depende 100% de estos datos. Campos vacíos o imprecisos harán que tu agente no responda correctamente.</span>
                    </p>
                  </div>

                  {/* SCROLL CONTAINER */}
                  <div className="max-h-[50vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar">

                    {/* Campos Principales */}
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block font-mono text-[9px] text-[#555] uppercase mb-1 tracking-widest">NOMBRE_DEL_NEGOCIO *</label>
                        <input
                          type="text"
                          value={formData.contextData.companyName}
                          onChange={(e) => updateContext("companyName", e.target.value)}
                          className="w-full bg-[#111] border border-[#1A1A1A] p-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[9px] text-[#555] uppercase mb-1 tracking-widest">SERVICIO_O_PRODUCTO_PRINCIPAL *</label>
                        <input
                          type="text"
                          placeholder="Ej: Ropa deportiva para mujer"
                          value={formData.contextData.service}
                          onChange={(e) => updateContext("service", e.target.value)}
                          className="w-full bg-[#111] border border-[#1A1A1A] p-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="border border-[#1A1A1A] p-4 bg-[#111]/50">
                      <label className="block font-mono text-[9px] text-[#555] uppercase mb-3 tracking-widest">HORARIOS_DE_ATENCIÓN</label>
                      <div className="flex gap-1 mb-4">
                        {["LU", "MA", "MI", "JU", "VI", "SA", "DO"].map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className="flex-1 py-2 font-mono text-[9px] transition-colors border"
                            style={{
                              borderColor: formData.contextData.scheduleDays.includes(day) ? "#00FFFF" : "#222",
                              color: formData.contextData.scheduleDays.includes(day) ? "#00FFFF" : "#555",
                              backgroundColor: formData.contextData.scheduleDays.includes(day) ? "rgba(0,255,255,0.05)" : "#111"
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block font-mono text-[8px] text-[#444] uppercase mb-1 tracking-widest">APERTURA</label>
                          <input
                            type="time"
                            value={formData.contextData.openTime}
                            onChange={(e) => updateContext("openTime", e.target.value)}
                            className="w-full bg-[#0D0D0D] border border-[#222] p-2 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none style-time-input"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block font-mono text-[8px] text-[#444] uppercase mb-1 tracking-widest">CIERRE</label>
                          <input
                            type="time"
                            value={formData.contextData.closeTime}
                            onChange={(e) => updateContext("closeTime", e.target.value)}
                            className="w-full bg-[#0D0D0D] border border-[#222] p-2 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none style-time-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descripción y Dirección */}
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block font-mono text-[9px] text-[#555] uppercase mb-1 tracking-widest">DESCRIPCIÓN_DEL_NEGOCIO *</label>
                        <textarea
                          value={formData.contextData.description}
                          onChange={(e) => updateContext("description", e.target.value)}
                          placeholder="Tu tono de voz, restricciones, ventajas..."
                          className="w-full h-24 bg-[#111] border border-[#1A1A1A] p-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none resize-none transition-colors leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[9px] text-[#555] uppercase mb-1 tracking-widest">DIRECCIÓN_FÍSICA (Opcional)</label>
                        <textarea
                          value={formData.contextData.address}
                          onChange={(e) => updateContext("address", e.target.value)}
                          className="w-full h-12 bg-[#111] border border-[#1A1A1A] p-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none resize-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Enlaces y Contacto */}
                    <div className="flex flex-col gap-3">
                      <label className="block font-mono text-[9px] text-[#555] uppercase tracking-widest">ENLACES_Y_CONTACTO</label>

                      <div className="flex bg-[#111] border border-[#1A1A1A] focus-within:border-[#00FFFF]/40 transition-colors">
                        <div className="px-3 flex items-center justify-center border-r border-[#1A1A1A]">
                          <Globe size={12} className="text-[#555]" />
                        </div>
                        <input type="text" placeholder="Página web" value={formData.contextData.website} onChange={e => updateContext("website", e.target.value)} className="w-full bg-transparent p-2 text-xs text-white font-mono outline-none" />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 flex bg-[#111] border border-[#1A1A1A] focus-within:border-[#00FFFF]/40 transition-colors">
                          <div className="px-3 flex items-center justify-center border-r border-[#1A1A1A]">
                            <Instagram size={12} className="text-[#555]" />
                          </div>
                          <input type="text" placeholder="@usuario" value={formData.contextData.instagram} onChange={e => updateContext("instagram", e.target.value)} className="w-full bg-transparent p-2 text-xs text-white font-mono outline-none" />
                        </div>
                        <div className="flex-1 flex bg-[#111] border border-[#1A1A1A] focus-within:border-[#00FFFF]/40 transition-colors">
                          <div className="px-3 flex items-center justify-center border-r border-[#1A1A1A]">
                            <Facebook size={12} className="text-[#555]" />
                          </div>
                          <input type="text" placeholder="/pagina" value={formData.contextData.facebook} onChange={e => updateContext("facebook", e.target.value)} className="w-full bg-transparent p-2 text-xs text-white font-mono outline-none" />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 flex bg-[#111] border border-[#1A1A1A] focus-within:border-[#00FFFF]/40 transition-colors">
                          <div className="px-3 flex items-center justify-center border-r border-[#1A1A1A]">
                            <Mail size={12} className="text-[#555]" />
                          </div>
                          <input type="email" placeholder="Correo" value={formData.contextData.contactEmail} onChange={e => updateContext("contactEmail", e.target.value)} className="w-full bg-transparent p-2 text-xs text-white font-mono outline-none" />
                        </div>
                        <div className="flex-1 flex bg-[#111] border border-[#1A1A1A] focus-within:border-[#00FFFF]/40 transition-colors">
                          <div className="px-3 flex items-center justify-center border-r border-[#1A1A1A]">
                            <Phone size={12} className="text-[#555]" />
                          </div>
                          <input type="tel" placeholder="Teléfono" value={formData.contextData.contactPhone} onChange={e => updateContext("contactPhone", e.target.value)} className="w-full bg-transparent p-2 text-xs text-white font-mono outline-none" />
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#1A1A1A] mt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-4 border border-[#1A1A1A] text-[#444] font-mono text-[10px] tracking-widest hover:text-white transition-colors uppercase"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      [ ← ]
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!formData.contextData.companyName || !formData.contextData.description}
                      className="flex-1 py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                      style={{
                        fontFamily: "var(--font-fira-code, monospace)",
                        background: (formData.contextData.companyName && formData.contextData.description) ? "white" : "transparent",
                        color: (formData.contextData.companyName && formData.contextData.description) ? "black" : "#555",
                        border: (formData.contextData.companyName && formData.contextData.description) ? "none" : "1px solid #2A2A2A",
                      }}
                    >
                      [ CONTINUAR ]
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 3: CATÁLOGO IA ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] text-[#555] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                      04_CATÁLOGO_IA
                    </span>
                    <span className="font-mono text-[9px] text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                      VISIÓN_ACTIVA
                    </span>
                  </div>

                  <p className="font-mono text-[10px] text-[#888] mb-2 leading-relaxed" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                    Sube fotos de tus productos principales (hasta 10 en plan Free). El sistema los escaneará y pre-rellenará los datos para el Agente.
                  </p>

                  <div className="max-h-[50vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar">

                    {formData.products.length < 10 ? (
                      <div className="border border-dashed border-[#333] hover:border-[#00FFFF] bg-[#0D0D0D] p-6 flex flex-col items-center justify-center relative transition-colors group cursor-pointer h-32">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          title=""
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isLoading}
                        />
                        {analyzingStep === "IDLE" || analyzingStep === "COMPLETADO" || analyzingStep === "ERROR" ? (
                          <div className="flex flex-col items-center gap-2 text-[#555] group-hover:text-[#00FFFF]">
                            <Upload size={18} />
                            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                              [ SOLTAR O HACER CLIC PARA DETECTAR PRODUCTO ]
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[#00FFFF]">
                            <Scan size={18} className="animate-pulse" />
                            <span className="font-mono text-[9px] tracking-widest uppercase animate-pulse" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                              {analyzingStep === "SUBIENDO" ? "PREPARANDO FOTO..." : "DETECTANDO PRODUCTO..."}
                            </span>
                          </div>
                        )}
                        {analyzingStep === "ERROR" && <span className="font-mono text-[9px] text-red-500 mt-2">Error procesando imagen. Intenta otra vez.</span>}
                      </div>
                    ) : (
                      <div className="text-center font-mono text-[9px] text-[#00FF88] border border-[#00FF88]/30 p-2" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                        [ LÍMITE DE 10 PRODUCTOS ALCANZADO ]
                      </div>
                    )}

                    {currentProduct.url_foto && analyzingStep === "COMPLETADO" && (
                      <div className="border border-[#1A1A1A] bg-[#111] p-4 flex flex-col gap-3">
                        <div className="border-l-2 border-[#00FFFF] pl-2 mb-2">
                          <span className="font-mono text-[9px] text-[#00FFFF] uppercase tracking-widest" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>DETECCIÓN FINALIZADA</span>
                        </div>
                        <div className="flex gap-4 mb-2">
                          <img src={currentProduct.url_foto} alt="Preview" className="w-24 h-24 object-cover border border-[#222]" />
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="font-mono text-[8px] text-[#555] uppercase">Categoría</label>
                              <input type="text" value={currentProduct.categoria} onChange={(e) => setCurrentProduct({ ...currentProduct, categoria: e.target.value })} className="bg-black border border-[#222] text-[10px] p-2 text-white font-mono focus:border-[#00FFFF]/40 outline-none" style={{ fontFamily: "var(--font-fira-code, monospace)" }} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-mono text-[8px] text-[#555] uppercase">Marca</label>
                              <input type="text" value={currentProduct.marca} onChange={(e) => setCurrentProduct({ ...currentProduct, marca: e.target.value })} className="bg-black border border-[#222] text-[10px] p-2 text-white font-mono focus:border-[#00FFFF]/40 outline-none" style={{ fontFamily: "var(--font-fira-code, monospace)" }} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-mono text-[8px] text-[#555] uppercase">Color</label>
                              <input type="text" value={currentProduct.color_principal} onChange={(e) => setCurrentProduct({ ...currentProduct, color_principal: e.target.value })} className="bg-black border border-[#222] text-[10px] p-2 text-white font-mono focus:border-[#00FFFF]/40 outline-none" style={{ fontFamily: "var(--font-fira-code, monospace)" }} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-mono text-[8px] text-[#555] uppercase">Estilo</label>
                              <input type="text" value={currentProduct.estilo} onChange={(e) => setCurrentProduct({ ...currentProduct, estilo: e.target.value })} className="bg-black border border-[#222] text-[10px] p-2 text-white font-mono focus:border-[#00FFFF]/40 outline-none" style={{ fontFamily: "var(--font-fira-code, monospace)" }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-mono text-[8px] text-[#555] uppercase">Características a resaltar (15 Palabras)</label>
                          <input type="text" value={currentProduct.caracteristicas} onChange={(e) => setCurrentProduct({ ...currentProduct, caracteristicas: e.target.value })} className="w-full bg-black border border-[#222] text-[10px] p-2 text-white font-mono focus:border-[#00FFFF]/40 outline-none" style={{ fontFamily: "var(--font-fira-code, monospace)" }} />
                        </div>
                        <button onClick={handleAddProduct} className="bg-[#00FFFF]/10 border border-[#00FFFF]/30 text-[#00FFFF] font-bold font-mono text-[9px] py-3 mt-2 uppercase tracking-widest hover:bg-[#00FFFF] hover:text-black transition-colors" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
                          + CONFIRMAR Y AÑADIR A LA BASE DE DATOS ({formData.products.length}/10)
                        </button>
                      </div>
                    )}

                    {formData.products.length > 0 && (
                      <div className="flex flex-col gap-2 mt-4">
                        <span className="font-mono text-[9px] text-[#555] uppercase tracking-widest" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>PRODUCTOS INDEXADOS ({formData.products.length}):</span>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.products.map((prod: any, idx: number) => (
                            <div key={idx} className="flex border border-[#1A1A1A] bg-[#111] p-2 gap-3 items-center group">
                              <img src={prod.url_foto} className="w-10 h-10 object-cover border border-[#222]" />
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-mono text-[9px] text-[#00FFFF] truncate" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>{prod.categoria || "N/A"}</span>
                                <span className="font-mono text-[8px] text-[#888] truncate" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>{prod.marca || "Generic"} • {prod.color_principal}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#1A1A1A] mt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="px-6 py-4 border border-[#1A1A1A] text-[#444] font-mono text-[10px] tracking-widest hover:text-white transition-colors uppercase"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      [ ← ]
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="flex-1 py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-all"
                      style={{
                        fontFamily: "var(--font-fira-code, monospace)",
                        background: "white",
                        color: "black",
                        border: "none",
                      }}
                    >
                      {formData.products.length === 0 ? "[ OMITIR_POR_AHORA ]" : "[ CONTINUAR ]"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 4: QR + TEST ── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-3">
                    {!connectionMethod && !evoConnected && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button onClick={() => handleEvoConnect("qr")} className="p-6 border border-[#1A1A1A] bg-[#111] hover:border-[#00FFFF] transition-all flex flex-col items-center gap-3">
                          <Scan className="w-8 h-8 text-[#00FFFF]" />
                          <span className="font-mono text-[11px] tracking-widest text-white mt-1">ESCÁNER QR</span>
                        </button>
                        <button onClick={() => setConnectionMethod("code")} className="p-6 border border-[#1A1A1A] bg-[#111] hover:border-[#00FFFF] transition-all flex flex-col items-center gap-3">
                          <Phone className="w-8 h-8 text-[#00FFFF]" />
                          <span className="font-mono text-[11px] tracking-widest text-white mt-1">CÓDIGO NUMÉRICO</span>
                        </button>
                      </div>
                    )}

                    {connectionMethod === "qr" && !evoConnected && (
                      <div className="border border-[#1A1A1A] bg-[#111] p-6 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4 w-full">
                          <button onClick={() => { setConnectionMethod(null); setQrBase64(null) }} className="text-[#555] hover:text-white px-2 py-1 border border-[#333] hover:border-white transition-colors bg-black">← REGRESAR</button>
                          <span className="font-mono text-[10px] text-[#00FFFF] tracking-widest animate-pulse ml-auto">ESPERANDO_CONEXIÓN...</span>
                        </div>
                        {evoLoading || !qrBase64 ? (
                          <div className="w-48 h-48 border border-[#2A2A2A] flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-[#00FFFF] animate-spin" />
                            <span className="text-[9px] text-[#555] font-mono animate-pulse">GENERANDO_QR...</span>
                          </div>
                        ) : (
                          <div className="bg-white p-2 w-48 h-48 relative">
                            <img src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <span className="font-mono text-[11px] text-[#AAA] text-center mt-3 leading-relaxed">
                          Abre WhatsApp en tu teléfono → Dispositivos Vinculados → Vincular dispositivo<br />
                          <strong className="text-[#00FFFF] text-[11px] mt-2 block">Se redireccionará al Búnker automáticamente.</strong>
                        </span>

                        <button onClick={() => handleEvoConnect("qr")} className="mt-2 text-[#00FFFF] font-mono text-[10px] flex items-center gap-2 hover:bg-[#00FFFF] hover:text-black transition-colors px-3 py-1">
                          <RefreshCw className="w-3 h-3" /> RECARGAR QR
                        </button>
                      </div>
                    )}

                    {connectionMethod === "code" && !evoConnected && (
                      <div className="border border-[#1A1A1A] bg-[#111] p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-4 w-full">
                          <button onClick={() => { setConnectionMethod(null); setPairingCode(null) }} className="text-[#555] hover:text-white px-2 py-1 border border-[#333] hover:border-white transition-colors bg-black">← REGRESAR</button>
                          <span className="font-mono text-[10px] text-[#00FFFF] tracking-widest ml-auto">VINCULACIÓN_POR_CÓDIGO</span>
                        </div>

                        {!pairingCode ? (
                          <div className="flex flex-col gap-3 mt-2">
                            <span className="font-mono text-[10px] text-[#AAA] uppercase">Número con código de país (Ej: 593999999999)</span>
                            <input type="text" placeholder="Ej: 59399999999" value={formData.testPhone} onChange={e => setFormData({ ...formData, testPhone: e.target.value })} className="bg-black border border-[#222] p-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none" />
                            <button onClick={() => handleEvoConnect("code")} disabled={evoLoading || formData.testPhone.length < 8} className="py-3 mt-2 border border-[#00FFFF]/30 bg-[#00FFFF]/10 text-[#00FFFF] font-mono text-[10px] hover:bg-[#00FFFF] hover:text-black transition-colors disabled:opacity-50 tracking-widest uppercase">
                              {evoLoading ? "GENERANDO..." : "OBTENER_CÓDIGO"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 mt-4">
                            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-[#00FFFF] bg-black border border-[#2A2A2A] px-6 py-4 flex items-center gap-4">
                              {pairingCode}
                              <button onClick={() => navigator.clipboard.writeText(pairingCode)} className="text-[#555] hover:text-white p-2 bg-[#1A1A1A] border border-[#333] rounded-md transition-colors" title="Copiar">
                                <Copy className="w-4 h-4" />
                              </button>
                            </span>
                            <span className="font-mono text-[11px] text-[#AAA] text-center max-w-sm leading-relaxed mt-2">
                              Abre WhatsApp → Dispositivos Vinculados → <strong>Vincular con el número de teléfono en su lugar.</strong><br />
                              <strong className="text-[#00FFFF] text-[11px] mt-3 block bg-[#00FFFF]/10 py-2">Se redireccionará al Búnker una vez vinculado.</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {evoConnected && (
                      <div className="border border-[#00FF88]/30 bg-[#00FF88]/5 p-8 flex flex-col items-center justify-center gap-4">
                        <CheckCircle className="w-12 h-12 text-[#00FF88]" />
                        <span className="font-mono text-[12px] text-[#00FF88] tracking-widest uppercase text-center block leading-loose">
                          CONEXIÓN_ESTABLECIDA<br />
                          BIENVENIDO, CAPITÁN.
                        </span>
                        <p className="font-mono text-[11px] text-[#AAA] text-center mt-2">El Agente Quantum ahora tiene control sobre esta línea de WhatsApp.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#1A1A1A] to-transparent" />
          <div className="px-8 py-3 flex items-center justify-between">
            <span className="font-mono text-[9px] text-[#2A2A2A] tracking-widest">
              QUANTUM_OS · INIT
            </span>
            <span className="font-mono text-[9px] text-[#2A2A2A] tracking-widest">
              AES256 · GDPR_OK
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <span className="font-mono text-[#00FFFF] text-xs tracking-widest animate-pulse" style={{ fontFamily: "var(--font-fira-code, monospace)" }}>
          CARGANDO_SISTEMA...
        </span>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

// Helper
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}