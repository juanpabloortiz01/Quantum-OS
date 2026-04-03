"use client"

import { motion } from "motion/react"

const SKILLS = [
  {
    id: "01",
    name: "VALIDADOR_OCR",
    desc: "Lee comprobantes de pago y detecta fraudes en milisegundos.",
    icon: "⬡",
    status: "ACTIVE",
  },
  {
    id: "02",
    name: "GESTOR_PEDIDOS",
    desc: "Toma pedidos por WhatsApp y los organiza automáticamente.",
    icon: "⬡",
    status: "ACTIVE",
  },
  {
    id: "03",
    name: "AGENDA_CITAS",
    desc: "Sincroniza con Google Calendar sin intervención humana.",
    icon: "⬡",
    status: "ACTIVE",
  },
  {
    id: "04",
    name: "ANÁLISIS_AUDIO",
    desc: "Interpreta mensajes de voz y extrae intención del cliente.",
    icon: "⬡",
    status: "ACTIVE",
  },
  {
    id: "05",
    name: "CATÁLOGO_STOCK",
    desc: "Gestiona productos, precios e inventario en tiempo real.",
    icon: "⬡",
    status: "ACTIVE",
  },
  {
    id: "06",
    name: "REGISTRO_CLIENTES",
    desc: "Construye una base de datos de clientes automáticamente.",
    icon: "⬡",
    status: "BETA",
  },
  {
    id: "07",
    name: "COORD_ENVÍOS",
    desc: "Coordina logística y notifica el estado del pedido al cliente.",
    icon: "⬡",
    status: "BETA",
  },
  {
    id: "08",
    name: "ANÁLISIS_IMAGEN",
    desc: "Procesa fotos de productos, facturas o documentos con visión IA.",
    icon: "⬡",
    status: "SOON",
  },
]

const NICHES = [
  { code: "GASTRO", label: "Gastronomía", detail: "Pedidos · Pagos · Menú" },
  { code: "RETAIL", label: "Reventa", detail: "Stock · Catálogo · Envíos" },
  { code: "CLINIC", label: "Clínica", detail: "Citas · Pacientes · Agenda" },
]

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { color: "#00FFFF", label: "ACTIVO" },
    BETA: { color: "#FFA800", label: "BETA" },
    SOON: { color: "#444", label: "PRONTO" },
  }[status] ?? { color: "#444", label: status }

  return (
    <span
      className="font-mono text-[9px] tracking-widest px-2 py-0.5 border"
      style={{ color: config.color, borderColor: config.color + "40" }}
    >
      {config.label}
    </span>
  )
}

export default function AboutPage() {
  return (
    <div
      className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden"
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

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-[#1A1A1A]">
        <div
          className="font-mono text-sm font-bold tracking-widest text-white"
          style={{ fontFamily: "var(--font-fira-code, monospace)" }}
        >
          &gt; QUANTUM <span className="text-[#00FFFF]">|</span>
        </div>
        <div className="flex items-center gap-6">
          
            href="/"
            className="font-mono text-[10px] tracking-widest text-[#555] hover:text-[#00FFFF] transition-colors uppercase"
          >
            // INICIO
          </a>
          
            href="/about"
            className="font-mono text-[10px] tracking-widest text-[#00FFFF] uppercase"
          >
            // ABOUT
          </a>
          
            href="/onboarding"
            className="font-mono text-[10px] tracking-widest text-white border border-[#2A2A2A] px-4 py-2 hover:border-[#00FFFF]/40 hover:text-[#00FFFF] transition-all uppercase"
          >
            [ INICIAR ]
          </a>
        </div>
      </nav>

      {/* HERO ABOUT */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 pt-20 pb-16 max-w-6xl mx-auto">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#00FFFF] uppercase mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
          ABOUT_QUANTUM_OS · KERNEL_DOC_v2.4
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 30 }}
          className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none mb-6"
          style={{ fontFamily: "var(--font-fira-code, monospace)" }}
        >
          Un agente.
          <br />
          <span className="text-[#333]">Infinitas</span>{" "}
          <span className="text-[#00FFFF]">habilidades.</span>
        </motion.h1>

        {/* Descripción corta */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="max-w-xl text-[#666] text-base sm:text-lg font-light leading-relaxed"
        >
          Quantum OS no es un chatbot. Es un{" "}
          <span className="text-white">sistema operativo de ventas</span> que
          vive en el WhatsApp de tu negocio. Lo configuras una vez, le asignas
          habilidades, y trabaja solo — 24/7.
        </motion.p>
      </section>

      {/* SEPARADOR */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 md:px-24">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
          <span className="font-mono text-[10px] text-[#333] tracking-widest uppercase whitespace-nowrap">
            ARQUITECTURA_DEL_AGENTE
          </span>
          <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
        </div>
      </div>

      {/* DIAGRAMA CENTRAL — el concepto visual */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-20 max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-8">

          {/* Núcleo central */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", damping: 20 }}
            className="relative flex items-center justify-center"
          >
            {/* Glow */}
            <div
              className="absolute w-32 h-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,255,255,0.1) 0%, transparent 70%)",
              }}
            />
            {/* Núcleo */}
            <div className="relative w-28 h-28 border border-[#00FFFF]/30 flex flex-col items-center justify-center gap-1">
              {/* Esquinas */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00FFFF]/60" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00FFFF]/60" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#00FFFF]/60" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00FFFF]/60" />
              <span
                className="font-mono text-[10px] text-[#00FFFF] tracking-widest"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                QUANTUM
              </span>
              <span
                className="font-mono text-[18px] font-bold text-white"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                AGENT
              </span>
              <span className="font-mono text-[9px] text-[#444] tracking-widest">
                CORE_v2.4
              </span>
            </div>
          </motion.div>

          {/* Flecha hacia abajo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-[1px] h-8 bg-gradient-to-b from-[#00FFFF]/30 to-transparent" />
            <span className="font-mono text-[10px] text-[#333] tracking-widest">
              HABILIDADES_ACTIVAS
            </span>
            <div className="w-[1px] h-8 bg-gradient-to-t from-[#00FFFF]/30 to-transparent" />
          </motion.div>

          {/* GRID DE HABILIDADES */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#1A1A1A] border border-[#1A1A1A]">
            {SKILLS.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.06, type: "spring", damping: 30 }}
                className="group bg-[#0D0D0D] p-5 hover:bg-[#111] transition-colors cursor-default relative overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at 50% 0%, rgba(0,255,255,0.04) 0%, transparent 60%)"
                  }}
                />

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-mono text-[10px] text-[#333] tracking-widest"
                    style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                  >
                    [{skill.id}]
                  </span>
                  <StatusBadge status={skill.status} />
                </div>

                {/* Nombre */}
                <div
                  className="font-mono text-[11px] font-bold text-white tracking-wider mb-2 group-hover:text-[#00FFFF] transition-colors"
                  style={{ fontFamily: "var(--font-fira-code, monospace)" }}
                >
                  {skill.name}
                </div>

                {/* Descripción */}
                <p className="text-[12px] text-[#555] leading-relaxed group-hover:text-[#777] transition-colors">
                  {skill.desc}
                </p>

                {/* Línea cian al hover */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#00FFFF] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEPARADOR */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 md:px-24">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
          <span className="font-mono text-[10px] text-[#333] tracking-widest uppercase whitespace-nowrap">
            NICHOS_COMPATIBLES
          </span>
          <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
        </div>
      </div>

      {/* NICHOS */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1px] bg-[#1A1A1A] border border-[#1A1A1A]">
          {NICHES.map((niche, i) => (
            <motion.div
              key={niche.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="bg-[#0D0D0D] p-8 flex flex-col gap-3 group hover:bg-[#0F0F0F] transition-colors"
            >
              <span
                className="font-mono text-[10px] text-[#00FFFF] tracking-[0.2em]"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                NICHE_{niche.code}
              </span>
              <span
                className="font-mono text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-fira-code, monospace)" }}
              >
                {niche.label}
              </span>
              <span className="text-[12px] text-[#444] tracking-widest font-mono">
                {niche.detail}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="border border-[#1A1A1A] p-12 flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          {/* Glow esquina */}
          <div
            className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(0,255,255,0.04) 0%, transparent 60%)",
            }}
          />

          <div className="flex flex-col gap-3">
            <span
              className="font-mono text-[10px] text-[#00FFFF] tracking-widest uppercase"
              style={{ fontFamily: "var(--font-fira-code, monospace)" }}
            >
              INICIALIZAR_AGENTE
            </span>
            <h2
              className="font-mono text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-fira-code, monospace)" }}
            >
              Tu negocio ya no
              <br />
              necesita dormir.
            </h2>
            <p className="text-[#555] text-sm max-w-sm">
              Configura tu agente en menos de 5 minutos. Sin tarjeta. Sin código.
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center sm:items-end">
            
              href="/onboarding"
              className="px-8 py-4 bg-white text-black font-mono text-xs uppercase font-bold tracking-widest hover:bg-[#00FFFF] transition-colors whitespace-nowrap"
              style={{ fontFamily: "var(--font-fira-code, monospace)" }}
            >
              [ ACTIVAR_PROTOCOLO ]
            </a>
            <span className="font-mono text-[10px] text-[#333] tracking-widest">
              SIN_TARJETA · SETUP_5MIN
            </span>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#1A1A1A] px-6 sm:px-12 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <span
            className="font-mono text-[10px] text-[#333] tracking-widest"
            style={{ fontFamily: "var(--font-fira-code, monospace)" }}
          >
            QUANTUM_OS · ABOUT_DOC · BUILD_2024
          </span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
            <span
              className="font-mono text-[10px] text-[#00FFFF] tracking-widest"
              style={{ fontFamily: "var(--font-fira-code, monospace)" }}
            >
              KERNEL_ONLINE
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}