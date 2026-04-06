"use client"

import { LayoutGroup, motion } from "motion/react"
import { TextRotate } from "@/components/ui/text-rotate"
import Link from "next/link"
import { useSession } from "next-auth/react"

export default function QuantumHero() {
  const { status } = useSession()
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] text-[#1A1A1A] overflow-hidden relative selection:bg-slate-200 selection:text-black font-sans">

      {/* ── DOT GRID MINIMALISTA ── */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* ── BORDES DECORATIVOS FINOS ── */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t border-l border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b border-l border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b border-r border-[#E2E8F0] pointer-events-none z-10" />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="relative z-10 flex flex-col items-center px-6 sm:px-12 md:px-24 py-24 w-full max-w-7xl mx-auto">

        {/* STATUS BADGE */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-10 flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] bg-white text-xs font-medium text-[#4B5563] shadow-sm rounded-full"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] animate-pulse" />
          Quantum Plataforma v2.0
        </motion.div>

        {/* HEADLINE PRINCIPAL */}
        <div className="w-full flex flex-col items-center justify-center text-center">
          <LayoutGroup>
            <motion.div
              className="flex flex-col items-center gap-3 sm:gap-4"
              layout
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", damping: 30 }}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[#1A1A1A] leading-none"
                layout
              >
                Menos caos.
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", damping: 30 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none"
                layout
              >
                <span className="text-[#94A3B8]">Más</span>
                <TextRotate
                  texts={[
                    "Ventas",
                    "Control",
                    "Tiempo",
                    "Claridad",
                    "Ingresos",
                  ]}
                  mainClassName="text-[#1A1A1A] px-4 sm:px-5 md:px-6 bg-white border border-[#E2E8F0] shadow-sm overflow-hidden py-1 sm:py-2 justify-center rounded-xl"
                  staggerFrom="last"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-120%", opacity: 0 }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2200}
                />
              </motion.div>
            </motion.div>
          </LayoutGroup>
        </div>

        {/* SUBTÍTULO */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 max-w-2xl text-center text-sm sm:text-base md:text-lg text-[#4B5563] leading-relaxed"
        >
          Configura en minutos un Agente de Ventas con IA.<br className="hidden sm:block" />
          <span className="font-medium text-[#1A1A1A]">Simple y rápido:</span> atiende clientes, vende y recibe pagos directamente en tu WhatsApp.
        </motion.p>

        {/* CTA BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 relative z-20"
        >
          <Link 
            href={status === "authenticated" ? "/dashboard" : "/onboarding"} 
            className="w-full sm:w-auto group relative px-8 py-4 bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333333] transition-colors duration-300 rounded-lg shadow-md border border-transparent text-center flex justify-center items-center"
          >
            {status === "loading" ? "..." : status === "authenticated" ? "Ir al Panel Principal" : "Crear tu Agente Gratis"}
          </Link>

          <button className="w-full sm:w-auto px-8 py-4 border border-[#E2E8F0] text-[#1A1A1A] bg-white text-sm font-medium hover:bg-[#F3F4F6] transition-all duration-300 rounded-lg shadow-sm">
            Ver demostración
          </button>
        </motion.div>

        {/* NOTA BOTTOM */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-14 flex items-center justify-center gap-4 text-xs font-medium text-[#94A3B8]"
        >
          <span>Sin tarjeta de crédito</span>
          <span className="w-1 h-1 rounded-full bg-[#E2E8F0]" />
          <span>Configuración en 3 minutos</span>
        </motion.div>

      </div>
    </div>
  )
}