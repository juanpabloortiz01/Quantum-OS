"use client"

import { signIn, useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { finalizeOnboarding, registerQuantumUser, sendTestPing } from "./action"

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

export default function OnboardingQuantum() {
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

  const [formData, setFormData] = useState({
    niche: "",
    needs: [] as string[],
    masterPrompt: "",
    testPhone: "",
  })

  // Detectar si viene de Google con step=1
  useEffect(() => {
    const stepParam = searchParams.get("step")
    if (stepParam === "1" && status === "authenticated") {
      setStep(1)
    }
  }, [status, searchParams])

  // Si ya tiene organización completa, redirigir al dashboard
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/check-onboarding")
        .then((r) => r.json())
        .then((data) => {
          if (data.completed) router.push("/dashboard")
        })
    }
  }, [status])

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
      masterPrompt: formData.masterPrompt,
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
                {step === 3 && "SINCRONIZAR_INSTANCIA"}
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

              {/* ── PASO 2: MASTER PROMPT ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-mono text-[10px] text-[#555] uppercase tracking-[0.2em]"
                        style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                      >
                        03_CONTEXTO_DEL_NEGOCIO
                      </span>
                      <span
                        className="font-mono text-[9px] text-[#00FFFF] border border-[#00FFFF]/30 px-2 py-0.5"
                        style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                      >
                        RAG_READY
                      </span>
                    </div>
                    <p className="text-[11px] text-[#444] mb-4 leading-relaxed">
                      Define las reglas base de tu IA. Horarios, tono, restricciones.
                    </p>
                    <textarea
                      value={formData.masterPrompt}
                      onChange={(e) =>
                        setFormData({ ...formData, masterPrompt: e.target.value })
                      }
                      placeholder={`Ej: Somos "TechStore". Atendemos de 9am a 6pm. Solo aceptamos transferencias bancarias. Habla de forma directa y profesional...`}
                      className="w-full h-40 bg-[#111] border border-[#1A1A1A] p-4 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none resize-none transition-colors leading-relaxed"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[9px] text-[#333]">
                        {formData.masterPrompt.length} chars
                      </span>
                      <span className="font-mono text-[9px] text-[#333]">
                        MIN: 10
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-4 border border-[#1A1A1A] text-[#444] font-mono text-[10px] tracking-widest hover:text-white transition-colors uppercase"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      [ ← ]
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={formData.masterPrompt.length < 10}
                      className="flex-1 py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                      style={{
                        fontFamily: "var(--font-fira-code, monospace)",
                        background:
                          formData.masterPrompt.length >= 10 ? "white" : "transparent",
                        color:
                          formData.masterPrompt.length >= 10 ? "black" : "#555",
                        border:
                          formData.masterPrompt.length >= 10
                            ? "none"
                            : "1px solid #2A2A2A",
                      }}
                    >
                      [ COMPILAR_CEREBRO ]
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 3: QR + TEST ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* QR placeholder */}
                  <div className="border border-[#1A1A1A] bg-[#111] p-6 flex flex-col items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF]/30 to-transparent" />
                    <span
                      className="font-mono text-[9px] text-[#00FFFF] tracking-widest animate-pulse"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      ESPERANDO_QR_EVO_API
                    </span>
                    <div className="w-32 h-32 border border-[#2A2A2A] grid grid-cols-8 gap-[1px] p-1">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square"
                          style={{
                            background: Math.random() > 0.5 ? "#fff" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[8px] text-[#333] text-center tracking-wider">
                      Dispositivos vinculados → Vincular dispositivo
                    </span>
                  </div>

                  {/* Test ping */}
                  <div className="flex flex-col gap-3">
                    <span
                      className="font-mono text-[10px] text-[#555] uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                    >
                      TESTEAR_CONEXIÓN
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="+593 99 999 9999"
                        value={formData.testPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, testPhone: e.target.value })
                        }
                        className="flex-1 bg-[#111] border border-[#1A1A1A] px-3 py-3 text-xs text-white font-mono focus:border-[#00FFFF]/40 outline-none transition-colors"
                        style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                      />
                      <button
                        onClick={handlePing}
                        disabled={
                          pingStatus === "sending" ||
                          formData.testPhone.length < 8
                        }
                        className="px-4 border border-[#00FFFF] bg-[#00FFFF] text-black font-mono text-[10px] font-bold tracking-widest hover:bg-white transition-colors disabled:opacity-40"
                        style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                      >
                        {pingStatus === "sending" ? "..." : "PING"}
                      </button>
                    </div>
                    {pingStatus === "error" && (
                      <span className="font-mono text-[9px] text-red-500 tracking-widest">
                        ERROR: Verifica la instancia de EvolutionAPI
                      </span>
                    )}
                    {pingStatus === "sent" && (
                      <span className="font-mono text-[9px] text-[#00FF88] tracking-widest">
                        ✓ PING_ENVIADO — Revisa tu WhatsApp
                      </span>
                    )}
                  </div>

                  {/* Finalizar */}
                  <button
                    onClick={handleFinalize}
                    disabled={isLoading || pingStatus !== "sent"}
                    className="w-full py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                    style={{
                      fontFamily: "var(--font-fira-code, monospace)",
                      background: pingStatus === "sent" ? "white" : "transparent",
                      color: pingStatus === "sent" ? "black" : "#555",
                      border: pingStatus === "sent" ? "none" : "1px solid #2A2A2A",
                    }}
                  >
                    {isLoading
                      ? "[ COMPILANDO... ]"
                      : "[ INGRESAR_AL_BÚNKER → ]"}
                  </button>

                  <p className="font-mono text-[9px] text-[#2A2A2A] text-center tracking-widest">
                    Botón activo tras confirmar PING exitoso
                  </p>
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

// Helper
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}