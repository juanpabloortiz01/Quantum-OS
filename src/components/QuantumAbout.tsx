"use client"

import { motion } from "framer-motion"

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

export default function AboutSection() {
  return (
    <div id="producto" className="bg-[#0D0D0D] text-white overflow-x-hidden font-sans">
      {/* SCANLINES */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 4px)" }} />

      {/* HERO ABOUT */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 pt-10 pb-16 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#00FFFF] uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-pulse" />
          ABOUT_QUANTUM_OS · KERNEL_DOC_v2.4
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none mb-6 italic uppercase">
          Un agente.<br /><span className="text-[#333]">Infinitas</span> <span className="text-[#00FFFF]">habilidades.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl text-[#666] text-base sm:text-lg font-light leading-relaxed">
          Quantum OS no es un chatbot. Es un <span className="text-white">agente de ventas con IA</span> que vive en el WhatsApp de tu negocio. Lo configuras una vez, le asignas habilidades, y trabaja solo — 24/7.
        </motion.p>
      </section>

      {/* GRID DE HABILIDADES */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-10 pb-20 max-w-6xl mx-auto">
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
    </div>
  )
}