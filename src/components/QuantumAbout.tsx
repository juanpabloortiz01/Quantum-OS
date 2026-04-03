"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const SKILLS = [
  { id: "01", name: "VALIDADOR_OCR", desc: "Lee comprobantes de pago y detecta fraudes en milisegundos.", icon: "⬡", status: "ACTIVE" },
  { id: "02", name: "GESTOR_PEDIDOS", desc: "Toma pedidos por WhatsApp y los organiza automáticamente.", icon: "⬡", status: "ACTIVE" },
  { id: "03", name: "AGENDA_CITAS", desc: "Sincroniza con Google Calendar sin intervención humana.", icon: "⬡", status: "ACTIVE" },
  { id: "04", name: "ANÁLISIS_AUDIO", desc: "Interpreta mensajes de voz y extrae intención del cliente.", icon: "⬡", status: "ACTIVE" },
  { id: "05", name: "CATÁLOGO_STOCK", desc: "Gestiona productos, precios e inventario en tiempo real.", icon: "⬡", status: "ACTIVE" },
  { id: "06", name: "REGISTRO_CLIENTES", desc: "Construye una base de datos de clientes automáticamente.", icon: "⬡", status: "BETA" },
  { id: "07", name: "COORD_ENVÍOS", desc: "Coordina logística y notifica el estado del pedido al cliente.", icon: "⬡", status: "BETA" },
  { id: "08", name: "ANÁLISIS_IMAGEN", desc: "Procesa fotos de productos, facturas o documentos con visión IA.", icon: "⬡", status: "SOON" },
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
    <div className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden font-sans">
      {/* SCANLINES */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 4px)" }} />

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-[#1A1A1A]">
        <div className="font-mono text-sm font-bold tracking-widest text-white uppercase">
          &gt; QUANTUM <span className="text-[#00FFFF]">|</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-[10px] tracking-widest text-[#555] hover:text-[#00FFFF] transition-colors uppercase">
            // INICIO
          </Link>
          <Link href="/about" className="font-mono text-[10px] tracking-widest text-[#00FFFF] uppercase">
            // ABOUT
          </Link>
          <Link href="/onboarding" className="font-mono text-[10px] tracking-widest text-white border border-[#2A2A2A] px-4 py-2 hover:border-[#00FFFF]/40 hover:text-[#00FFFF] transition-all uppercase">
            [ INICIAR ]
          </Link>
        </div>
      </nav>

      {/* HERO ABOUT */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 pt-20 pb-16 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#00FFFF] uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
          ABOUT_QUANTUM_OS · KERNEL_DOC_v2.4
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none mb-6 italic">
          Un agente.<br /><span className="text-[#333]">Infinitas</span> <span className="text-[#00FFFF]">habilidades.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl text-[#666] text-base sm:text-lg font-light leading-relaxed">
          Quantum OS no es un chatbot. Es un <span className="text-white">sistema operativo de ventas</span> que vive en el WhatsApp de tu negocio. Lo configuras una vez, le asignas habilidades, y trabaja solo — 24/7.
        </motion.p>
      </section>

      {/* GRID DE HABILIDADES */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-20 max-w-6xl mx-auto">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#1A1A1A] border border-[#1A1A1A]">
          {SKILLS.map((skill, i) => (
            <motion.div key={skill.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group bg-[#0D0D0D] p-5 hover:bg-[#111] transition-colors relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] text-[#333]">[{skill.id}]</span>
                <StatusBadge status={skill.status} />
              </div>
              <div className="font-mono text-[11px] font-bold text-white tracking-wider mb-2 group-hover:text-[#00FFFF] transition-colors uppercase">
                {skill.name}
              </div>
              <p className="text-[12px] text-[#555] leading-relaxed group-hover:text-[#777]">
                {skill.desc}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#00FFFF] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-20 max-w-6xl mx-auto">
        <div className="border border-[#1A1A1A] p-12 flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] text-[#00FFFF] tracking-widest uppercase">INICIALIZAR_AGENTE</span>
            <h2 className="font-mono text-2xl sm:text-3xl font-bold text-white uppercase">Tu negocio ya no<br />necesita dormir.</h2>
          </div>
          <Link href="/onboarding" className="px-8 py-4 bg-white text-black font-mono text-xs uppercase font-bold tracking-widest hover:bg-[#00FFFF] transition-colors">
            [ ACTIVAR_PROTOCOLO ]
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#1A1A1A] px-6 sm:px-12 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4 text-[#333] font-mono text-[10px] tracking-widest uppercase">
          <span>QUANTUM_OS · ABOUT_DOC · BUILD_2026</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
            <span className="text-[#00FFFF]">KERNEL_ONLINE</span>
          </div>
        </div>
      </footer>
    </div>
  )
}