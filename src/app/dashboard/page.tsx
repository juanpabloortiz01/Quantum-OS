"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion"; // Note: package.json says motion, but onboarding uses motion/react. I'll try motion/react for consistency if possible, but template said framer-motion.
import { cn } from "@/lib/utils";
import { 
  Settings, Search, Users, CheckSquare, X, Power, 
  Calendar, Heart, ShoppingBag, Eye, Map, Wifi, WifiOff,
  LogOut, UserCircle
} from "lucide-react";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDashboardLayout, saveActiveSkills, getCalendarConnectionStatus, getLeads, toggleAgent } from "./action";

interface GlassModule {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  icon: any;
}

interface Lead {
  name: string;
  trustScore: number;
  intent: string;
  summary: string;
  phone?: string;
  agentActive?: boolean;
}

const MODULE_LIBRARY = [
  { id: "calendar", name: "Agenda", description: "Sincronización con Google Calendar y agendamiento automático.", icon: Calendar, niches: ["AGENDA"] },
  { id: "ventas", name: "Ventas", description: "Gestión de pedidos y procesamiento de pagos por WhatsApp.", icon: ShoppingBag, niches: ["VENTAS"] },
  { id: "loyalty", name: "Lealtad", description: "Sistema de puntos y premios para clientes recurrentes.", icon: Heart, niches: ["VENTAS"] },
];

const LiquidGlassDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeView, setActiveView] = React.useState<"modules" | "leads" | "collaborators" | "config">("modules");
  const [niche, setNiche] = React.useState<string>("AGENDA");
  const [modules, setModules] = React.useState<GlassModule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [teamPhones, setTeamPhones] = React.useState({ agent: "", human: "" });

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  React.useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      const layout = await getDashboardLayout();
      const conn = await getCalendarConnectionStatus();
      const fetchedLeads = await getLeads();
      
      setLeads(fetchedLeads);
      if (layout) {
        setNiche(layout.niche);
        setTeamPhones({
          agent: layout.whatsappNumber || "No configurado",
          human: layout.notifPhone || "No configurado"
        });
        
        // Filter modules by niche
        const availableModules = MODULE_LIBRARY.filter(m => m.niches.includes(layout.niche))
          .map(m => ({
            ...m,
            enabled: layout.activeSkills.includes(m.id)
          }));
        
        // Auto-activate calendar if returning from successful Google OAuth
        const isCalendarSuccess = searchParams.get("calendar_success") === "1";
        if (isCalendarSuccess && conn.connected && !layout.activeSkills.includes("calendar")) {
          const autoActivatedModules = availableModules.map(m => m.id === "calendar" ? { ...m, enabled: true } : m);
          setModules(autoActivatedModules);
          const activeIds = autoActivatedModules.filter(m => m.enabled).map(m => m.id);
          await saveActiveSkills(activeIds);
          
          // Optionally clean the URL
          router.replace("/dashboard", { scroll: false });
        } else {
          setModules(availableModules);
        }
      }
      setGoogleConnected(conn.connected);
      setLoading(false);
    }
    if (status === "authenticated") loadData();
  }, [status]);

  const handleGoogleSync = async () => {
    await signIn("google-calendar", {
      callbackUrl: "/dashboard?calendar_success=1",
    });
  };

  const toggleModule = async (id: string) => {
    if (id === "calendar") {
      const module = modules.find(m => m.id === "calendar");
      if (!module?.enabled && !googleConnected) {
        await handleGoogleSync();
        return;
      }
    }

    const updatedModules = modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    setModules(updatedModules);
    
    // Persist
    const activeIds = updatedModules.filter(m => m.enabled).map(m => m.id);
    await saveActiveSkills(activeIds);
  };

  const handleToggleAgent = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation(); // Evitar abrir el modal
    const newState = !(lead.agentActive ?? true);
    
    // Update local state optimistic
    setLeads(prev => prev.map(l => l.phone === lead.phone ? { ...l, agentActive: newState } : l));
    if (selectedLead && selectedLead.phone === lead.phone) {
      setSelectedLead({ ...selectedLead, agentActive: newState });
    }
    
    // Update server
    if (lead.phone) {
      await toggleAgent(lead.phone, newState);
    }
  };

  const menuItems = [
    { icon: CheckSquare, view: "modules" as const, label: "Módulos" },
    { icon: Search, view: "leads" as const, label: "Leads" },
    { icon: Users, view: "collaborators" as const, label: "Equipo" },
    { icon: Settings, view: "config" as const, label: "Ajustes" },
  ];

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm font-light text-gray-500 italic">Sincronizando Estación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8 overflow-hidden font-sans selection:bg-gray-200">
      
      {/* Sidebar Menu */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-8 left-8 flex flex-col gap-6 z-50"
      >
        {menuItems.map((item, idx) => (
          <motion.button
            key={item.view}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setActiveView(item.view)}
            className={cn(
              "w-12 h-12 rounded-xl backdrop-blur-xl bg-white/40 border border-white/60",
              "hover:bg-white/60 transition-all duration-300",
              "flex items-center justify-center group relative",
              "shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
              activeView === item.view && "bg-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            )}
          >
            <item.icon className={cn("w-5 h-5 transition-colors", activeView === item.view ? "text-gray-900" : "text-gray-500")} strokeWidth={1.5} />
            <span className="absolute left-16 px-3 py-1 bg-gray-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium shadow-xl">
              {item.label}
            </span>
          </motion.button>
        ))}

        <div className="h-px bg-gray-200 w-8 mx-auto my-2" />

        <motion.button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-12 h-12 rounded-xl backdrop-blur-xl bg-white/40 border border-white/60 hover:bg-rose-50/60 hover:border-rose-200 transition-all duration-300 flex items-center justify-center group relative"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" strokeWidth={1.5} />
          <span className="absolute left-16 px-3 py-1 bg-rose-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium shadow-xl">
            Salir
          </span>
        </motion.button>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto pt-10">
        <AnimatePresence mode="wait">
          {activeView === "modules" && (
            <motion.div
              key="modules"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center mb-16">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 backdrop-blur-md border border-white/80 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 shadow-sm"
                >
                   Estación Operativa • {niche}
                </motion.div>
                <h1 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight uppercase italic">
                  Dashboard
                </h1>
                <p className="text-gray-500 font-light text-lg">
                  Activa capacidades y sincroniza el comportamiento de la IA.
                </p>
              </div>

              {/* Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {modules.map((module, idx) => (
                  <div key={module.id} className="relative h-full flex flex-col">
                    {/* Tooltip exterior señalando al switch */}
                    {module.id === "calendar" && !module.enabled && !googleConnected && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-14 right-4 bg-blue-600 text-white text-[11px] font-medium px-4 py-2.5 rounded-xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] z-50 w-64 text-right leading-snug"
                      >
                        Activa esta habilidad para agendar tus citas automáticamente en el calendario de google
                        {/* Triángulo apuntando hacia abajo (al switch) */}
                        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-blue-600 rotate-45" />
                      </motion.div>
                    )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "relative flex-1 rounded-3xl backdrop-blur-xl border transition-all duration-500 overflow-hidden h-full",
                      "shadow-[inset_2px_2px_8px_rgba(255,255,255,0.6),inset_-2px_-2px_8px_rgba(0,0,0,0.05)]",
                      module.enabled
                        ? "bg-white/70 border-white/90 shadow-xl"
                        : "bg-white/20 border-white/40"
                    )}
                  >
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-8">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          module.enabled ? "bg-gray-900 shadow-lg rotate-0" : "bg-white/40 -rotate-3"
                        )}>
                          <module.icon className={cn("w-6 h-6", module.enabled ? "text-white" : "text-gray-400")} strokeWidth={1.5} />
                        </div>
                        <button
                          onClick={() => toggleModule(module.id)}
                          className={cn(
                            "relative w-14 h-7 rounded-full transition-all duration-300",
                            "shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]",
                            module.enabled ? "bg-gray-900" : "bg-gray-300"
                          )}
                        >
                          <motion.div
                            animate={{ x: module.enabled ? 28 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                              "absolute top-1 w-5 h-5 rounded-full shadow-lg",
                              module.enabled ? "bg-white" : "bg-gray-100"
                            )}
                          />
                        </button>
                      </div>
                      <h3 className={cn("text-2xl font-semibold mb-3 tracking-tight", module.enabled ? "text-gray-900" : "text-gray-400")}>
                        {module.name}
                      </h3>
                      <p className="text-sm font-light text-gray-500 leading-relaxed min-h-[3rem]">
                        {module.description}
                      </p>
                      

                      
                      {module.id === "calendar" && module.enabled && googleConnected && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-center gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-xs text-emerald-700 font-medium">
                            Calendario Sincronizado
                          </p>
                        </motion.div>
                      )}


                    </div>
                    {module.enabled && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-800 to-gray-300"
                        style={{ transformOrigin: "left" }}
                      />
                    )}
                  </motion.div>
                </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeView === "leads" && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="text-center mb-16">
                <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
                  Directorio
                </h1>
                <p className="text-gray-500 font-light text-lg">
                  Clientes detectados por la IA en tiempo real.
                </p>
              </div>

              <div className="space-y-4">
                {leads.map((lead, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      "rounded-3xl backdrop-blur-xl bg-white/60 border border-white/80 p-6 cursor-pointer",
                      "shadow-[inset_2px_2px_8px_rgba(255,255,255,0.6),inset_-2px_-2px_8px_rgba(0,0,0,0.05)]",
                      "hover:bg-white/90 transition-all duration-300 hover:shadow-lg group"
                    )}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all duration-500">
                         <UserCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-1">
                          <span className="text-xl font-semibold text-gray-900">
                            {lead.name} {lead.phone && <span className="text-sm font-light text-gray-400">({lead.phone.split('@')[0]})</span>}
                          </span>
                        </div>
                        <p className="text-sm font-light text-gray-500 italic truncate max-w-md">
                          "{lead.summary}"
                        </p>
                      </div>
                      
                      {/* Agent Switch Toggle */}
                      <div className="flex flex-col items-center mr-4" onClick={(e) => handleToggleAgent(e, lead)}>
                        <div className={cn(
                          "relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]",
                          (lead.agentActive ?? true) ? "bg-gray-900" : "bg-gray-300"
                        )}>
                          <motion.div
                            animate={{ x: (lead.agentActive ?? true) ? 24 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                              "absolute top-1 w-4 h-4 rounded-full shadow-md",
                              (lead.agentActive ?? true) ? "bg-white" : "bg-gray-100"
                            )}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase mt-2">
                          {(lead.agentActive ?? true) ? "IA ACTIVA" : "SOPORTE"}
                        </span>
                      </div>

                      <div className="text-right border-l border-gray-200 pl-6">
                         <div className="text-sm font-bold text-gray-900">{lead.trustScore}%</div>
                         <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Trust Score</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeView === "collaborators" && (
            <motion.div
              key="collaborators"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="text-center mb-16">
                <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
                  Equipo Quantum
                </h1>
                <p className="text-gray-500 font-light text-lg">
                  Conexiones activas y escalamiento.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-3xl backdrop-blur-xl bg-white/70 border border-white/90 p-8",
                    "shadow-[inset_2px_2px_8px_rgba(255,255,255,0.6),inset_-2px_-2px_8px_rgba(0,0,0,0.05)] shadow-sm"
                  )}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                           <Wifi className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Mi Agente</span>
                            <div className="text-xl font-semibold text-gray-900">{teamPhones.agent}</div>
                         </div>
                      </div>
                      <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg border border-green-100">ONLINE</div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <p className="text-xs font-light text-gray-500 italic">
                      Número principal procesando mensajes.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "rounded-3xl backdrop-blur-xl bg-white/70 border border-white/90 p-8",
                    "shadow-[inset_2px_2px_8px_rgba(255,255,255,0.6),inset_-2px_-2px_8px_rgba(0,0,0,0.05)] shadow-sm"
                  )}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                           <UserCircle className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Humano Encargado</span>
                            <div className="text-xl font-semibold text-gray-900">{teamPhones.human}</div>
                         </div>
                      </div>
                      <div className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-100">LISTO</div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <p className="text-xs font-light text-gray-500 italic">
                      Receptor de notificaciones y tickets de soporte.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeView === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-2xl mx-auto"
            >
              <div className="text-center mb-16">
                <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
                  Ajustes
                </h1>
                <p className="text-gray-500 font-light text-lg">
                  Parámetros técnicos de la organización.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-sm">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Información General</h4>
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-500">Nicho Operativo</span>
                         <span className="text-sm font-semibold text-gray-900">{niche}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-500">Usuario Activo</span>
                         <span className="text-sm font-semibold text-gray-900">{session?.user?.email}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-sm">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Seguridad y API</h4>
                   <div className="space-y-6">
                      <div className="flex items-center justify-between gap-8">
                         <span className="text-sm text-gray-500">Quantum API Key</span>
                         <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded select-all truncate">sk_quantum_{session?.user?.id?.slice(0, 8)}...</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Lead Modal */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setSelectedLead(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-2xl relative"
              >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900 leading-tight">
                        {selectedLead.name}
                      </h3>
                      <p className="text-sm font-light text-gray-500">
                        {selectedLead.phone ? selectedLead.phone.split('@')[0] : "Sin número"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase shadow-sm border",
                      ["VENTAS", "CONSULTA_PRODUCTO", "PAGO"].includes(selectedLead.intent) && "bg-gray-900 text-white border-gray-900",
                      ["INFO_NEGOCIO", "AGENDAMIENTO"].includes(selectedLead.intent) && "bg-white text-gray-700 border-gray-200",
                      ["SOPORTE", "UNKNOWN", "SALUDO"].includes(selectedLead.intent) && "bg-gray-100 text-gray-800 border-gray-300"
                    )}>
                      {selectedLead.intent}
                    </span>
                    
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Content: Two columns */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gradient-to-br from-white/40 to-gray-50/40">
                  {/* Left Column: Histórico */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Search className="w-3 h-3" /> Resumen Histórico
                    </h4>
                    <div className="bg-white/80 border border-gray-100 rounded-2xl p-6 shadow-sm min-h-[12rem]">
                      <p className="text-gray-600 font-light leading-relaxed italic">
                        "{selectedLead.summary}"
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 flex-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Nivel de Interés / Trust Score</div>
                        <div className="text-2xl font-semibold text-gray-900">{selectedLead.trustScore}%</div>
                      </div>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 flex-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Estado de la IA</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={cn("w-2 h-2 rounded-full", (selectedLead.agentActive ?? true) ? "bg-green-500" : "bg-red-500")} />
                          <span className="text-sm font-medium text-gray-700">
                            {(selectedLead.agentActive ?? true) ? "Atendiendo" : "En Espera (Soporte)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Acciones & Agente */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Settings className="w-3 h-3" /> Acciones Tomadas
                    </h4>
                    
                    <div className="bg-white/80 border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4 min-h-[12rem]">
                      {/* Derivar acciones según el intent/summary de forma básica */}
                      <ul className="space-y-3">
                        {["VENTAS", "CONSULTA_PRODUCTO"].includes(selectedLead.intent) && (
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <ShoppingBag className="w-3 h-3 text-gray-500" />
                            </div>
                            El cliente ha solicitado información sobre productos o catálogo.
                          </li>
                        )}
                        {selectedLead.intent === "AGENDAMIENTO" && (
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Calendar className="w-3 h-3 text-blue-500" />
                            </div>
                            El cliente intentó o agendó una cita.
                          </li>
                        )}
                        {selectedLead.intent === "SOPORTE" && (
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <UserCircle className="w-3 h-3 text-rose-500" />
                            </div>
                            El cliente solicitó ayuda, presentó un problema o pidió contactar con un humano.
                          </li>
                        )}
                        {selectedLead.intent === "PAGO" && (
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CheckSquare className="w-3 h-3 text-green-500" />
                            </div>
                            El cliente proporcionó información de pago o comprobantes.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Agent Control Area in Modal */}
                    <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <h5 className="font-semibold text-lg">IA Autónoma</h5>
                          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                            Al desactivar, la IA dejará de responderle automáticamente.
                          </p>
                        </div>
                        <div 
                          className={cn(
                            "relative w-14 h-7 rounded-full transition-all duration-300 cursor-pointer shadow-inner",
                            (selectedLead.agentActive ?? true) ? "bg-green-500" : "bg-white/20"
                          )}
                          onClick={(e) => handleToggleAgent(e, selectedLead)}
                        >
                          <motion.div
                            animate={{ x: (selectedLead.agentActive ?? true) ? 28 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default LiquidGlassDashboard;