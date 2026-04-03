"use client"

import { LayoutGroup, motion } from "motion/react"
import { TextRotate } from "@/components/ui/text-rotate"
import Link from "next/link" // <--- Importación vital añadida

export default function QuantumHero() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#0D0D0D] text-white overflow-hidden relative selection:bg-[#00FFFF] selection:text-black font-sans">

      {/* ── SCANLINES OVERLAY ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* ── GRID TÉCNICA ── */}
      <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00FFFF 1px, transparent 1px),
            linear-gradient(to bottom, #00FFFF 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* ── GLOW CENTRAL ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(0,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      {/* ── BORDES DECORATIVOS ESQUINAS ── */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t border-l border-[#00FFFF]/20 pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-[#00FFFF]/20 pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b border-l border-[#00FFFF]/20 pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b border-r border-[#00FFFF]/20 pointer-events-none z-10" />

      {/* ── LÍNEA HORIZONTAL SUPERIOR DECORATIVA ── */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF]/30 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF]/20 to-transparent pointer-events-none z-10" />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="relative z-10 flex flex-col items-center px-6 sm:px-12 md:px-24 py-24 w-full max-w-7xl mx-auto">

        {/* STATUS BADGE */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-10 flex items-center gap-3 px-4 py-2 border border-[#2A2A2A] bg-[#111111] font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#00FFFF]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
          QUANTUM_OS &nbsp;·&nbsp; v2.4.1 &nbsp;·&nbsp; KERNEL_ONLINE
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
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-none font-mono italic"
                layout
              >
                Menos fricción.
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", damping: 30 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none font-mono"
                layout
              >
                <span className="text-[#444444]">Más</span>
                <TextRotate
                  texts={[
                    "Margen",
                    "Control",
                    "Pedidos",
                    "Potencia",
                    "Quantum",
                    "[OK]",
                  ]}
                  mainClassName="text-[#00FFFF] font-mono px-4 sm:px-5 md:px-6 bg-[#00FFFF]/5 border border-[#00FFFF]/25 overflow-hidden py-1 sm:py-2 justify-center"
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

        {/* SEPARADOR TÉCNICO */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-12 mb-10 w-full max-w-lg flex items-center gap-4"
        >
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[#2A2A2A]" />
          <span className="font-mono text-[10px] text-[#333] tracking-widest uppercase whitespace-nowrap">
            SYSTEM_OUTPUT
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[#2A2A2A]" />
        </motion.div>

        {/* SUBTÍTULO */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl text-center text-sm sm:text-base md:text-lg text-[#666] font-light leading-relaxed"
        >
          Configura en minutos un Agente de IA <span className="text-[#999]">100% personalizable.</span><br className="hidden sm:block" />
          <span className="text-white font-normal"> Simple y rápido:</span> vende productos, agenda citas y valida pagos en tu WhatsApp las 24 horas.
        </motion.p>

        {/* CTA BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 relative z-20"
        >
          {/* CTA PRIMARIO - CONECTADO AL ONBOARDING */}
          <Link href="/onboarding" className="w-full sm:w-auto">
            <button className="w-full group relative px-8 py-4 bg-white text-black font-mono text-xs sm:text-sm uppercase font-bold tracking-widest hover:bg-[#00FFFF] transition-colors duration-300 focus:outline-none">
              <span className="relative z-10">[ ACTIVAR_AGENTE_GRATIS ]</span>
            </button>
          </Link>

          {/* CTA SECUNDARIO */}
          <button className="w-full sm:w-auto px-8 py-4 border border-[#2A2A2A] text-[#666] font-mono text-xs sm:text-sm uppercase tracking-widest hover:border-[#00FFFF]/40 hover:text-[#00FFFF] transition-all duration-300">
            VER_DEMO →
          </button>
        </motion.div>

        {/* NOTA TÉCNICA INFERIOR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-14 flex items-center gap-2 font-mono text-[10px] text-[#2A2A2A] tracking-widest uppercase"
        >
          <span>SIN_TARJETA_REQUERIDA</span>
          <span className="w-1 h-1 rounded-full bg-[#2A2A2A]" />
          <span>SETUP_EN_3_MIN</span>
          <span className="w-1 h-1 rounded-full bg-[#2A2A2A]" />
          <span>PROTOCOLO_CIFRADO</span>
        </motion.div>

      </div>
    </div>
  )
}