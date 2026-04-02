"use client";

import { motion } from "motion/react";

const steps = [
  {
    id: "NODO_01",
    status: "SYNC_OK",
    title: "Sincronización de Contexto",
    desc: "Inyecta tu catálogo, políticas y precios en la red neuronal. La IA de Quantum absorbe las reglas de tu negocio en segundos para responder con precisión quirúrgica.",
    metric: "0.2s LOAD",
  },
  {
    id: "NODO_02",
    status: "ACTIVE",
    title: "Operativa Autónoma",
    desc: "Tu instancia de WhatsApp se transforma en una terminal de ventas. El agente negocia, atiende consultas complejas y guía al cliente hacia el cierre sin intervención humana.",
    metric: "24/7 RUN",
  },
  {
    id: "NODO_03",
    status: "SECURE",
    title: "Blindaje Transaccional",
    desc: "El Escudo Pentagonal OCR intercepta comprobantes de pago. Extrae montos, fechas y referencias, cruzándolos contra alertas bancarias en tiempo real. Cero tolerancia al fraude.",
    metric: "100% VERIFIED",
  },
  {
    id: "NODO_04",
    status: "LOGGED",
    title: "Auditoría de Sistemas",
    desc: "Cada venta cerrada y pagada se registra automáticamente en tu base de datos y Google Sheets. Contabilidad exacta, sin tocar el celular.",
    metric: "DATA_SYNC",
  },
];

export default function QuantumProcess() {
  return (
    <section className="relative w-full py-32 bg-[#0D0D0D] overflow-hidden border-t border-[#1A1A1A] font-sans selection:bg-[#00FFFF] selection:text-black">
      
      {/* ── BACKGROUND TECH ── */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)" }} />
      <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #00FFFF 1px, transparent 1px), linear-gradient(to bottom, #00FFFF 1px, transparent 1px)`, backgroundSize: "40px 40px", maskImage: "linear-gradient(to bottom, black, transparent)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 md:px-24">
        
        {/* ENCABEZADO TÉCNICO */}
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#1A1A1A] pb-8 relative">
          {/* Decoración Esquina */}
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-[#00FFFF]/50" />
          
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[#00FFFF] mb-4">
              <span className="w-1.5 h-1.5 bg-[#00FFFF]" /> PIPELINE_OPERATIVO
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-fira-code), monospace" }}>
              De la duda a la certeza en <span className="text-[#444]">4 ciclos.</span>
            </h2>
          </div>
          <div className="font-mono text-[10px] text-[#444] tracking-widest text-right">
            [ SECUENCIA_DE_EJECUCIÓN_ESTRICTA ]<br />
            LATENCIA_ESTIMADA: MÍNIMA
          </div>
        </div>

        {/* NODOS DE PROCESO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1A1A1A] border border-[#1A1A1A] relative">
          {/* Punto de resplandor central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00FFFF]/5 blur-[100px] pointer-events-none z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15 }}
              className="bg-[#0D0D0D] p-8 sm:p-12 relative group z-10 hover:bg-[#111] transition-colors duration-500"
            >
              {/* Decoraciones Hover */}
              <div className="absolute top-0 left-0 w-0 h-[1px] bg-[#00FFFF] transition-all duration-500 group-hover:w-full opacity-0 group-hover:opacity-100" />
              <div className="absolute top-0 left-0 w-[1px] h-0 bg-[#00FFFF] transition-all duration-500 group-hover:h-full opacity-0 group-hover:opacity-100" />

              <div className="flex justify-between items-start mb-12">
                <div className="font-mono text-xs text-[#333] tracking-widest group-hover:text-[#00FFFF]/50 transition-colors">
                  {step.id}
                </div>
                <div className="px-2 py-1 bg-[#111] border border-[#222] font-mono text-[9px] text-[#666] tracking-[0.2em]">
                  {step.status}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-fira-code), monospace" }}>
                {step.title}
              </h3>
              <p className="text-[#666] text-sm leading-relaxed mb-8">
                {step.desc}
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#222] to-transparent" />
                <span className="font-mono text-[10px] text-[#00FFFF] tracking-widest">{step.metric}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}