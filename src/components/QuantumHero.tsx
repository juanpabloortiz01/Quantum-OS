"use client"

import { LayoutGroup, motion } from "motion/react"
import { TextRotate } from "@/components/ui/text-rotate"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState } from "react"
import AgentChat, { AgentMessage } from "@/components/ui/AgentChat"
import { chatWithAgent } from "@/app/actions/chat"
import TitoMascot from "@/components/TitoMascot"

export default function QuantumHero() {
  const { status } = useSession()
  const agentType = "Ventas" as const
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [chatStatus, setChatStatus] = useState<"ready" | "streaming" | "submitted" | "idle">("ready")

  const handleSendMessage = async (msg: { role: "user"; content: string }) => {
    const newMessage: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: msg.content }]
    }
    const newMessages = [...messages, newMessage]
    setMessages(newMessages)
    setChatStatus("submitted")
    
    try {
      const responseText = await chatWithAgent(newMessages, agentType)
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: responseText }]
      }])
    } catch (e) {
      console.error(e)
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "Lo siento, hubo un problema al conectar con el agente. Por favor intenta de nuevo." }]
      }])
    } finally {
      setChatStatus("ready")
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] text-[#1A1A1A] overflow-hidden relative selection:bg-orange-100 selection:text-[#F54927] font-sans">

      {/* ── DOT GRID MINIMALISTA ── */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* ── BORDES DECORATIVOS ── */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t border-l border-[#F54927]/20 pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-[#F54927]/20 pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b border-l border-[#F54927]/20 pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b border-r border-[#F54927]/20 pointer-events-none z-10" />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center px-6 sm:px-12 md:px-24 pt-24 pb-12 md:py-24 w-full max-w-[1400px] mx-auto">

        {/* LEFT SIDE */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left w-full">
          
          {/* HEADLINE PRINCIPAL */}
          <div className="w-full flex flex-col items-center justify-center lg:items-start lg:justify-start">
            <LayoutGroup>
              <motion.div
                className="flex flex-col items-center lg:items-start gap-2 sm:gap-3"
                layout
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", damping: 30 }}
                  className="text-3xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-[#1A1A1A] leading-none"
                  layout
                >
                  Menos caos.
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring", damping: 30 }}
                  className="flex flex-row items-center justify-center lg:justify-start gap-2 sm:gap-4 text-3xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-none"
                  layout
                >
                  <span className="text-[#F54927]">Más</span>
                  <TextRotate
                    texts={[
                      "Ventas",
                      "Control",
                      "Tiempo",
                      "Claridad",
                      "Ingresos",
                    ]}
                    mainClassName="text-[#1A1A1A] px-3 sm:px-5 md:px-6 bg-white border border-[#F54927]/20 shadow-sm overflow-hidden py-0.5 sm:py-2 justify-center rounded-xl flex-nowrap whitespace-nowrap"
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

          {/* CTA & DESCRIPTION ROW */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 lg:mt-12 flex flex-col lg:flex-row items-center lg:items-center gap-6 relative z-20 w-full justify-center lg:justify-start"
          >
            <div className="w-full sm:w-auto shrink-0 order-2 lg:order-1">
              <Link 
                href={status === "authenticated" ? "/dashboard" : "/onboarding"} 
                className="w-full sm:w-auto px-8 py-4 bg-[#F54927] text-white text-sm font-medium hover:bg-[#d93d1f] transition-colors duration-300 rounded-lg shadow-md shadow-[#F54927]/25 border border-transparent text-center flex justify-center items-center"
              >
                {status === "loading" ? "..." : status === "authenticated" ? "Ir al Panel" : "Crear Agente"}
              </Link>
            </div>

            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed max-w-sm order-1 lg:order-2 lg:border-l lg:border-[#E2E8F0] lg:pl-6 text-center lg:text-left">
              Configura en minutos un Agente de Ventas en WhatsApp con IA.
            </p>
          </motion.div>


        </div>

        {/* RIGHT SIDE - MASCOT + AGENT CHAT */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full flex justify-center lg:justify-end"
        >
          <div className="w-full max-w-lg flex flex-col items-center">
            
            {/* ── TITO MASCOT ── */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-[-18px] relative z-30 drop-shadow-xl"
            >
              <TitoMascot className="w-24 h-24 sm:w-28 sm:h-28" />
            </motion.div>

            {/* ── CHAT WINDOW ── */}
            <div className="w-full h-[420px] sm:h-[500px] md:h-[550px] flex flex-col border border-[#E2E8F0] rounded-2xl bg-[#FAFAFA] shadow-2xl overflow-hidden relative z-20">
              {/* HEADER */}
              <div className="flex items-center px-4 py-3 border-b border-[#E2E8F0] bg-white gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F54927] animate-pulse" />
                <span className="text-sm font-semibold text-[#1A1A1A]">Habla con Tito</span>
              </div>

              {/* CHAT AREA */}
              <div className="flex-1 relative bg-white">
                <AgentChat 
                  messages={messages}
                  onSend={handleSendMessage}
                  status={chatStatus}
                  emptyStatePosition="default"
                  className="absolute inset-0"
                />
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}