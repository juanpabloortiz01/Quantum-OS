"use client";
import React from "react";
import { ShieldCheckIcon, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { BorderTrail } from "./ui/border-trail";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function QuantumPricing() {
  const { status } = useSession();
  return (
    <section id="planes" className="relative min-h-screen py-24 bg-[#FBFBFA] border-t border-[#E2E8F0] font-sans">
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
            <div className="border border-[#E2E8F0] px-4 py-1 text-xs font-semibold text-[#6B7280] uppercase tracking-widest bg-white rounded-full shadow-sm">
              Planes y Precios
            </div>
          </div>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tight md:text-5xl text-[#1A1A1A]">
            Paga solo por la tecnología. <br />
            <span className="text-[#F54927]">Quédate con el 100% de la venta.</span>
          </h2>
          <p className="mt-5 text-center text-sm md:text-base font-medium text-[#6B7280]">
            Elige el plan ideal para tu negocio y automatiza tus ventas sin comisiones ocultas.
          </p>
        </motion.div>

        <div className="relative mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-4xl space-y-6 relative z-10"
          >
            {/* GRID DE PRECIOS */}
            <div className="grid md:grid-cols-2 bg-white rounded-2xl relative border border-[#E2E8F0] shadow-sm overflow-hidden">
              
              {/* PLAN 1: FREEMIUM */}
              <div className="w-full px-8 pt-10 pb-10 border-b md:border-b-0 md:border-r border-[#E2E8F0]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="leading-none font-bold text-[#1A1A1A] text-xl tracking-tight">Emprendedor</h3>
                    <Badge variant="outline" className="text-[#6B7280] border-[#E2E8F0]">Gratis</Badge>
                  </div>
                  <p className="text-[#6B7280] text-sm h-10">Digitaliza tu catálogo, automatiza la atención inicial y prueba el sistema sin riesgo.</p>
                </div>
                <div className="mt-8 space-y-6">
                  <div className="text-[#1A1A1A] flex items-end gap-1 text-xl">
                    <span className="text-[#94A3B8] font-medium">$</span>
                    <span className="-mb-1 text-5xl font-bold tracking-tighter">0</span>
                    <span className="text-[#6B7280] font-medium text-sm">/mes</span>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-[#4B5563] mb-8">
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#94A3B8] shrink-0" /> <span className="pt-0.5">IA Conversacional Estándar (100 chats/mes)</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#94A3B8] shrink-0" /> <span className="pt-0.5">Validación de Pagos Automática (Máx 10/mes)</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#94A3B8] shrink-0" /> <span className="pt-0.5">Pedidos derivados al encargado</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#94A3B8] shrink-0" /> <span className="pt-0.5">Respuesta de Preguntas Frecuentes</span></li>
                  </ul>

                  <Button className="w-full bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB] hover:text-black border border-[#E2E8F0] shadow-sm font-medium" asChild>
                    <Link href={status === "authenticated" ? "/dashboard" : "/onboarding"}>
                      {status === "loading" ? "Cargando..." : status === "authenticated" ? "Ir al Panel" : "Comenzar Gratis"}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* PLAN 2: PRO */}
              <div className="relative w-full px-8 pt-10 pb-10 bg-[#F9FAFB]">
                <BorderTrail
                  style={{
                    boxShadow: "0px 0px 60px 30px rgba(245, 73, 39, 0.06), 0 0 100px 60px rgba(245, 73, 39, 0.03)",
                  }}
                  size={120}
                />
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="leading-none font-bold text-[#1A1A1A] text-xl tracking-tight">Crecimiento</h3>
                    <Badge className="bg-[#F54927] text-white hover:bg-[#d93d1f]">Popular</Badge>
                  </div>
                  <p className="text-[#6B7280] text-sm h-10">Agente ilimitado creado para escalar ventas sin sumar más equipo.</p>
                </div>
                <div className="mt-8 space-y-6 relative z-10">
                  <div className="text-[#1A1A1A] flex items-end gap-1 text-xl">
                    <span className="text-[#94A3B8] font-medium">$</span>
                    <span className="-mb-1 text-5xl font-bold tracking-tighter">50</span>
                    <span className="text-[#6B7280] font-medium text-sm">/mes</span>
                  </div>

                  <ul className="space-y-3 text-sm text-[#4B5563] mb-8">
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#F54927] shrink-0" /> <span className="pt-0.5 font-medium">Todo lo del plan Gratis, más:</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#F54927] shrink-0" /> <span className="pt-0.5">Interacciones ilimitadas mensuales</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#F54927] shrink-0" /> <span className="pt-0.5">Validación de pagos ilimitada</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#F54927] shrink-0" /> <span className="pt-0.5">Sincronización con Google Calendar</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle2 className="size-5 text-[#F54927] shrink-0" /> <span className="pt-0.5">Soporte prioritario 24/7</span></li>
                  </ul>

                  <Button className="w-full bg-[#F54927] text-white hover:bg-[#d93d1f] transition-colors shadow-md shadow-[#F54927]/25 font-medium" asChild>
                    <Link href={status === "authenticated" ? "/dashboard" : "/onboarding"}>
                      {status === "loading" ? "Cargando..." : status === "authenticated" ? "Ir al Panel" : "Activar plan PRO"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Disclaimer inferior */}
            <div className="text-[#94A3B8] flex items-center justify-center gap-x-2 text-xs font-medium uppercase mt-8 tracking-widest">
              <ShieldCheckIcon className="size-4 shrink-0" />
              <span>Cancelación en cualquier momento. Sin ataduras.</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}