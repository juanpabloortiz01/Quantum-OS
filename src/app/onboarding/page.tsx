"use client"

import { signIn, useSession } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Instagram, Facebook, Mail, Phone, Upload, CheckCircle, Scan, ArrowLeft, ArrowRight, RefreshCw, Loader2, Copy, Calendar, Coffee, ShoppingBag, Sparkles, Zap, Shield, Lock, Check, Pencil } from "lucide-react"

import { finalizeOnboarding, registerQuantumUser, sendTestPing, getCloudinaryConfig, setupEvolutionInstance, checkEvolutionConnectionState, registerAndFinalizeOnboarding } from "./action"


const NICHES = [
  {
    id: "agenda",
    label: "Quantum [Agenda]",
    target: "Clínicas, estéticas, spas o barberías",
    desc: "Recepcionista de élite. Gestiona tus citas 24/7 mientras tú te concentras en atender.",
    icon: Calendar,
    color: "from-blue-500/20 to-indigo-500/20",
    accent: "text-blue-600",
    needs: ["calendar", "crm"]
  },
  {
    id: "ventas",
    label: "Quantum [Ventas]",
    target: "Restaurantes, cafeterías o negocios de comida",
    desc: "Mesero digital infalible. Toma pedidos y organiza tu cocina sin errores.",
    icon: Coffee,
    color: "from-orange-500/20 to-red-500/20",
    accent: "text-orange-600",
    needs: ["orders", "crm"]
  },
  {
    id: "showroom",
    label: "Quantum [Showroom]",
    target: "Tiendas de ropa, tecnología o e-commerce",
    desc: "Vitrina inteligente. Tu IA conoce el stock y vende por ti sugiriendo lo ideal.",
    icon: ShoppingBag,
    color: "from-purple-500/20 to-pink-500/20",
    accent: "text-purple-600",
    needs: ["catalog", "crm"]
  },
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
   const [evoError, setEvoError] = useState<string | null>(null)
   const [tempId, setTempId] = useState<string | null>(null)
   const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null)


  useEffect(() => {
    // Generar un ID temporal para rastrear la sesión de onboarding sin DB
    setTempId(crypto.randomUUID())
  }, [])


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
      notifPhone: "",
      shippingZones: "",
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

  // States for Conditional Step 3
  const [ventasMethod, setVentasMethod] = useState<"choose" | "ai" | "manual">("choose")
  const [manualItem, setManualItem] = useState({ name: "", price: "", info: "" })

  // Cuenta cuántas imágenes distintas han sido escaneadas con IA
  // (aplica a ventas, agenda Y showroom)
  const scannedImageCount = new Set(
    formData.products
      .filter(p => p.url_foto && (p.color_principal === "Menú" || p.color_principal !== "Manual"))
      .map(p => p.url_foto)
  ).size


  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 4 && connectionMethod && !evoConnected) {
      interval = setInterval(async () => {
        const res = await checkEvolutionConnectionState(tempId || undefined, activeInstanceName || undefined)
        if (res.connected) {
          setEvoConnected(true)
          clearInterval(interval)
          // Automático a dashboard tras 1.5s
          setTimeout(() => {
            handleFinalize()
          }, 1500)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [step, connectionMethod, evoConnected, activeInstanceName])

  const handleEvoConnect = async (method: "qr" | "code") => {
    setEvoLoading(true)
    setEvoError(null)

    setConnectionMethod(method)
    const res = await setupEvolutionInstance(method, formData.testPhone, tempId || undefined)

    if (res.success) {
      if (res.instanceName) setActiveInstanceName(res.instanceName)
      
      if (res.connected) {
        setEvoConnected(true)
        setTimeout(() => {
          handleFinalize()
        }, 1500)
      } else {
        if (method === "qr") setQrBase64(res.base64!)
        if (method === "code") setPairingCode(res.pairingCode!)
      }
    } else {
      setEvoError(res.error || "Fallo desconocido al conectar con servidor web.")
      setConnectionMethod(null)
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
        body: JSON.stringify({ imageUrl, niche: formData.niche })
      })
      const result = await aiRes.json()

      if (result.success) {
        if (result.isMenu && result.data.platos && Array.isArray(result.data.platos)) {
          // VENTAS: añadir cada plato como un producto independiente
          const newProducts = result.data.platos.map((plato: any) => ({
            url_foto: imageUrl,
            categoria: plato.nombre || "",
            marca: plato.precio || "",
            color_principal: "Menú",
            color_secundario: "",
            caracteristicas: plato.descripcion || "",
            estilo: "",
          }))
          setFormData((prev: any) => ({
            ...prev,
            products: [...prev.products, ...newProducts].slice(0, 20),
          }))
          setCurrentProduct({ url_foto: "", categoria: "", color_principal: "", color_secundario: "", marca: "", caracteristicas: "", estilo: "" })
          setAnalyzingStep("COMPLETADO")
        } else if (result.isShowroom && result.data.productos && Array.isArray(result.data.productos)) {
          // SHOWROOM: añadir cada producto de la imagen de forma independiente
          const newProducts = result.data.productos.map((prod: any) => ({
            url_foto: imageUrl,
            categoria: prod.categoria || "",
            color_principal: prod.color_principal || "",
            color_secundario: prod.color_secundario || "",
            marca: prod.marca || "",
            caracteristicas: prod.caracteristicas || "",
            estilo: prod.estilo || "",
          }))
          setFormData((prev: any) => ({
            ...prev,
            products: [...prev.products, ...newProducts].slice(0, 20),
          }))
          setCurrentProduct({ url_foto: "", categoria: "", color_principal: "", color_secundario: "", marca: "", caracteristicas: "", estilo: "" })
          setAnalyzingStep("COMPLETADO")
        } else if (result.isAgenda && result.data.servicios && Array.isArray(result.data.servicios)) {
          // AGENDA: añadir cada servicio como un producto independiente
          const newProducts = result.data.servicios.map((servicio: any) => ({
            url_foto: imageUrl,
            categoria: servicio.nombre || "",
            marca: servicio.precio || "",
            color_principal: "Servicio",
            color_secundario: "",
            caracteristicas: servicio.descripcion || "",
            estilo: "",
          }))
          setFormData((prev: any) => ({
            ...prev,
            products: [...prev.products, ...newProducts].slice(0, 20),
          }))
          setCurrentProduct({ url_foto: "", categoria: "", color_principal: "", color_secundario: "", marca: "", caracteristicas: "", estilo: "" })
          setAnalyzingStep("COMPLETADO")
        } else {
          // SHOWROOM / AGENDA: flujo normal de un solo producto
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
        }
      } else {
        throw new Error("Fallo en Análisis con IA")
      }


    } catch (err) {
      console.error(err)
      setAnalyzingStep("ERROR")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProduct = () => {
    if (formData.products.length >= 5) return
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, currentProduct]
    }))
    setCurrentProduct({ url_foto: "", categoria: "", color_principal: "", color_secundario: "", marca: "", caracteristicas: "", estilo: "" })
    setAnalyzingStep("IDLE")
  }

  const handleAddManualItem = () => {
    if (!manualItem.name || !manualItem.price) return
    if (formData.products.length >= 15) return // Higher limit for text items

    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          url_foto: "",
          categoria: manualItem.name,
          marca: manualItem.price,
          color_principal: "Manual",
          color_secundario: "",
          caracteristicas: manualItem.info || "Entrada manual",
          estilo: "",
        },
      ],
    }))
    setManualItem({ name: "", price: "", info: "" })
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
      setError(`Error de acceso: ${errorParam}`)
    }
  }, [searchParams])

  // Si está autenticado, redirigir al dashboard o avanzar a paso 1
  useEffect(() => {
    if (status === "authenticated") {
      // Si ya hay sesión, verificamos si completó el onboarding
      fetch("/api/check-onboarding")
        .then((r) => r.json())
        .then((data) => {
          if (data.completed) {
            router.push("/dashboard")
          } else {
            // Si está autenticado pero no tiene organización, forzamos permanencia en onboarding
            // No avanzamos automáticamente al paso 1 si no queremos, pero aquí permitimos el paso 1-4
            if (step === 0) setStep(1)
          }
        })
        .catch(() => {
          if (step === 0) setStep(1)
        })
    }
  }, [status, router]) // Eliminamos dependency 'step' para evitar loops si forzamos step


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
      setError("Por favor ingresa un correo válido.")
      return
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsLoading(true)
    // YA NO REGISTRAMOS AQUÍ. Solo validamos y avanzamos.
    // El registro ocurrirá al final junto con la creación de la organización.

    // Verificamos disponibilidad de email (opcional, pero recomendado)
    // Para simplificar, asumimos que es válido y seguimos.
    setIsLoading(false)
    setStep(1)
  }

  const handleFinalize = async () => {
    setIsLoading(true)

    if (status === "unauthenticated") {
      // REGISTRO DIFERIDO + FINALIZACIÓN
      const result = await registerAndFinalizeOnboarding(
        { email, password },
        {
          ...formData,
          tempId: tempId || undefined
        }
      )

      if ("error" in result) {
        setError(result.error as string)
        setIsLoading(false)
        return
      }

      // Login automático
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
    } else if (session?.user?.id) {
      // Ya autenticado (Google), solo finalizamos
      await finalizeOnboarding({
        userId: session.user.id,
        niche: formData.niche,
        needs: formData.needs,
        contextData: formData.contextData,
        products: formData.products,
        testPhone: formData.testPhone,
      })
    }

    setIsLoading(false)
    router.push("/dashboard")
  }


  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1A1A1A] flex items-center justify-center p-4 selection:bg-slate-200 selection:text-black font-sans">

      {/* DOT GRID MINIMALISTA */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* HEADER MINI */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs font-semibold tracking-wide text-[#1A1A1A]">
            Quantum OS
          </div>
          {step > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
              Paso {step}/4
            </div>
          )}
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm relative overflow-hidden">

          {/* Barra de progreso superior */}
          {step > 0 && (
            <div className="h-1 flex">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className="flex-1 transition-all duration-500"
                  style={{ background: s <= step ? "#1A1A1A" : "#F3F4F6" }}
                />
              ))}
            </div>
          )}

          <div className="p-8">
            {/* Título */}
            <div className="mb-8 text-center flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Configuración del Asistente
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                {step === 0 && "Crear una cuenta"}
                {step === 1 && "Sector del negocio"}
                {step === 2 && "Describe tu negocio"}
                {step === 3 && "Sube tu catálogo"}
                {step === 4 && "Conecta tu WhatsApp"}
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
                    <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all text-[#1A1A1A]"
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
                          <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                            Contraseña
                          </label>
                          <input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all text-[#1A1A1A]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
                            Confirmar Contraseña
                          </label>
                          <input
                            type="password"
                            placeholder="Repite tu contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all text-[#1A1A1A]"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-md">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="w-full bg-[#1A1A1A] text-white font-medium py-3 text-sm rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 mt-2 shadow-sm"
                  >
                    {isLoading ? "Procesando..." : "Crear cuenta y continuar"}
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#E2E8F0]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-xs font-medium text-[#94A3B8]">
                        Continuar con
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => signIn("google", { callbackUrl: "/onboarding?step=1" })}
                    className="w-full border border-[#E2E8F0] bg-white rounded-lg py-3 flex items-center justify-center gap-3 hover:bg-[#F9FAFB] transition-colors group shadow-sm"
                  >
                    <svg className="w-5 h-5 text-[#4B5563]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-sm font-medium text-[#4B5563] group-hover:text-[#1A1A1A]">
                      Google
                    </span>
                  </button>

                  <p className="text-center text-xs text-[#6B7280] mt-2">
                    ¿Ya tienes cuenta? <Link href="/login" className="text-[#1A1A1A] font-semibold hover:underline">Iniciar sesión</Link>
                  </p>
                </motion.div>
              )}

              {/* ── PASO 1: SELECCIÓN DE NODO CUÁNTICO ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-5"
                >
                  <div className="text-center mb-2">
                    <p className="text-sm text-[#6B7280]">
                      Selecciona la especialidad de tu agente
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    {NICHES.map((niche) => {
                      const active = formData.niche === niche.id;
                      const Icon = niche.icon;
                      return (
                        <button
                          key={niche.id}
                          onClick={() => setFormData({
                            ...formData,
                            niche: niche.id,
                            needs: niche.needs
                          })}
                          className={`group relative p-5 text-left transition-all border rounded-2xl overflow-hidden ${active
                              ? "border-[#1A1A1A] bg-white shadow-md scale-[1.02]"
                              : "border-[#E2E8F0] bg-white hover:border-[#94A3B8] hover:shadow-sm"
                            }`}
                        >
                          {/* Background gradient hint */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${niche.color} pointer-events-none`} />

                          <div className="relative z-10 flex gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${active ? "bg-[#1A1A1A] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                              <Icon size={24} />
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-base font-bold tracking-tight ${active ? "text-[#1A1A1A]" : "text-[#4B5563]"}`}>
                                  {niche.label}
                                </span>
                                {active && (
                                  <motion.div layoutId="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <CheckCircle className="w-5 h-5 text-[#1A1A1A]" fill="#1A1A1A" stroke="white" />
                                  </motion.div>
                                )}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${niche.accent}`}>
                                {niche.target}
                              </span>
                              <p className="text-xs text-[#6B7280] leading-relaxed mt-1 line-clamp-3">
                                {niche.desc}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!formData.niche}
                    className="w-full py-4 text-sm font-bold transition-all rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
                  >
                    Activar Protocolo
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 leading-relaxed">
                    <strong>Agrega información clave a tu agente.</strong><br />
                    Las respuestas de tu inteligencia artificial se basarán en estos datos. Asegúrate de llenarlo detalladamente.
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar">

                    {/* Campos Principales */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Nombre del negocio *</label>
                        <input
                          type="text"
                          placeholder={formData.niche === "showroom" ? "Urban Style" : formData.niche === "agenda" ? "Spa Relax" : "El Gaucho"}
                          value={formData.contextData.companyName}
                          onChange={(e) => updateContext("companyName", e.target.value)}
                          className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Servicio o producto principal *</label>
                        <input
                          type="text"
                          placeholder={formData.niche === "showroom" ? "Ropa y accesorios" : formData.niche === "agenda" ? "Masajes faciales" : "Cortes de carne"}
                          value={formData.contextData.service}
                          onChange={(e) => updateContext("service", e.target.value)}
                          className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Horarios */}
                    <div className="border border-[#E2E8F0] p-4 bg-[#FBFBFA] rounded-xl flex flex-col gap-4">
                      <label className="block text-xs font-semibold text-[#4B5563]">Horarios de atención *</label>
                      <div className="flex gap-1.5">
                        {["LU", "MA", "MI", "JU", "VI", "SA", "DO"].map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all border ${formData.contextData.scheduleDays.includes(day)
                                ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                                : "border-[#E2E8F0] bg-white text-[#4B5563] hover:border-[#94A3B8]"
                              }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Hora apertura *</label>
                          <input
                            type="time"
                            value={formData.contextData.openTime}
                            onChange={(e) => updateContext("openTime", e.target.value)}
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:border-[#94A3B8] outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Hora cierre *</label>
                          <input
                            type="time"
                            value={formData.contextData.closeTime}
                            onChange={(e) => updateContext("closeTime", e.target.value)}
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-sm text-[#1A1A1A] focus:border-[#94A3B8] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Campo de Encargado movido después de Horarios */}
                    <div className="flex flex-col gap-2 p-4 border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl shadow-sm mt-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
                          <Phone size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A1A]">Número del encargado de pedidos *</p>
                          <p className="text-[10px] text-[#6B7280]">Indica a qué número llegarán las notificaciones de pedidos o citas.</p>
                        </div>
                      </div>
                      <input
                        type="tel"
                        placeholder="593987654321"
                        value={formData.contextData.notifPhone || ""}
                        onChange={(e) => updateContext("notifPhone", e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:border-[#1A1A1A] transition-colors mt-1 font-mono"
                      />
                    </div>

                    {/* Caja de zonas de envío — solo Showroom (Movido aquí desde el paso 3) */}
                    {formData.niche === "showroom" && (
                      <div className="flex flex-col gap-2 p-4 border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl shadow-sm mt-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
                            <ArrowRight size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1A1A1A]">Zonas de envío</p>
                            <p className="text-[10px] text-[#6B7280]">Indica a qué ciudades, barrios o regiones realizas envíos. El agente informará a los clientes.</p>
                          </div>
                        </div>
                        <textarea
                          placeholder="Quito, Guayaquil, Cuenca. Envíos nacionales a través de Servientrega..."
                          value={formData.contextData.shippingZones || ""}
                          onChange={(e) => updateContext("shippingZones", e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:border-[#1A1A1A] transition-colors mt-1 resize-none leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Descripción y Dirección */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Descripción de perfil o biografía *</label>
                        <textarea
                          value={formData.contextData.description}
                          onChange={(e) => updateContext("description", e.target.value)}
                          placeholder={formData.niche === "showroom" ? "Moda urbana con envíos nacionales." : formData.niche === "agenda" ? "Centro de bienestar integral." : "Especialistas en carnes al carbón."}
                          className="w-full h-24 bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none resize-none transition-all leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5">Dirección física (Opcional)</label>
                        <textarea
                          value={formData.contextData.address}
                          onChange={(e) => updateContext("address", e.target.value)}
                          placeholder={formData.niche === "showroom" ? "Av. Amazonas y NNUU (Opcional si es online)" : formData.niche === "agenda" ? "Av. Mariana de Jesús" : "Calle Larga 4-56"}
                          className="w-full h-16 bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none resize-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Enlaces y Contacto */}
                    <div className="flex flex-col gap-3">
                      <label className="block text-xs font-semibold text-[#4B5563]">Enlaces y contacto adicionales</label>

                      <div className="flex bg-white border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:border-[#94A3B8] focus-within:ring-1 focus-within:ring-[#94A3B8] transition-all">
                        <div className="px-3 py-2 flex items-center justify-center bg-[#F9FAFB] border-r border-[#E2E8F0]">
                          <Globe size={14} className="text-[#6B7280]" />
                        </div>
                        <input type="text" placeholder="Página web" value={formData.contextData.website} onChange={e => updateContext("website", e.target.value)} className="w-full bg-transparent p-2.5 text-sm outline-none" />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 flex bg-white border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:border-[#94A3B8] focus-within:ring-1 focus-within:ring-[#94A3B8] transition-all">
                          <div className="px-3 py-2 flex items-center justify-center bg-[#F9FAFB] border-r border-[#E2E8F0]">
                            <Instagram size={14} className="text-[#6B7280]" />
                          </div>
                          <input type="text" placeholder="@usuario" value={formData.contextData.instagram} onChange={e => updateContext("instagram", e.target.value)} className="w-full bg-transparent p-2.5 text-sm outline-none" />
                        </div>
                        <div className="flex-1 flex bg-white border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:border-[#94A3B8] focus-within:ring-1 focus-within:ring-[#94A3B8] transition-all">
                          <div className="px-3 py-2 flex items-center justify-center bg-[#F9FAFB] border-r border-[#E2E8F0]">
                            <Facebook size={14} className="text-[#6B7280]" />
                          </div>
                          <input type="text" placeholder="/pagina" value={formData.contextData.facebook} onChange={e => updateContext("facebook", e.target.value)} className="w-full bg-transparent p-2.5 text-sm outline-none" />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 flex bg-white border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:border-[#94A3B8] focus-within:ring-1 focus-within:ring-[#94A3B8] transition-all">
                          <div className="px-3 py-2 flex items-center justify-center bg-[#F9FAFB] border-r border-[#E2E8F0]">
                            <Mail size={14} className="text-[#6B7280]" />
                          </div>
                          <input type="email" placeholder="Correo" value={formData.contextData.contactEmail} onChange={e => updateContext("contactEmail", e.target.value)} className="w-full bg-transparent p-2.5 text-sm outline-none" />
                        </div>
                        <div className="flex-1 flex bg-white border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:border-[#94A3B8] focus-within:ring-1 focus-within:ring-[#94A3B8] transition-all">
                          <div className="px-3 py-2 flex items-center justify-center bg-[#F9FAFB] border-r border-[#E2E8F0]">
                            <Phone size={14} className="text-[#6B7280]" />
                          </div>
                          <input type="tel" placeholder="Teléfono" value={formData.contextData.contactPhone} onChange={e => updateContext("contactPhone", e.target.value)} className="w-full bg-transparent p-2.5 text-sm outline-none" />
                        </div>
                      </div>


                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={
                        !formData.contextData.companyName || 
                        !formData.contextData.description ||
                        !formData.contextData.service ||
                        formData.contextData.scheduleDays.length === 0 ||
                        !formData.contextData.openTime ||
                        !formData.contextData.closeTime ||
                        !formData.contextData.notifPhone
                      }
                      className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333]"
                    >
                      Continuar al catálogo
                    </button>
                  </div>
                </motion.div>
              )}



              {/* ── PASO 3: CATÁLOGO / SERVICIOS ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  {/* TÍTULO DINÁMICO */}
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-bold text-[#1A1A1A]">
                      {ventasMethod === "choose" ? 
                        ((formData.niche as string) === "showroom" ? "¿Cómo prefieres subir tu catálogo?" : (formData.niche as string) === "agenda" ? "¿Cómo prefieres subir tus servicios?" : "¿Cómo prefieres subir tu menú?") :
                        ventasMethod === "ai" ? 
                        ((formData.niche as string) === "showroom" ? "Sube tu catálogo de productos" : (formData.niche as string) === "agenda" ? "Sube fotos de tus servicios" : "Sube fotos de tu menú") : 
                        ((formData.niche as string) === "showroom" ? "Enlista tus productos y precios" : (formData.niche as string) === "agenda" ? "Enlista tus servicios y precios" : "Enlista tus platos y precios")
                      }
                    </h2>
                    <p className="text-xs text-[#6B7280] leading-relaxed">
                      {ventasMethod === "ai" && "Nuestra IA analizará las fotos y extraerá las características automáticamente."}
                      {ventasMethod !== "choose" && ((formData.niche as string) === "agenda" ? "Define los servicios que tu agente digital ofrecerá." : (formData.niche as string) === "showroom" ? "Define los productos que tu agente digital ofrecerá." : "Define los productos que tu mesero digital ofrecerá.") }
                    </p>
                  </div>

                  <div className="max-h-[55vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar pb-4">

                    {/* 1. SELECCIÓN PARA CATÁLOGOS */}
                    {(formData.niche === "ventas" || formData.niche === "showroom" || formData.niche === "agenda") && ventasMethod === "choose" && (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => setVentasMethod("ai")}
                          className="flex items-center gap-4 p-5 border border-[#E2E8F0] bg-white rounded-2xl hover:border-[#1A1A1A] transition-all group"
                        >
                          <div className="w-10 h-10 bg-[#F3F4F6] rounded-xl flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
                            <Scan size={20} />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-[#1A1A1A]">Usar Cámara / IA</span>
                            <span className="text-[10px] text-[#6B7280]">{(formData.niche as string) === "showroom" ? "Sube fotos de tus productos" : (formData.niche as string) === "agenda" ? "Sube fotos de tus servicios o folletos" : "Sube una foto de tu menú físico"}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setVentasMethod("manual")}
                          className="flex items-center gap-4 p-5 border border-[#E2E8F0] bg-white rounded-2xl hover:border-[#1A1A1A] transition-all group"
                        >
                          <div className="w-10 h-10 bg-[#F3F4F6] rounded-xl flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
                            <Copy size={20} />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-[#1A1A1A]">Lista Manual</span>
                            <span className="text-[10px] text-[#6B7280]">{(formData.niche as string) === "showroom" ? "Escribe los productos uno a uno" : (formData.niche as string) === "agenda" ? "Escribe los servicios uno a uno" : "Escribe los platillos uno a uno"}</span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* 2. ENTRADA MANUAL */}
                    {ventasMethod === "manual" && (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 p-3 bg-[#FBFBFA] border border-[#E2E8F0] rounded-xl">
                          <div className="flex gap-2">
                            <div className="flex-[3]">
                              <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Nombre</label>
                              <input
                                type="text"
                                placeholder={formData.niche === "agenda" ? "Limpieza profunda" : formData.niche === "showroom" ? "Zapatillas Urban" : "Hamburguesa clásica"}
                                value={manualItem.name}
                                onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                                className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                              />
                            </div>
                            <div className="flex-[2]">
                              <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Precio</label>
                              <input
                                type="text"
                                placeholder="$5.00"
                                value={manualItem.price}
                                onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                                className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Info complementaria (opcional)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={(formData.niche as string) === "showroom" ? "Tallas S, M, L. Algodón." : (formData.niche as string) === "agenda" ? "Incluye lavado y secado." : "Con papas fritas y bebida."}
                                value={manualItem.info}
                                onChange={(e) => setManualItem({ ...manualItem, info: e.target.value })}
                                className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                              />
                              <button
                                onClick={handleAddManualItem}
                                className="bg-[#1A1A1A] text-white p-2.5 rounded-lg hover:bg-[#333] transition-colors flex-shrink-0"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* LISTA DE ITEMS MANUALES */}
                        <div className="flex flex-col gap-2">
                          {formData.products.filter(p => !p.url_foto).map((prod, idx) => {
                            const actualIdx = formData.products.indexOf(prod);
                            return (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={idx}
                              className="flex items-center justify-between p-3 border border-[#E2E8F0] bg-white rounded-xl group hover:border-[#94A3B8] transition-all"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#1A1A1A]">{prod.categoria}</span>
                                <span className="text-[10px] text-[#6B7280] font-medium">{formData.niche === "agenda" ? "Servicio" : formData.niche === "showroom" ? "Producto" : "Platillo"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-[#1A1A1A] bg-[#F3F4F6] px-2 py-1 rounded-md">{prod.marca.includes('$') ? prod.marca : `$${prod.marca}`}</span>
                                <button
                                  onClick={() => {
                                    setManualItem({ name: prod.categoria, price: prod.marca, info: prod.caracteristicas !== "Entrada manual" ? prod.caracteristicas : "" });
                                    setFormData({ ...formData, products: formData.products.filter((_, i) => i !== actualIdx) });
                                  }}
                                  className="text-[#94A3B8] hover:text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. CATÁLOGO IA */}
                    {ventasMethod === "ai" && (
                      <div className="flex flex-col gap-5">


                        {/* Contador de imágenes escaneadas — ventas, agenda y showroom */}
                        {(["ventas", "agenda", "showroom"] as string[]).includes(formData.niche) && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#6B7280] font-medium">Imágenes escaneadas</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scannedImageCount >= 2 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                              }`}>{scannedImageCount}/2</span>
                          </div>
                        )}

                        {scannedImageCount < (((["ventas", "agenda", "showroom"] as string[]).includes(formData.niche)) ? 2 : 99) ? (

                          <div className="border border-dashed border-[#94A3B8] bg-[#FBFBFA] hover:bg-[#F3F4F6] hover:border-[#1A1A1A] transition-colors rounded-xl p-6 flex flex-col items-center justify-center relative group cursor-pointer h-36">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              title=""
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isLoading}
                            />
                            {analyzingStep === "IDLE" || analyzingStep === "COMPLETADO" || analyzingStep === "ERROR" ? (
                              <div className="flex flex-col items-center gap-3 text-[#6B7280] group-hover:text-[#1A1A1A]">
                                <div className="w-10 h-10 bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center rounded-full">
                                  <Upload size={18} />
                                </div>
                                <span className="text-xs font-medium">Hacer clic o arrastrar imagen aquí</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-[#1A1A1A]">
                                <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
                                <span className="text-xs font-medium animate-pulse">
                                  {analyzingStep === "SUBIENDO" ? "Subiendo archivo..." : "Analizando características..."}
                                </span>
                              </div>
                            )}
                            {analyzingStep === "ERROR" && <span className="text-xs font-semibold text-red-500 mt-3">Error procesando imagen. Intenta otra vez.</span>}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1A1A1A] rounded-xl">
                              <Lock size={12} className="text-white shrink-0" />
                              <span className="text-[10px] font-semibold text-white">Límite de 2 imágenes alcanzado. Añade items adicionales manualmente.</span>
                            </div>
                            {/* ENTRADA MANUAL INTEGRADA */}

                            <div className="flex flex-col gap-2 p-3 bg-[#FBFBFA] border border-[#E2E8F0] rounded-xl">
                              <div className="flex gap-2">
                                <div className="flex-[3]">
                                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Nombre</label>
                                  <input
                                    type="text"
                                    placeholder={(formData.niche as string) === "agenda" ? "Limpieza profunda" : (formData.niche as string) === "showroom" ? "Zapatillas Urban" : "Hamburguesa clásica"}
                                    value={manualItem.name}
                                    onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                                  />
                                </div>
                                <div className="flex-[2]">
                                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Precio</label>
                                  <input
                                    type="text"
                                    placeholder="$5.00"
                                    value={manualItem.price}
                                    onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                                  />
                                </div>


                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1 ml-1">Info complementaria (opcional)</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder={(formData.niche as string) === "showroom" ? "Tallas S, M, L. Algodón." : (formData.niche as string) === "agenda" ? "Incluye lavado y secado." : "Con papas fritas y bebida."}
                                    value={manualItem.info}
                                    onChange={(e) => setManualItem({ ...manualItem, info: e.target.value })}
                                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#1A1A1A] transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                                  />
                                  <button
                                    onClick={handleAddManualItem}
                                    className="bg-[#1A1A1A] text-white p-2.5 rounded-lg hover:bg-[#333] transition-colors flex-shrink-0"
                                  >
                                    <Check size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}


                        {currentProduct.url_foto && analyzingStep === "COMPLETADO" && (
                          <div className="border border-[#E2E8F0] bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Análisis Inteligente Listo</span>
                            </div>
                            <div className="flex gap-5">
                              <img src={currentProduct.url_foto} alt="Preview" className="w-24 h-24 object-cover border border-[#E2E8F0] rounded-md shadow-sm" />
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-semibold text-[#6B7280] uppercase">Categoría</label>
                                  <input type="text" value={currentProduct.categoria} onChange={(e) => setCurrentProduct({ ...currentProduct, categoria: e.target.value })} className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-semibold text-[#6B7280] uppercase">{(formData.niche as string) === "showroom" ? "Marca" : "Precio"}</label>
                                  <input type="text" value={currentProduct.marca} onChange={(e) => setCurrentProduct({ ...currentProduct, marca: e.target.value })} className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none" />
                                </div>
                                { (formData.niche as string) === "showroom" && (
                                  <>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[10px] font-semibold text-[#6B7280] uppercase">Color</label>
                                      <input type="text" value={currentProduct.color_principal} onChange={(e) => setCurrentProduct({ ...currentProduct, color_principal: e.target.value })} className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[10px] font-semibold text-[#6B7280] uppercase">Estilo</label>
                                      <input type="text" value={currentProduct.estilo} onChange={(e) => setCurrentProduct({ ...currentProduct, estilo: e.target.value })} className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none" />
                                    </div>
                                  </>
                                )}
                                { (formData.niche as string) !== "showroom" && (
                                  <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-[10px] font-semibold text-[#6B7280] uppercase">Tipo / Categoría</label>
                                    <input type="text" value={currentProduct.color_principal} onChange={(e) => setCurrentProduct({ ...currentProduct, color_principal: e.target.value })} placeholder="Ej: Servicio, Masaje, Combo..." className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                              <label className="text-[10px] font-semibold text-[#6B7280] uppercase">Características a resaltar</label>
                              <input type="text" value={currentProduct.caracteristicas} onChange={(e) => setCurrentProduct({ ...currentProduct, caracteristicas: e.target.value })} className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none leading-relaxed" />
                            </div>
                            <button onClick={handleAddProduct} className="bg-[#F3F4F6] border border-[#E2E8F0] text-[#1A1A1A] font-semibold text-xs py-3 mt-1 rounded-lg hover:bg-[#E5E7EB] transition-colors">
                              
                            </button>
                          </div>
                        )}

                        {formData.products.filter(p => p.url_foto).length > 0 && (
                          <div className="flex flex-col gap-3 mt-4">
                            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Productos Agregados ({formData.products.filter(p => p.url_foto).length}/5)</span>
                            <div className="grid grid-cols-2 gap-3">
                              {formData.products.filter(p => p.url_foto).map((prod: any, idx: number) => (
                                <div key={idx} className="flex border border-[#E2E8F0] bg-white rounded-lg p-2.5 gap-3 items-center shadow-sm">
                                  <img src={prod.url_foto} className="w-10 h-10 object-cover rounded-md border border-[#E2E8F0]" />
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-semibold text-[#1A1A1A] truncate">{prod.categoria || "Producto"}</span>
                                    <span className="text-[10px] text-[#6B7280] truncate">{prod.marca || "Generic"} • {prod.color_principal}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => {
                        if (ventasMethod !== "choose") {
                          setVentasMethod("choose")
                        } else {
                          setStep(2)
                        }
                      }}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      disabled={
                        ventasMethod === "choose" || formData.products.length === 0
                      }
                      className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333]"
                    >
                      Continuar
                    </button>

                  </div>
                </motion.div>
              )}

              {/* ── PASO 4: QR + TEST ── */}
              {step === 4 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-6"
                >
                  <p className="text-sm text-[#4B5563] leading-relaxed text-center">
                    Vincula un número de WhatsApp Business o Normal a tu Agente. Desde este número se atenderá a tus clientes forma automática.
                  </p>

                  <div className="flex flex-col gap-3">
                    {!connectionMethod && !evoConnected && (
                      <div className="flex flex-col gap-4 mt-2">
                        {evoError && (
                          <div className="p-3 border border-red-200 bg-red-50 text-red-700 text-xs font-medium rounded-lg text-center">
                            Error: {evoError}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleEvoConnect("qr")} className="p-6 border border-[#E2E8F0] bg-white rounded-xl shadow-sm hover:border-[#94A3B8] hover:bg-[#FBFBFA] transition-all flex flex-col items-center gap-3">
                            <Scan className="w-8 h-8 text-[#4B5563]" />
                            <span className="text-sm font-semibold text-[#1A1A1A]">Escanear QR</span>
                          </button>
                          <button onClick={() => setConnectionMethod("code")} className="p-6 border border-[#E2E8F0] bg-white rounded-xl shadow-sm hover:border-[#94A3B8] hover:bg-[#FBFBFA] transition-all flex flex-col items-center gap-3">
                            <Phone className="w-8 h-8 text-[#4B5563]" />
                            <span className="text-sm font-semibold text-[#1A1A1A]">Código Numérico</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {connectionMethod === "qr" && !evoConnected && (
                      <div className="border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl p-6 flex flex-col items-center gap-4 shadow-sm">
                        <div className="flex items-center justify-between w-full mb-2">
                          <button onClick={() => { setConnectionMethod(null); setQrBase64(null) }} className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] transition-colors rounded-md py-1">
                            ← Regresar
                          </button>
                          <span className="text-xs font-medium text-[#94A3B8] animate-pulse">Esperando conexión...</span>
                        </div>

                        {evoLoading || !qrBase64 ? (
                          <div className="w-48 h-48 bg-white border border-[#E2E8F0] rounded-lg shadow-sm flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 text-[#1A1A1A] animate-spin" />
                            <span className="text-xs text-[#6B7280] font-medium">Generando QR...</span>
                          </div>
                        ) : (
                          <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm w-48 h-48">
                            <img src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <span className="text-xs text-[#4B5563] text-center mt-3 leading-relaxed">
                          Abre WhatsApp en tu teléfono → Dispositivos Vinculados → Vincular dispositivo<br />
                          <strong className="text-[#1A1A1A] mt-2 block">Se redireccionará al panel automáticamente de forma exitosa.</strong>
                        </span>

                        <button onClick={() => handleEvoConnect("qr")} className="mt-2 text-[#4B5563] text-xs font-medium flex items-center gap-2 hover:bg-[#F3F4F6] transition-colors px-4 py-2 border border-[#E2E8F0] bg-white rounded-lg shadow-sm">
                          <RefreshCw className="w-3 h-3" /> Recargar código
                        </button>
                      </div>
                    )}

                    {connectionMethod === "code" && !evoConnected && (
                      <div className="border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                        <div className="flex items-center justify-between w-full mb-1">
                          <button onClick={() => { setConnectionMethod(null); setPairingCode(null) }} className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] transition-colors py-1">
                            ← Regresar
                          </button>
                          <span className="text-xs font-medium text-[#94A3B8] animate-pulse">Esperando vinculación</span>
                        </div>

                        {!pairingCode ? (
                          <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold text-[#4B5563]">Número para vincular:</span>
                            <input
                              type="tel"
                              placeholder="593999999999"
                              value={formData.testPhone}
                              onChange={(e) => setFormData({ ...formData, testPhone: e.target.value.replace(/\D/g, "") })}
                              className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] font-mono focus:border-[#1A1A1A] outline-none transition-colors"
                            />
                            <p className="text-[10px] text-[#6B7280]">Ingresa el número con el código de país para obtener el código.</p>
                            <button onClick={() => handleEvoConnect("code")} disabled={evoLoading || formData.testPhone.length < 8} className="w-full py-3 mt-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50">
                              {evoLoading ? "Generando..." : "Obtener código de vinculación"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 mt-2">
                            <div className="flex items-center gap-4 bg-white border border-[#E2E8F0] rounded-xl shadow-sm px-6 py-4 mt-2">
                              <span className="text-3xl font-bold tracking-[0.2em] text-[#1A1A1A]">
                                {pairingCode}
                              </span>
                              <button onClick={() => navigator.clipboard.writeText(pairingCode)} className="text-[#6B7280] hover:text-[#1A1A1A] p-2 bg-[#F3F4F6] rounded-md transition-colors border border-[#E2E8F0]" title="Copiar">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-xs text-[#4B5563] text-center max-w-sm leading-relaxed mt-2">
                              Abre WhatsApp → Dispositivos Vinculados → <strong>Vincular con tu número de teléfono.</strong><br />
                              <strong className="text-[#1A1A1A] mt-3 block py-2 px-3 bg-[#F3F4F6] rounded-md">Al conectar serás redirigido a tu panel de control.</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {evoConnected && (
                      <div className="border border-green-200 bg-green-50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 shadow-sm mt-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <span className="text-sm font-bold text-green-800 text-center block mt-2">
                          ¡Conexión Existosa! <br /> Todo está listo.
                        </span>
                        <p className="text-xs text-green-700 text-center font-medium mt-1">El agente ya tiene acceso y control de tu WhatsApp.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-[1px] bg-[#E2E8F0]" />
          <div className="px-8 py-4 flex items-center justify-between bg-[#FBFBFA]">
            <span className="text-[10px] font-semibold text-[#94A3B8]">
              Quantum Platform
            </span>
            <span className="text-[10px] font-semibold text-[#94A3B8]">
              Setup 2.0
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
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <span className="text-[#1A1A1A] text-sm font-semibold animate-pulse">
          Cargando entorno seguro...
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