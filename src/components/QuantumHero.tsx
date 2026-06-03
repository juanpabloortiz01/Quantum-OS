"use client"

import { LayoutGroup, motion } from "motion/react"
import { TextRotate } from "@/components/ui/text-rotate"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState } from "react"
import AgentChat, { AgentMessage } from "@/components/ui/AgentChat"
import { chatWithAgent } from "@/app/actions/chat"

export default function QuantumHero() {
  const { status } = useSession()
  const [agentType, setAgentType] = useState<"Ventas" | "Agenda">("Ventas")
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
    } finally {
      setChatStatus("ready")
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] text-[#1A1A1A] overflow-hidden relative selection:bg-slate-200 selection:text-black font-sans">

      {/* ── DOT GRID MINIMALISTA ── */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* ── BORDES DECORATIVOS FINOS ── */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t border-l border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b border-l border-[#E2E8F0] pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b border-r border-[#E2E8F0] pointer-events-none z-10" />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center px-6 sm:px-12 md:px-24 py-24 w-full max-w-[1400px] mx-auto">

        {/* LEFT SIDE */}
        <div className="flex flex-col items-start text-left w-full">
          
          {/* HEADLINE PRINCIPAL */}
          <div className="w-full flex flex-col items-start justify-start">
            <LayoutGroup>
              <motion.div
                className="flex flex-col items-start gap-2 sm:gap-3"
                layout
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", damping: 30 }}
                  className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-[#1A1A1A] leading-none"
                  layout
                >
                  Menos caos.
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring", damping: 30 }}
                  className="flex flex-col sm:flex-row items-center justify-start gap-3 sm:gap-4 text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-none"
                  layout
                >
                  <span className="text-[#94A3B8]">Más</span>
                  <TextRotate
                    texts={[
                      "Ventas",
                      "Control",
                      "Tiempo",
                      "Claridad",
                      "Ingresos",
                    ]}
                    mainClassName="text-[#1A1A1A] px-4 sm:px-5 md:px-6 bg-white border border-[#E2E8F0] shadow-sm overflow-hidden py-1 sm:py-2 justify-center rounded-xl"
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
            className="mt-12 flex flex-col xl:flex-row items-start xl:items-center gap-6 relative z-20 w-full"
          >
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Link 
                href={status === "authenticated" ? "/dashboard" : "/onboarding"} 
                className="w-full sm:w-auto px-8 py-4 bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333333] transition-colors duration-300 rounded-lg shadow-md border border-transparent text-center flex justify-center items-center"
              >
                {status === "loading" ? "..." : status === "authenticated" ? "Ir al Panel" : "Crear Agente"}
              </Link>
            </div>

            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed max-w-sm xl:border-l xl:border-[#E2E8F0] xl:pl-6">
              Configura en minutos un Agente de Ventas en WhatsApp con IA.
            </p>
          </motion.div>


        </div>

        {/* RIGHT SIDE - AGENT CHAT */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full flex justify-center lg:justify-end"
        >
          <div className="w-full max-w-lg h-[550px] flex flex-col border border-[#E2E8F0] rounded-2xl bg-[#FAFAFA] shadow-2xl overflow-hidden relative z-20">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-[#1A1A1A]">Simulador IA</span>
              </div>
              <div className="flex bg-[#F3F4F6] p-1 rounded-lg">
                <button 
                  onClick={() => { setAgentType("Ventas"); setMessages([]); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${agentType === "Ventas" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-[#4B5563] hover:text-[#1A1A1A]"}`}
                >
                  Ventas
                </button>
                <button 
                  onClick={() => { setAgentType("Agenda"); setMessages([]); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${agentType === "Agenda" ? "bg-white shadow-sm text-[#1A1A1A]" : "text-[#4B5563] hover:text-[#1A1A1A]"}`}
                >
                  Agenda
                </button>
              </div>
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
        </motion.div>

      </div>
    </div>
  )
}