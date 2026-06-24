"use client"

import { motion } from "motion/react"
import { CalendarCheck, ShoppingBag, Bell, Headphones } from "lucide-react"

const SKILLS = [
  {
    icon: CalendarCheck,
    title: "Agendamiento Automático",
    desc: "Coordina citas y reservas directamente desde WhatsApp, sin intervención humana. Sincroniza con tu calendario en tiempo real.",
    number: "01",
  },
  {
    icon: ShoppingBag,
    title: "Toma de Pedidos",
    desc: "Recibe, organiza y procesa los pedidos de tus clientes de forma automática, clara y sin errores.",
    number: "02",
  },
  {
    icon: Bell,
    title: "Notificaciones",
    desc: "Notifica a tus clientes automáticamente sobre confirmaciones, recordatorios de citas y estados de pedido.",
    number: "03",
  },
  {
    icon: Headphones,
    title: "Atención Personalizada",
    desc: "Responde con el tono y contexto de tu negocio, como si fuera parte de tu equipo. Disponible 24/7.",
    number: "04",
  },
]

export default function TitoSkills() {
  return (
    <section id="producto" className="bg-white py-24 px-6 sm:px-12 md:px-24 border-t border-[#E2E8F0] font-sans relative overflow-hidden">

      {/* Subtle background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-[0.04]"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, #F54927 0%, transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#F54927] uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F54927]" />
            Lo que Tito puede hacer
            <span className="w-1.5 h-1.5 rounded-full bg-[#F54927]" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1A1A1A] leading-tight mb-5">
            Un agente.{" "}
            <span className="text-[#F54927]">Cuatro superpoderes.</span>
          </h2>
          <p className="text-[#4B5563] max-w-lg mx-auto text-base leading-relaxed">
            Tito trabaja 24/7 dentro del WhatsApp de tu negocio, haciendo todo lo que necesitas — sin sumar más equipo.
          </p>
        </motion.div>

        {/* ── SKILLS GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SKILLS.map((skill, i) => (
            <motion.div
              key={skill.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="group bg-[#FBFBFA] border border-[#E2E8F0] rounded-2xl p-7 hover:border-[#F54927]/40 hover:shadow-xl hover:shadow-[#F54927]/5 transition-all duration-300 relative overflow-hidden flex flex-col"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F54927] to-[#ff7a57] scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-t-2xl" />

              {/* Number */}
              <span className="text-xs font-bold text-[#E2E8F0] mb-4 self-start group-hover:text-[#F54927]/30 transition-colors">
                {skill.number}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#F54927]/10 flex items-center justify-center mb-5 group-hover:bg-[#F54927] transition-all duration-300 group-hover:scale-110">
                <skill.icon
                  className="w-6 h-6 text-[#F54927] group-hover:text-white transition-colors duration-300"
                  strokeWidth={1.75}
                />
              </div>

              <h3 className="text-sm font-bold text-[#1A1A1A] mb-2.5 leading-snug">
                {skill.title}
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed flex-grow">
                {skill.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
