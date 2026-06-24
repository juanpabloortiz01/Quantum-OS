"use client"

import { motion } from "motion/react"

const SKILLS = [
  { id: "01", name: "Validador OCR", desc: "Lee comprobantes de pago y detecta fraudes en milisegundos.", status: "ACTIVO" },
  { id: "02", name: "Gestor de Pedidos", desc: "Toma pedidos por WhatsApp y los organiza automáticamente.", status: "ACTIVO" },
  { id: "03", name: "Agenda de Citas", desc: "Sincroniza con Google Calendar sin intervención humana.", status: "ACTIVO" },
  { id: "04", name: "Análisis de Audio", desc: "Interpreta mensajes de voz y extrae la intención del cliente.", status: "ACTIVO" },
  { id: "05", name: "Catálogo y Stock", desc: "Gestiona productos, precios e inventario en tiempo real.", status: "ACTIVO" },
  { id: "06", name: "Registro de Clientes", desc: "Construye una base de datos de clientes automáticamente.", status: "BETA" },
  { id: "07", name: "Coordinador de Envíos", desc: "Coordina logística y notifica el estado del pedido al cliente.", status: "BETA" },
  { id: "08", name: "Análisis de Imagen", desc: "Procesa fotos de productos, facturas o documentos con IA.", status: "PRONTO" },
]

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVO: { bg: "bg-[#F54927]/10", text: "text-[#F54927]", border: "border-[#F54927]/20" },
    BETA: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    PRONTO: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  }[status] ?? { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" }

  return (
    <span className={`text-[10px] font-semibold tracking-wider px-2.5 py-1 uppercase rounded-full border ${config.bg} ${config.text} ${config.border}`}>
      {status}
    </span>
  )
}

export default function AboutSection() {
  return (
    <div id="producto" className="bg-[#FBFBFA] text-[#1A1A1A] overflow-x-hidden font-sans border-t border-[#E2E8F0]">

      {/* HERO ABOUT */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 pt-20 pb-16 max-w-6xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 text-xs font-semibold tracking-widest text-[#F54927] uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F54927]" />
          Capacidades del Sistema
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Un Agente Inteligente.<br /><span className="text-[#F54927]">Múltiples habilidades.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-[#4B5563] text-base sm:text-lg leading-relaxed">
          Tito no es un chatbot. Es un <span className="font-semibold text-[#1A1A1A]">agente de ventas con IA</span> que vive en el WhatsApp de tu negocio. Lo configuras una vez, le asignas habilidades, y trabaja solo — 24/7.
        </motion.p>
      </section>

      {/* GRID DE HABILIDADES */}
      <section className="relative z-10 px-6 sm:px-12 md:px-24 py-10 pb-20 max-w-6xl mx-auto">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SKILLS.map((skill, i) => (
            <motion.div key={skill.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group bg-white border border-[#E2E8F0] rounded-xl p-6 hover:shadow-md hover:border-[#F54927]/30 transition-all relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#F54927] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-[#94A3B8]">{skill.id}</span>
                <StatusBadge status={skill.status} />
              </div>
              <div className="text-sm font-bold text-[#1A1A1A] mb-2 group-hover:text-[#F54927] transition-colors">
                {skill.name}
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed flex-grow">
                {skill.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}