"use client";
import React from "react";
import { PlusIcon, ShieldCheckIcon, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { BorderTrail } from "./ui/border-trail";

export default function QuantumPricing() {
  return (
    <section id="planes" className="relative min-h-screen overflow-hidden py-24 bg-[#0a0a0a] border-t border-[#1a1a1a]">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4">
        
        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl space-y-5"
        >
          <div className="flex justify-center">
            <div className="border border-[#333333] px-4 py-1 font-mono text-xs text-[#00FFFF] uppercase tracking-widest bg-[#00FFFF]/10">
              [ DESPLIEGUE_DE_INFRAESTRUCTURA ]
            </div>
          </div>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tighter md:text-5xl text-white">
            Paga por el motor. <br />
            <span className="text-gray-500">Quédate con el 100% de la venta.</span>
          </h2>
          <p className="text-gray-400 mt-5 text-center text-sm md:text-base font-light">
            Elige tu nivel de acceso al Quantum OS y recupera el mando de tu negocio.
          </p>
        </motion.div>

        <div className="relative mt-16">
          {/* Fondo Cuadrícula */}
          <div
            className={cn(
              "z-0 pointer-events-none absolute inset-0 size-full",
              "bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)]",
              "bg-[size:32px_32px]",
              "[mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]"
            )}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-4xl space-y-6 relative z-10"
          >
            {/* GRID DE PRECIOS */}
            <div className="grid md:grid-cols-2 bg-[#0a0a0a] relative border border-[#333333]">
              {/* Esquinas Técnicas */}
              <PlusIcon className="absolute -top-3 -left-3 size-6 text-[#333333]" />
              <PlusIcon className="absolute -top-3 -right-3 size-6 text-[#333333]" />
              <PlusIcon className="absolute -bottom-3 -left-3 size-6 text-[#333333]" />
              <PlusIcon className="absolute -right-3 -bottom-3 size-6 text-[#333333]" />

              {/* PLAN 1: FREEMIUM */}
              <div className="w-full px-8 pt-10 pb-10 border-b md:border-b-0 md:border-r border-[#333333]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="leading-none font-mono font-bold text-white text-xl uppercase tracking-wider">Iniciación</h3>
                    <Badge variant="secondary">Limitado</Badge>
                  </div>
                  <p className="text-gray-500 text-sm h-10">Digitaliza tu catálogo, automatiza la atención inicial y experimenta el blindaje de pagos sin riesgo.</p>
                </div>
                <div className="mt-8 space-y-6">
                  <div className="text-gray-400 flex items-end gap-1 text-xl font-mono">
                    <span className="text-[#00FFFF]">$</span>
                    <span className="text-white -mb-1 text-5xl font-bold tracking-tighter">0</span>
                    <span>/mes</span>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-gray-400 mb-8 font-mono">
                    <li className="flex gap-2"><Terminal className="size-4 text-[#00FFFF]" /> IA Conversacional Estandar (100 chats/mes)</li>
                    <li className="flex gap-2"><Terminal className="size-4 text-[#00FFFF]" /> Validación de Pagos Automática(Máx 10/mes)</li>
                    <li className="flex gap-2"><Terminal className="size-4 text-[#00FFFF]" /> Pedidos Derivados al Encargado</li>
                    <li className="flex gap-2"><Terminal className="size-4 text-[#00FFFF]" /> Menu interactivo en WhatsApp (Dependiendo del negocio)</li>
                  </ul>

                  <Button className="w-full" variant="outline" asChild>
                    <a href="#">[ DESPLEGAR_SISTEMA ]</a>
                  </Button>
                </div>
              </div>

              {/* PLAN 2: PRO (Con Borde Animado) */}
              <div className="relative w-full px-8 pt-10 pb-10 bg-[#121212]">
                <BorderTrail
                  style={{
                    boxShadow: "0px 0px 60px 30px rgba(0, 255, 255, 0.1), 0 0 100px 60px rgba(0, 255, 255, 0.05)",
                  }}
                  size={120}
                />
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="leading-none font-mono font-bold text-white text-xl uppercase tracking-wider">Ilimitado</h3>
                    <Badge variant="default">Full-Auto</Badge>
                  </div>
                  <p className="text-gray-400 text-sm h-10">Superioridad Operativa de grado industrial.</p>
                </div>
                <div className="mt-8 space-y-6 relative z-10">
                  <div className="text-gray-400 flex items-end gap-1 text-xl font-mono">
                    <span className="text-[#00FFFF]">$</span>
                    <span className="text-white -mb-1 text-5xl font-bold tracking-tighter">30</span>
                    <span>/mes</span>
                  </div>

                  <ul className="space-y-3 text-sm text-gray-300 mb-8 font-mono">
                    <li className="flex gap-2"><ShieldCheckIcon className="size-4 text-[#00FFFF]" /> IA Conversacional Avanzada con Personalidad Adaptativa (Ilimitado)</li>
                    <li className="flex gap-2"><ShieldCheckIcon className="size-4 text-[#00FFFF]" /> Conexión con Google Calendar para citas o Sheets para inventario</li>
                    <li className="flex gap-2"><ShieldCheckIcon className="size-4 text-[#00FFFF]" /> Validación Bancaria Ilimitada</li>
                    <li className="flex gap-2"><ShieldCheckIcon className="size-4 text-[#00FFFF]" /> Comandos de Control para el Dueño</li>
                    <li className="flex gap-2"><ShieldCheckIcon className="size-4 text-[#00FFFF]" /> Recordatorios y Promociones (Smart Marketing)</li>
                  </ul>

                  <Button className="w-full bg-[#00FFFF] text-black hover:bg-white hover:text-black transition-colors" asChild>
                    <a href="#">[ DESPLEGAR_SISTEMA ]</a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer inferior */}
            <div className="text-gray-500 flex items-center justify-center gap-x-2 text-xs font-mono uppercase mt-8 tracking-widest">
              <ShieldCheckIcon className="size-4 text-[#333333]" />
              <span>Infraestructura alojada en servidores de alta disponibilidad.</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}