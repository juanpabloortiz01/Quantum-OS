"use client"

import { signIn, useSession } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Instagram, Facebook, Mail, Phone, Upload, CheckCircle, Scan, ArrowLeft, ArrowRight, RefreshCw, Loader2, Copy, Calendar, Coffee, ShoppingBag, Sparkles, Zap, Shield, Lock, Check, Pencil, Clock, X } from "lucide-react"

import dynamic from "next/dynamic"
const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false })
import { finalizeOnboarding, registerQuantumUser, sendTestPing, getCloudinaryConfig, setupEvolutionInstance, checkEvolutionConnectionState, registerAndFinalizeOnboarding } from "./action"


const NICHES = [
  {
    id: "agenda",
    label: "Clínicas",
    desc: "Perfecto para negocios que venden su tiempo por citas.",
    tags: ["Clínicas", "Estéticas", "Barberías", "Veterinarias", "Estudios de Tatuajes"],
    icon: Calendar,
    needs: ["crm"]
  },
  {
    id: "ventas",
    label: "Restaurantes",
    desc: "Perfecto para negocios con alta rotación que toman pedidos por chat. Tú solo cobras y envías.",
    tags: ["Dropshippers", "Restaurantes", "Farmacias", "Cafeterías", "Floristerías y Tiendas de Regalos", "Tiendas Deliveries 24/7"],
    icon: Coffee,
    needs: ["orders", "crm"]
  },
]




const smoothEase = [0.25, 0.1, 0.25, 1] as const;

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: smoothEase,
      staggerChildren: 0.08,
      delayChildren: 0.1
    } 
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    transition: { duration: 0.3, ease: "easeIn" } 
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: smoothEase } 
  }
} as const;

const titleVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: smoothEase } }
} as const;

function OnboardingContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status ?? "loading"
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialStep = searchParams.get("step") ? parseInt(searchParams.get("step") as string, 10) : 1
  const [step, setStep] = useState(initialStep)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [agentPhoneRaw, setAgentPhoneRaw] = useState("")
  const [agentPhoneCountry, setAgentPhoneCountry] = useState("593")
  const [isLoading, setIsLoading] = useState(false)
  const [pingStatus, setPingStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [scheduleSubStep, setScheduleSubStep] = useState<"choose" | "config">("choose")

  // States for EVO QR/Code Sync
  const [connectionMethod, setConnectionMethod] = useState<"qr" | "code" | null>(null)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [evoLoading, setEvoLoading] = useState(false)
  const [evoConnected, setEvoConnected] = useState(false)
  const [evoError, setEvoError] = useState<string | null>(null)
  const [tempId, setTempId] = useState<string | null>(null)
  const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const [formData, setFormData] = useState({
    niche: "ventas",
    needs: ["orders", "crm"] as string[],
    contextData: {
      companyName: "",
      service: "",
      scheduleDays: [] as string[],
      openTime: "09:00",
      closeTime: "18:00",
      description: "",
      locationConfig: { hasPhysicalLocation: true, lat: -0.180653, lng: -78.467834, address: "" },
      website: "",
      instagram: "",
      facebook: "",
      contactEmail: "",
      contactPhone: "",
      notifPhone: "",
      shippingZones: "",
      menuImageUrl: "",
      menuImages: [] as string[],
      scheduleType: "custom" as "custom" | "24h",
      scheduleConfig: {
        LU: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        MA: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        MI: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        JU: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        VI: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
        SA: { isOpen: false, openTime: "09:00", closeTime: "18:00" },
        DO: { isOpen: false, openTime: "09:00", closeTime: "18:00" },
      } as Record<string, { isOpen: boolean; openTime: string; closeTime: string }>,
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

  // Cargar estado inicial desde localStorage al montar
  useEffect(() => {
    try {
      const urlStep = searchParams.get("step")
      if (urlStep) {
        setStep(parseInt(urlStep, 10))
      } else {
        const savedStep = localStorage.getItem("onboarding_step")
        if (savedStep !== null) {
          const parsed = parseInt(savedStep, 10)
          // Never go back to step 0 (removed niche selection)
          setStep(parsed < 1 ? 1 : parsed)
        }
      }

      const savedEmail = localStorage.getItem("onboarding_email")
      if (savedEmail) setEmail(savedEmail)

      const savedFormData = localStorage.getItem("onboarding_formData")
      if (savedFormData) setFormData(JSON.parse(savedFormData))

      const savedTempId = localStorage.getItem("onboarding_tempId")
      if (savedTempId) {
        setTempId(savedTempId)
      } else {
        const newTempId = crypto.randomUUID()
        setTempId(newTempId)
        localStorage.setItem("onboarding_tempId", newTempId)
      }

      const savedActiveInstanceName = localStorage.getItem("onboarding_activeInstanceName")
      if (savedActiveInstanceName) setActiveInstanceName(savedActiveInstanceName)

      const savedConnectionMethod = localStorage.getItem("onboarding_connectionMethod")
      if (savedConnectionMethod) setConnectionMethod(savedConnectionMethod as any)

      const savedVentasMethod = localStorage.getItem("onboarding_ventasMethod")
      if (savedVentasMethod) setVentasMethod(savedVentasMethod as any)

      const savedAgentPhoneRaw = localStorage.getItem("onboarding_agentPhoneRaw")
      if (savedAgentPhoneRaw) setAgentPhoneRaw(savedAgentPhoneRaw)

      const savedAgentPhoneCountry = localStorage.getItem("onboarding_agentPhoneCountry")
      if (savedAgentPhoneCountry) setAgentPhoneCountry(savedAgentPhoneCountry)

      const savedEvoConnected = localStorage.getItem("onboarding_evoConnected")
      if (savedEvoConnected) setEvoConnected(savedEvoConnected === "true")
    } catch (e) {
      console.error("Error loading onboarding state from localStorage", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem("onboarding_step", step.toString())
      localStorage.setItem("onboarding_email", email)
      localStorage.setItem("onboarding_formData", JSON.stringify(formData))
      if (tempId) localStorage.setItem("onboarding_tempId", tempId)
      
      if (activeInstanceName) localStorage.setItem("onboarding_activeInstanceName", activeInstanceName)
      else localStorage.removeItem("onboarding_activeInstanceName")
      
      if (connectionMethod) localStorage.setItem("onboarding_connectionMethod", connectionMethod)
      else localStorage.removeItem("onboarding_connectionMethod")

      localStorage.setItem("onboarding_ventasMethod", ventasMethod)
      localStorage.setItem("onboarding_agentPhoneRaw", agentPhoneRaw)
      localStorage.setItem("onboarding_agentPhoneCountry", agentPhoneCountry)
      localStorage.setItem("onboarding_evoConnected", evoConnected.toString())
    } catch (e) {
      console.error("Error saving onboarding state to localStorage", e)
    }
  }, [isLoaded, step, email, formData, tempId, activeInstanceName, connectionMethod, ventasMethod, agentPhoneRaw, agentPhoneCountry, evoConnected])

  const clearOnboardingLocalStorage = () => {
    try {
      localStorage.removeItem("onboarding_step")
      localStorage.removeItem("onboarding_email")
      localStorage.removeItem("onboarding_formData")
      localStorage.removeItem("onboarding_tempId")
      localStorage.removeItem("onboarding_activeInstanceName")
      localStorage.removeItem("onboarding_connectionMethod")
      localStorage.removeItem("onboarding_ventasMethod")
      localStorage.removeItem("onboarding_agentPhoneRaw")
      localStorage.removeItem("onboarding_agentPhoneCountry")
      localStorage.removeItem("onboarding_evoConnected")
    } catch (e) {
      console.error("Error clearing onboarding localStorage", e)
    }
  }

  // Cuenta cuántas imágenes distintas han sido escaneadas con IA
  // (aplica a ventas, agenda Y showroom)
  const scannedImageCount = new Set(
    formData.products
      .filter(p => p.url_foto && (p.color_principal === "Menú" || p.color_principal !== "Manual"))
      .map(p => p.url_foto)
  ).size

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (step === 5 && connectionMethod && !evoConnected) {
      interval = setInterval(async () => {
        const res = await checkEvolutionConnectionState(tempId || undefined, activeInstanceName || undefined)
        if (res.connected) {
          setEvoConnected(true)
          clearInterval(interval)
          // Automático al paso de creación de cuenta tras 1.5s
          setTimeout(() => {
            setStep(7)
          }, 1500)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [step, connectionMethod, evoConnected, activeInstanceName])

  useEffect(() => {
    if (step === 5 && evoConnected) {
      const timer = setTimeout(() => {
        setStep(7)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, evoConnected])

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
          setStep(7)
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

      if (formData.niche === "ventas") {
        setFormData((prev: any) => {
          const currentImages = prev.contextData.menuImages || [];
          return {
            ...prev,
            contextData: {
              ...prev.contextData,
              menuImages: [...currentImages, imageUrl].slice(0, 5)
            }
          };
        });
        setAnalyzingStep("COMPLETADO")
        setIsLoading(false)
        return
      }

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

  const updateDayTime = (dayKey: string, field: "openTime" | "closeTime", value: string) => {
    setFormData(prev => ({
      ...prev,
      contextData: {
        ...prev.contextData,
        scheduleConfig: {
          ...prev.contextData.scheduleConfig,
          [dayKey]: {
            ...prev.contextData.scheduleConfig[dayKey],
            [field]: value
          }
        }
      }
    }))
  }

  const toggleDayStatus = (dayKey: string) => {
    setFormData(prev => ({
      ...prev,
      contextData: {
        ...prev.contextData,
        scheduleConfig: {
          ...prev.contextData.scheduleConfig,
          [dayKey]: {
            ...prev.contextData.scheduleConfig[dayKey],
            isOpen: !prev.contextData.scheduleConfig[dayKey].isOpen
          }
        }
      }
    }))
  }

  const handleSaveSchedule = () => {
    const config = formData.contextData.scheduleConfig
    const activeDays = Object.keys(config).filter(day => config[day].isOpen)
    
    let legacyOpen = "09:00"
    let legacyClose = "18:00"
    if (formData.contextData.scheduleType === "24h") {
      legacyOpen = "00:00"
      legacyClose = "24:00"
    } else if (activeDays.length > 0) {
      legacyOpen = config[activeDays[0]].openTime
      legacyClose = config[activeDays[0]].closeTime
    }

    setFormData(prev => ({
      ...prev,
      contextData: {
        ...prev.contextData,
        scheduleDays: activeDays,
        openTime: legacyOpen,
        closeTime: legacyClose
      }
    }))

    setStep(4)
  }

  // Leer errores de NextAuth en la URL (ej. OAuthAccountNotLinked o Configuration)
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(`Error de acceso: ${errorParam}`)
    }
  }, [searchParams])

  // Si está autenticado, redirigir al dashboard si ya completó el onboarding
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/check-onboarding")
        .then((r) => r.json())
        .then((data) => {
          if (data.completed) {
            router.push("/dashboard")
          }
        })
        .catch(() => {})
    }
  }, [status, router])


  const toggleNeed = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      needs: prev.needs.includes(id)
        ? prev.needs.filter((n) => n !== id)
        : [...prev.needs, id],
    }))
  }

  const validateAgentPhone = () => {
    setPhoneError("");
    const country = agentPhoneCountry;
    const rawNumber = agentPhoneRaw.trim().replace(/\D/g, ''); // Solo números

    if (!rawNumber) {
      setPhoneError("Debes ingresar un número.");
      return false;
    }

    if (country === "57" && rawNumber.length !== 10) {
      setPhoneError(`Los números de Colombia deben tener 10 dígitos (ingresaste ${rawNumber.length}).`);
      return false;
    }
    if (country === "51" && rawNumber.length !== 9) {
      setPhoneError(`Los números de Perú deben tener 9 dígitos (ingresaste ${rawNumber.length}).`);
      return false;
    }
    if (country === "58" && rawNumber.length !== 10) {
      setPhoneError(`Los números de Venezuela deben tener 10 dígitos (ingresaste ${rawNumber.length}).`);
      return false;
    }
    if (country === "54" && (rawNumber.length < 9 || rawNumber.length > 11)) {
      setPhoneError(`Los números de Argentina deben tener entre 9 y 11 dígitos (ingresaste ${rawNumber.length}).`);
      return false;
    }
    if (country === "593" && rawNumber.length !== 9) {
      setPhoneError(`Los números de Ecuador deben tener 9 dígitos (ingresaste ${rawNumber.length}).`);
      return false;
    }

    // Normalizamos el testPhone
    setFormData((prev) => ({
      ...prev,
      testPhone: `${country}${rawNumber}`
    }));

    return true;
  };

  const handleFinalize = async () => {
    setIsLoading(true)
    setError("")

    if (status === "unauthenticated") {
      if (!isValidEmail(email)) {
        setError("Por favor ingresa un correo válido.")
        setIsLoading(false)
        return
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.")
        setIsLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.")
        setIsLoading(false)
        return
      }

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
      const result = await finalizeOnboarding({
        userId: session.user.id,
        niche: formData.niche,
        needs: formData.needs,
        contextData: formData.contextData,
        products: formData.products,
        testPhone: formData.testPhone,
        tempId: tempId || undefined,
      })
      if (result && "error" in result) {
        setError(result.error as string)
        setIsLoading(false)
        return
      }
    }

    clearOnboardingLocalStorage()
    setIsLoading(false)
    router.push("/dashboard")
  };

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

      <div className={`relative z-10 w-full transition-all duration-500 ${step === 1 || step === 2 ? "max-w-2xl" : "max-w-md"}`}>

        {/* HEADER MINI */}
        {step >= 1 && (
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
              Paso {step}/7
            </div>
          </div>
        )}

        {/* TARJETA PRINCIPAL */}
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm relative overflow-hidden">

          {/* Barra de progreso superior */}
          {step >= 1 && (
            <div className="h-1 flex bg-[#F3F4F6] overflow-hidden">
              <motion.div 
                className="h-full bg-[#F54927]"
                initial={{ width: "14.2%" }}
                animate={{ width: `${(step / 7) * 100}%` }}
                transition={{ duration: 0.6, ease: smoothEase }}
              />
            </div>
          )}

          <div className="p-8">
            {/* Título */}
            <div className="mb-8 text-center flex flex-col gap-1 overflow-hidden">
              {step !== 6 && (
                <motion.span 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider"
                >
                  Configuración del Asistente
                </motion.span>
              )}
              <AnimatePresence mode="wait">
                <motion.h1 
                  key={step}
                  variants={titleVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="text-2xl font-bold tracking-tight text-[#1A1A1A]"
                >
                  {step === 1 && "Describe tu negocio"}
                  {step === 3 && "Ubicación del local"}
                  {step === 4 && "Horarios de atención"}
                  {step === 5 && "Sube tu menú"}
                  {step === 6 && "Conexión del Agente IA"}
                  {step === 7 && "Conecta tu WhatsApp"}
                  {step === 8 && "Crear una cuenta"}
                </motion.h1>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.p
                    key="step1-desc"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-[#4B5563] leading-relaxed mt-1 px-4"
                  >
                    Las respuestas de tu inteligencia artificial se basarán en estos datos. Asegúrate de llenarlo detalladamente.
                  </motion.p>
                )}
                {step === 3 && (
                  <motion.p
                    key="step2-desc"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-[#4B5563] leading-relaxed mt-1 px-4"
                  >
                    Define los horarios de funcionamiento de tu negocio para que el asistente pueda responder e informar adecuadamente.
                  </motion.p>
                )}
                {step === 5 && (
                  <motion.p
                    key="step4-desc"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-[#4B5563] leading-relaxed mt-1 px-4"
                  >
                    Configura el número de teléfono desde el cual el agente interactuará con tus clientes.
                  </motion.p>
                )}
                {step === 6 && (
                  <motion.p
                    key="step5-desc"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-[#4B5563] leading-relaxed mt-1 px-4"
                  >
                    Vincula un número de WhatsApp Business o Normal a tu Agente. Desde este número se atenderá a tus clientes forma automática.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {/* ── PASO 0: SELECCIÓN DE NODO CUÁNTICO ── */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-5"
                >
                  <motion.div variants={itemVariants} className="text-center mb-2">
                    <p className="text-sm text-[#6B7280]">
                      Selecciona la especialidad de tu agente
                    </p>
                  </motion.div>

                  <div className="flex flex-col gap-4">
                    {NICHES.map((niche, idx) => {
                      const active = formData.niche === niche.id;
                      const Icon = niche.icon;
                      return (
                        <motion.button
                          variants={itemVariants}
                          whileTap={{ scale: 0.98 }}
                          key={niche.id}
                          onClick={() => setFormData({
                            ...formData,
                            niche: niche.id,
                            needs: niche.needs
                          })}
                          className={`group relative p-5 text-left transition-all border rounded-2xl overflow-hidden ${active
                              ? "border-[#1A1A1A] bg-white shadow-md"
                              : "border-[#E2E8F0] bg-white hover:border-[#94A3B8] hover:shadow-sm"
                            }`}
                        >
                          <div className="relative z-10 flex gap-4 w-full">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${active ? "bg-[#1A1A1A] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                              <Icon size={24} />
                            </div>

                            <div className="flex flex-col gap-1 w-full justify-center">
                              <div className="flex items-center justify-between min-h-[48px]">
                                <span className={`text-base font-bold tracking-tight ${active ? "text-[#1A1A1A]" : "text-[#4B5563]"}`}>
                                  {niche.label}
                                </span>
                                {active && (
                                  <motion.div layoutId="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <CheckCircle className="w-5 h-5 text-[#1A1A1A]" fill="#1A1A1A" stroke="white" />
                                  </motion.div>
                                )}
                              </div>
                              <AnimatePresence>
                                {active && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: "auto", opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden flex flex-col gap-3 mt-1"
                                  >
                                    <p className="text-xs text-[#6B7280] leading-relaxed">
                                      {niche.desc}
                                    </p>
                                    <div className="flex flex-wrap gap-2 pb-2">
                                      {niche.tags?.map((tag: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-[#F3F4F6] border border-[#E2E8F0] text-[#4B5563] text-[10px] font-semibold rounded-full">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  <motion.button
                    variants={itemVariants}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setStep(1)}
                    disabled={!formData.niche}
                    className="w-full py-4 text-sm font-bold transition-all rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
                  >
                    Activar Protocolo
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.div>
              )}


              {/* ── PASO 1: MEMORIA BASE ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >

                  <div className="max-h-[50vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar">

                    {/* Campos Principales */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Nombre del negocio *</label>
                        <input
                          type="text"
                          placeholder={formData.niche === "agenda" ? "Clínica Dental OdontoSalud" : "El Gaucho"}
                          value={formData.contextData.companyName}
                          onChange={(e) => updateContext("companyName", e.target.value)}
                          className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">{formData.niche === 'agenda' ? 'Servicio principal o especialidad' : 'Servicio o producto principal'} *</label>
                        <input
                          type="text"
                          placeholder={formData.niche === "agenda" ? "Ortodoncia, Implantes y Odontología General" : "Cortes de carne y asados"}
                          value={formData.contextData.service}
                          onChange={(e) => updateContext("service", e.target.value)}
                          className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Campo de Encargado */}
                    <div className="flex flex-col gap-2 p-4 border border-[#E2E8F0] bg-white rounded-xl mt-0">
                      <div>
                        <p className="text-xs font-semibold text-[#4B5563] uppercase">{formData.niche === 'agenda' ? 'Número del encargado de las citas' : 'Número del encargado de pedidos'} *</p>
                        <p className="text-[10px] text-[#6B7280] mt-0.5">{formData.niche === 'agenda' ? 'Indica a qué número llegarán las notificaciones de las citas.' : 'Indica a qué número llegarán las notificaciones de pedidos o citas.'}</p>
                      </div>
                      <input
                        type="tel"
                        placeholder="593987654321"
                        value={formData.contextData.notifPhone || ""}
                        onChange={(e) => updateContext("notifPhone", e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:border-[#94A3B8] transition-colors mt-1 font-mono"
                      />
                    </div>

                    {/* Descripción y Dirección */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Descripción del negocio *</label>
                        <textarea
                          value={formData.contextData.description}
                          onChange={(e) => updateContext("description", e.target.value)}
                          placeholder={formData.niche === "agenda" ? "Clínica odontológica con especialistas en ortodoncia, implantes y estética dental." : "Especialistas en carnes al carbón y tradición gastronómica."}
                          className="w-full h-24 bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none resize-none transition-all leading-relaxed"
                        />
                      </div>

                    </div>

                    {/* Enlaces y Contacto */}
                    <div className="flex flex-col gap-3">
                      <label className="block text-xs font-semibold text-[#4B5563] uppercase">Enlaces y contacto adicionales</label>

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

                  <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => setStep(2)}
                      disabled={
                        !formData.contextData.companyName || 
                        !formData.contextData.description ||
                        !formData.contextData.service ||
                        !formData.contextData.notifPhone
                      }
                      className="w-full py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98]"
                    >
                      Continuar a ubicación
                    </button>
                  </motion.div>
                </motion.div>
              )}



              {/* ── PASO 2: UBICACIÓN DEL LOCAL ── */}
              {step === 2 && (
                <motion.div
                  key="step2-location"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-4 border border-[#E2E8F0] bg-[#FBFBFA] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                         onClick={() => {
                           setFormData(prev => ({
                             ...prev,
                             contextData: {
                               ...prev.contextData,
                               locationConfig: {
                                 ...prev.contextData.locationConfig,
                                 hasPhysicalLocation: !prev.contextData.locationConfig.hasPhysicalLocation
                               }
                             }
                           }))
                         }}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${!formData.contextData.locationConfig.hasPhysicalLocation ? "bg-[#1A1A1A] border-[#1A1A1A]" : "bg-white border-[#94A3B8]"}`}>
                        {!formData.contextData.locationConfig.hasPhysicalLocation && <Check size={14} className="text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1A1A1A]">No tengo un local físico</span>
                        <span className="text-xs text-[#6B7280]">Solo realizo entregas a domicilio o servicios remotos.</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {formData.contextData.locationConfig.hasPhysicalLocation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col gap-4 overflow-hidden"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Dirección exacta</label>
                            <input
                              type="text"
                              value={formData.contextData.locationConfig.address || ""}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  locationConfig: { ...prev.contextData.locationConfig, address: e.target.value }
                                }
                              }))}
                              placeholder="Ej: Av. Amazonas N24-15 y Orellana"
                              className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#1A1A1A] focus:border-[#94A3B8] focus:ring-1 focus:ring-[#94A3B8] outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#4B5563] mb-1.5 uppercase">Ubicación en el mapa</label>
                            <p className="text-xs text-[#6B7280] mb-3">Toca el mapa para colocar el pin de tu negocio.</p>
                            <MapPicker 
                              lat={formData.contextData.locationConfig.lat} 
                              lng={formData.contextData.locationConfig.lng} 
                              onChange={(lat, lng) => setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  locationConfig: { ...prev.contextData.locationConfig, lat, lng }
                                }
                              }))}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={
                        formData.contextData.locationConfig.hasPhysicalLocation && 
                        (!formData.contextData.locationConfig.address || formData.contextData.locationConfig.lat === 0)
                      }
                      className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98]"
                    >
                      Continuar a horarios
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* ── PASO 3: HORARIOS DE ATENCIÓN ── */}
              {step === 3 && (
                <motion.div
                  key="step2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <AnimatePresence mode="wait">
                    {scheduleSubStep === "choose" ? (
                      <motion.div
                        key="choose-schedule"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col gap-4"
                      >


                        <div className="grid grid-cols-1 gap-4">
                          <motion.button
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  scheduleType: "custom"
                                }
                              }))
                              setScheduleSubStep("config")
                            }}
                            className="group p-5 text-left border rounded-2xl bg-white hover:border-[#1A1A1A] hover:shadow-sm transition-all flex gap-4"
                          >
                            <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
                              <Clock size={24} />
                            </div>
                            <div className="flex flex-col justify-center">
                              <span className="text-base font-bold text-[#1A1A1A]">
                                Horario personalizado
                              </span>
                              <span className="text-xs text-[#6B7280] leading-relaxed mt-0.5">
                                Define horas específicas de apertura y cierre por cada día.
                              </span>
                            </div>
                          </motion.button>

                          <motion.button
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                contextData: {
                                  ...prev.contextData,
                                  scheduleType: "24h"
                                }
                              }))
                              setScheduleSubStep("config")
                            }}
                            className="group p-5 text-left border rounded-2xl bg-white hover:border-[#1A1A1A] hover:shadow-sm transition-all flex gap-4"
                          >
                            <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
                              <Clock size={24} />
                            </div>
                            <div className="flex flex-col justify-center">
                              <span className="text-base font-bold text-[#1A1A1A]">
                                Abierto las 24 horas
                              </span>
                              <span className="text-xs text-[#6B7280] leading-relaxed mt-0.5">
                                Tu negocio está activo las 24 horas del día. Activa o desactiva qué días trabajas.
                              </span>
                            </div>
                          </motion.button>
                        </div>

                        <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                          <button
                            onClick={() => setStep(2)}
                            className="w-full py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                          >
                            ← Atrás
                          </button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="config-schedule"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col gap-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#1A1A1A]">
                            {formData.contextData.scheduleType === "24h" ? "Abierto las 24 horas" : "Horario personalizado"}
                          </span>
                          <button
                            onClick={() => setScheduleSubStep("choose")}
                            className="text-xs font-semibold text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                          >
                            Cambiar tipo
                          </button>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto pr-2 flex flex-col gap-4 custom-scrollbar">
                          {[
                            { key: "LU", label: "Lunes" },
                            { key: "MA", label: "Martes" },
                            { key: "MI", label: "Miércoles" },
                            { key: "JU", label: "Jueves" },
                            { key: "VI", label: "Viernes" },
                            { key: "SA", label: "Sábado" },
                            { key: "DO", label: "Domingo" },
                          ].map(day => {
                            const config = formData.contextData.scheduleConfig[day.key] || { isOpen: false, openTime: "09:00", closeTime: "18:00" }
                            return (
                              <div key={day.key} className="flex items-center justify-between p-4 border border-[#E2E8F0] bg-white rounded-xl shadow-sm gap-4">
                                <div className="flex items-center gap-3">
                                  {/* Custom Switch Component */}
                                  <button
                                    onClick={() => toggleDayStatus(day.key)}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${config.isOpen ? "bg-[#1A1A1A]" : "bg-[#E2E8F0]"}`}
                                  >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${config.isOpen ? "translate-x-5" : "translate-x-0"}`} />
                                  </button>
                                  <span className="text-sm font-bold text-[#1A1A1A] w-20">{day.label}</span>
                                </div>

                                {formData.contextData.scheduleType === "24h" ? (
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.isOpen ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                    {config.isOpen ? "Abierto 24h" : "Cerrado"}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={config.openTime}
                                      disabled={!config.isOpen}
                                      onChange={(e) => updateDayTime(day.key, "openTime", e.target.value)}
                                      className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none disabled:opacity-40 w-24"
                                    />
                                    <span className="text-xs text-[#6B7280] font-medium">a</span>
                                    <input
                                      type="time"
                                      value={config.closeTime}
                                      disabled={!config.isOpen}
                                      onChange={(e) => updateDayTime(day.key, "closeTime", e.target.value)}
                                      className="bg-[#FBFBFA] border border-[#E2E8F0] rounded-md text-xs p-2 text-[#1A1A1A] focus:border-[#94A3B8] outline-none disabled:opacity-40 w-24"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                          <button
                            onClick={() => setScheduleSubStep("choose")}
                            className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                          >
                            ← Atrás
                          </button>
                          <button
                            onClick={handleSaveSchedule}
                            disabled={Object.values(formData.contextData.scheduleConfig).every(c => !c.isOpen)}
                            className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98] transition-transform"
                          >
                            Continuar
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}



              {/* ── PASO 3: CATÁLOGO / SERVICIOS ── */}
              {step === 4 && (
                <motion.div
                  key="step3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  {/* TÍTULO DINÁMICO */}
                  <motion.div variants={itemVariants} className="flex flex-col gap-1">
                    <h2 className="text-sm font-bold text-[#1A1A1A]">
                      {ventasMethod === "choose" ? 
                        ((formData.niche as string) === "showroom" ? "¿Cómo prefieres subir tu catálogo?" : (formData.niche as string) === "agenda" ? "¿Cómo prefieres subir tus servicios?" : "¿Cómo prefieres subir tu menú?") :
                        ventasMethod === "ai" ? 
                        ((formData.niche as string) === "showroom" ? "Sube tu catálogo de productos" : (formData.niche as string) === "agenda" ? "Sube fotos de tus servicios" : "Sube la foto de tu menú") : 
                        ((formData.niche as string) === "showroom" ? "Enlista tus productos y precios" : (formData.niche as string) === "agenda" ? "Enlista tus servicios y precios" : "Enlista tus platos y precios")
                      }
                    </h2>
                    <p className="text-xs text-[#6B7280] leading-relaxed">
                      {ventasMethod === "ai" ? (
                        (formData.niche as string) === "ventas" ?
                        "Carga una imagen legible de tu menú o carta física. El asistente virtual se la enviará automáticamente a tus clientes cuando la soliciten." :
                        "Nuestra IA analizará las fotos y extraerá las características automáticamente."
                      ) :
                        ventasMethod === "manual" ?
                        ((formData.niche as string) === "agenda" ? "Define los servicios que tu agente digital ofrecerá." : (formData.niche as string) === "showroom" ? "Define los productos que tu agente digital ofrecerá." : "Define los productos que tu mesero digital ofrecerá.") : ""
                      }
                    </p>
                  </motion.div>

                  <div className="max-h-[55vh] overflow-y-auto pr-2 flex flex-col gap-5 custom-scrollbar pb-4">

                    <AnimatePresence mode="wait">
                      {/* SECCIÓN DE MENÚ PARA RESTAURANTE */}
                      {formData.niche === "ventas" && ventasMethod === "ai" && (
                        <motion.div
                          key="restaurant-menu"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col gap-4 w-full"
                        >
                          {/* CONTADOR DE IMÁGENES */}
                          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                            <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">
                              Páginas del menú
                            </span>
                            <span className="text-xs font-bold bg-[#F3F4F6] px-2.5 py-1 rounded-full text-[#1A1A1A]">
                              {(formData.contextData.menuImages || []).length}/5
                            </span>
                          </div>

                          {/* LISTADO DE IMÁGENES CARGADAS */}
                          {formData.contextData.menuImages && formData.contextData.menuImages.length > 0 && (
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-5 gap-2.5">
                                {formData.contextData.menuImages.map((url: string, index: number) => (
                                  <div key={index} className="relative w-full aspect-square border border-[#E2E8F0] rounded-xl overflow-hidden group shadow-sm bg-white">
                                    <img src={url} alt={`Página ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => {
                                        setFormData((prev: any) => ({
                                          ...prev,
                                          contextData: {
                                            ...prev.contextData,
                                            menuImages: prev.contextData.menuImages.filter((_: any, i: number) => i !== index)
                                          }
                                        }))
                                      }}
                                      className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-1 rounded-full transition-colors flex items-center justify-center w-5 h-5"
                                      title="Eliminar imagen"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(!formData.contextData.menuImages || formData.contextData.menuImages.length < 5) && (
                            <div className="border border-dashed border-[#94A3B8] bg-[#FBFBFA] hover:bg-[#F3F4F6] hover:border-[#1A1A1A] transition-colors rounded-xl p-6 flex flex-col items-center justify-center relative group cursor-pointer h-40">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                title=""
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isLoading}
                              />
                              {analyzingStep === "SUBIENDO" ? (
                                <div className="flex flex-col items-center gap-3 text-[#1A1A1A]">
                                  <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
                                  <span className="text-xs font-medium animate-pulse">Subiendo imagen...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3 text-[#6B7280] group-hover:text-[#1A1A1A]">
                                  <div className="w-10 h-10 bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center rounded-full">
                                    <Upload size={18} />
                                  </div>
                                  <span className="text-xs font-medium">Sube las imágenes de tu menú (Máx 5)</span>
                                </div>
                              )}
                              {analyzingStep === "ERROR" && <span className="text-xs font-semibold text-red-500 mt-3">Error al subir. Intenta de nuevo.</span>}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* 1. SELECCIÓN PARA CATÁLOGOS */}
                      {(formData.niche === "ventas" || formData.niche === "showroom" || formData.niche === "agenda") && ventasMethod === "choose" && (
                        <motion.div 
                          key="choose"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col gap-3 w-full"
                        >
                          <motion.button
                            variants={itemVariants}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setVentasMethod("ai")}
                            className="flex items-center gap-4 p-5 border border-[#E2E8F0] bg-white rounded-2xl hover:border-[#1A1A1A] transition-all group"
                          >
                            <div className="w-10 h-10 bg-[#F3F4F6] rounded-xl flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
                              <Scan size={20} />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-bold text-[#1A1A1A]">
                                {formData.niche === "ventas" ? "Subir imagen de tu menú" : "Usar Cámara / IA"}
                              </span>
                              <span className="text-[10px] text-[#6B7280]">
                                {formData.niche === "ventas" ? "Sube una foto de tu menú para enviarla por WhatsApp" : (formData.niche as string) === "showroom" ? "Sube fotos de tus productos" : "Sube fotos de tus servicios o folletos"}
                              </span>
                            </div>
                          </motion.button>
                          <motion.button
                            variants={itemVariants}
                            whileTap={{ scale: 0.97 }}
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
                          </motion.button>
                        </motion.div>
                      )}

                      {/* 2. ENTRADA MANUAL */}
                      {ventasMethod === "manual" && (
                        <motion.div 
                          key="manual"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col gap-4"
                        >
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
                                placeholder={(formData.niche as string) === "showroom" ? "Tallas S, M, L. Algodón." : (formData.niche as string) === "agenda" ? "Incluye revisión gratis" : "Con papas fritas y bebida."}
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
                        </motion.div>
                      )}

                      {/* 3. CATÁLOGO IA */}
                      {formData.niche !== "ventas" && ventasMethod === "ai" && (
                        <motion.div 
                          key="ai"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col gap-5"
                        >

                          {/* CONTADOR DE IMÁGENES ESCANEADAS */}
                          {((["ventas", "agenda", "showroom"] as string[]).includes(formData.niche)) && (
                            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                              <span className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">
                                Imágenes escaneadas
                              </span>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                scannedImageCount >= 2 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                              }`}>
                                {scannedImageCount}/2
                              </span>
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
                                    placeholder={(formData.niche as string) === "showroom" ? "Tallas S, M, L. Algodón." : (formData.niche as string) === "agenda" ? "Incluye revisión gratis" : "Con papas fritas y bebida."}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>

                  <motion.div variants={itemVariants} className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                    <button
                      onClick={() => {
                        if (ventasMethod !== "choose") {
                          setVentasMethod("choose")
                        } else {
                          setStep(3)
                        }
                      }}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setStep(5)}
                      disabled={
                        ventasMethod === "choose" ||
                        (formData.niche === "ventas" && ventasMethod === "ai" && (!formData.contextData.menuImages || formData.contextData.menuImages.length === 0)) ||
                        ((formData.niche !== "ventas" || ventasMethod === "manual") && formData.products.length === 0)
                      }
                      className="flex-1 py-3 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98] transition-transform"
                    >
                      Continuar
                    </button>

                  </motion.div>
                </motion.div>
              )}

              {/* ── PASO 4: NÚMERO DE AGENTE ── */}
              {step === 5 && (
                <motion.div
                  key="step4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >


                  <motion.div variants={itemVariants} className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="w-1/3">
                        <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1.5 ml-1">
                          País
                        </label>
                        <select
                          value={agentPhoneCountry}
                          onChange={(e) => setAgentPhoneCountry(e.target.value)}
                          className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#1A1A1A] outline-none transition-all text-[#1A1A1A] appearance-none"
                        >
                          <option value="57">🇨🇴 (+57)</option>
                          <option value="51">🇵🇪 (+51)</option>
                          <option value="58">🇻🇪 (+58)</option>
                          <option value="54">🇦🇷 (+54)</option>
                          <option value="593">🇪🇨 (+593)</option>
                        </select>
                      </div>
                      <div className="w-2/3">
                        <label className="block text-xs font-bold text-[#94A3B8] uppercase mb-1.5 ml-1">
                          Número
                        </label>
                        <input
                          type="tel"
                          placeholder="Ej: 987654321"
                          value={agentPhoneRaw}
                          onChange={(e) => setAgentPhoneRaw(e.target.value)}
                          className="w-full bg-[#FBFBFA] border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#1A1A1A] outline-none transition-all text-[#1A1A1A]"
                        />
                      </div>
                    </div>
                    {phoneError && (
                      <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-md">
                        {phoneError}
                      </p>
                    )}
                  </motion.div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setStep(4)}
                      className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                    >
                      ← Atrás
                    </button>
                    <motion.button
                      variants={itemVariants}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        if (validateAgentPhone()) {
                          setStep(6);
                        }
                      }}
                      className="flex-1 bg-[#1A1A1A] text-white font-medium py-3 text-sm rounded-lg hover:bg-[#333] transition-colors shadow-sm"
                    >
                      Conectar
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 5: QR + TEST ── */}
              {step === 6 && (
                <motion.div
                  key="step5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >


                  <div className="flex flex-col gap-3">
                    {!connectionMethod && !evoConnected && (
                      <div className="flex flex-col gap-4 mt-2">
                        {evoError && (
                          <motion.div variants={itemVariants} className="p-3 border border-red-200 bg-red-50 text-red-700 text-xs font-medium rounded-lg text-center">
                            Error: {evoError}
                          </motion.div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <motion.button 
                            variants={itemVariants}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEvoConnect("qr")} 
                            className="p-6 border border-[#E2E8F0] bg-white rounded-xl shadow-sm hover:border-[#94A3B8] hover:bg-[#FBFBFA] transition-all flex flex-col items-center gap-3"
                          >
                            <Scan className="w-8 h-8 text-[#4B5563]" />
                            <span className="text-sm font-semibold text-[#1A1A1A]">Escanear QR</span>
                          </motion.button>
                          <motion.button 
                            variants={itemVariants}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEvoConnect("code")} 
                            className="p-6 border border-[#E2E8F0] bg-white rounded-xl shadow-sm hover:border-[#94A3B8] hover:bg-[#FBFBFA] transition-all flex flex-col items-center gap-3"
                          >
                            <Phone className="w-8 h-8 text-[#4B5563]" />
                            <span className="text-sm font-semibold text-[#1A1A1A]">Código Numérico</span>
                          </motion.button>
                        </div>
                        <button
                          onClick={() => setStep(5)}
                          className="w-full py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform text-center"
                        >
                          ← Atrás
                        </button>
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
                            <img src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR" className="w-full h-full object-cover" style={{ filter: "grayscale(100%) contrast(500%)" }} />
                          </div>
                        )}
                        <span className="text-xs text-[#4B5563] text-center mt-3 leading-relaxed">
                          Abre WhatsApp en tu teléfono → Dispositivos Vinculados → Vincular dispositivo
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
                          <div className="flex flex-col gap-3 items-center justify-center py-6">
                             <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
                             <span className="text-xs font-medium text-[#4B5563] animate-pulse">Obteniendo código para {formData.testPhone}...</span>
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
                              Abre WhatsApp → Dispositivos Vinculados → <strong>Vincular con tu número de teléfono.</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {evoConnected && (
                      <motion.div 
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="border border-green-200 bg-green-50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 shadow-sm mt-4"
                      >
                        <motion.div 
                          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        >
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </motion.div>
                        <span className="text-sm font-bold text-green-800 text-center block mt-2">
                          ¡Conectado con éxito! Tu agente está listo
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── PASO 6: CREAR CUENTA (AUTH AL FINAL) ── */}
              {step === 7 && (
                <motion.div
                  key="step6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-4"
                >
                  {status === "authenticated" ? (
                    <div className="flex flex-col gap-5">
                      <motion.div variants={itemVariants} className="text-center p-6 border border-green-200 bg-green-50 rounded-2xl flex flex-col items-center gap-3">
                        <CheckCircle className="w-12 h-12 text-green-500" fill="white" />
                        <span className="text-base font-bold text-green-800">Sesión iniciada con éxito</span>
                        <p className="text-xs text-green-700 leading-relaxed">
                          Has iniciado sesión como <strong>{session?.user?.email}</strong>. Todo está listo para configurar tu cuenta.
                        </p>
                      </motion.div>

                      {error && (
                        <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-md">
                          {error}
                        </p>
                      )}

                      <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                        <button
                          onClick={() => setStep(6)}
                          disabled={isLoading}
                          className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                        >
                          ← Atrás
                        </button>
                        <button
                          onClick={handleFinalize}
                          disabled={isLoading}
                          className="flex-1 py-3 text-sm font-bold transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
                        >
                          {isLoading ? "Finalizando..." : "Finalizar y entrar al Dashboard"}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <motion.div variants={itemVariants}>
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
                      </motion.div>

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

                      <div className="flex gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
                        <button
                          onClick={() => setStep(6)}
                          disabled={isLoading}
                          className="px-5 py-3 border border-[#E2E8F0] rounded-lg text-[#4B5563] text-sm font-medium hover:bg-[#F9FAFB] transition-colors active:scale-95 transition-transform"
                        >
                          ← Atrás
                        </button>
                        <motion.button
                          variants={itemVariants}
                          whileTap={{ scale: 0.96 }}
                          onClick={handleFinalize}
                          disabled={isLoading}
                          className="flex-1 bg-[#1A1A1A] text-white font-medium py-3 text-sm rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {isLoading ? "Creando cuenta..." : "Crear cuenta y finalizar"}
                        </motion.button>
                      </div>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-[#E2E8F0]" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-4 text-xs font-medium text-[#94A3B8]">
                            O continuar con
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => signIn("google", { callbackUrl: "/onboarding?step=6" })}
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
                    </div>
                  )}
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