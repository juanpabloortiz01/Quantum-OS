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
import { getDashboardLayout, saveActiveSkills, getCalendarConnectionStatus, getLeads, toggleAgent, saveLoyaltyRule, getReservas, saveReservationsConfig, updateReservationStatus, deleteReservation } from "./action";

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
  { id: "loyalty", name: "Promociones", description: "Configura ofertas especiales y recompensas para tus clientes.", icon: Heart, niches: ["VENTAS"] },
  { id: "reservations", name: "Reservaciones", description: "Gestiona las reservaciones de mesas de forma automatizada y con aprobación manual.", icon: Calendar, niches: ["VENTAS", "GASTRONOMY", "AGENDA"] },
];

const getEcuadorHour = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const hourStr = d.toLocaleTimeString("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    hour12: false
  });
  return parseInt(hourStr);
};

const getEcuadorDateString = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Guayaquil"
  });
};

const getDaysInMonthGrid = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }
  
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }
  
  return cells;
};

const DashboardContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeView, setActiveView] = React.useState<"modules" | "leads" | "collaborators" | "config" | "reservations">("modules");
  const [niche, setNiche] = React.useState<string>("AGENDA");
  const [modules, setModules] = React.useState<GlassModule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [showCalendarAlert, setShowCalendarAlert] = React.useState(false);
  const [teamPhones, setTeamPhones] = React.useState({ agent: "", human: "" });

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // States for loyalty/promotions configuration
  const [showLoyaltyModal, setShowLoyaltyModal] = React.useState(false);
  const [loyaltyForm, setLoyaltyForm] = React.useState({
    triggerCount: "5",
    triggerProduct: "Hamburguesa",
    rewardCount: "1",
    rewardProduct: "Gaseosa"
  });

  // States for reservations configuration
  const [showReservationsModal, setShowReservationsModal] = React.useState(false);
  const [reservationsForm, setReservationsForm] = React.useState({
    limite_grupo_autonomo: 6,
    tope_personas_por_hora: 25
  });
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date(2026, 5, 1)); // Junio 2026
  const [calendarViewMode, setCalendarViewMode] = React.useState<"month" | "day">("month");
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<Date>(new Date(2026, 5, 4)); // 4 de Junio 2026
  const [activeReservationForAlternative, setActiveReservationForAlternative] = React.useState<string | null>(null);

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
          setShowCalendarAlert(true);
          setTimeout(() => setShowCalendarAlert(false), 4000);
          router.replace("/dashboard", { scroll: false });
        } else {
          setModules(availableModules);
        }

        if (layout.loyaltyRule) {
          setLoyaltyForm({
            triggerCount: layout.loyaltyRule.triggerCount || "5",
            triggerProduct: layout.loyaltyRule.triggerProduct || "Hamburguesa",
            rewardCount: layout.loyaltyRule.rewardCount || "1",
            rewardProduct: layout.loyaltyRule.rewardProduct || "Gaseosa"
          });
        }

        if ((layout as any).reservationsConfig) {
          setReservationsForm({
            limite_grupo_autonomo: (layout as any).reservationsConfig.limite_grupo_autonomo ?? 6,
            tope_personas_por_hora: (layout as any).reservationsConfig.tope_personas_por_hora ?? 25
          });
        }

        const fetchedRes = await getReservas();
        setReservations(fetchedRes);
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
      } else if (!module?.enabled && googleConnected) {
        setShowCalendarAlert(true);
        setTimeout(() => setShowCalendarAlert(false), 4000);
      }
    }

    if (id === "loyalty") {
      const module = modules.find(m => m.id === "loyalty");
      if (!module?.enabled) {
        setShowLoyaltyModal(true);
      }
    }

    if (id === "reservations") {
      const module = modules.find(m => m.id === "reservations");
      if (!module?.enabled) {
        setShowReservationsModal(true);
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

  const fetchAndSetReservations = async () => {
    const fetchedRes = await getReservas();
    setReservations(fetchedRes);
  };

  const handleProposeAlternative = async (reservaId: string, originalDateStr: string, hoursToAdd: number) => {
    const originalDate = new Date(originalDateStr);
    const altDate = new Date(originalDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    const res = await updateReservationStatus(reservaId, "reagendado", altDate.toISOString());
    if (res.success) {
      await fetchAndSetReservations();
      setActiveReservationForAlternative(null);
    } else {
      alert(res.error || "Error al proponer alternativa");
    }
  };

  React.useEffect(() => {
    if (status !== "authenticated") return;

    // Poll reservations every 10 seconds to keep the local view updated in real-time
    const interval = setInterval(async () => {
      await fetchAndSetReservations();
    }, 10000);

    return () => clearInterval(interval);
  }, [status]);

  const menuItems = [
    { icon: CheckSquare, view: "modules" as const, label: "AGENTE" },
    { icon: Calendar, view: "reservations" as const, label: "RESERVACIONES" },
    { icon: Search, view: "leads" as const, label: "CLIENTES" },
    { icon: Users, view: "collaborators" as const, label: "EQUIPO" },
    { icon: Settings, view: "config" as const, label: "AJUSTES" },
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
                  AGENTE
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
                      

                      
                      {module.id === "calendar" && module.enabled && googleConnected && showCalendarAlert && (
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

                      {module.id === "loyalty" && module.enabled && (
                        <button
                          onClick={() => setShowLoyaltyModal(true)}
                          className="mt-4 text-xs font-semibold text-gray-900 hover:text-gray-700 underline transition-colors block text-left"
                        >
                          Configurar Promoción
                        </button>
                      )}

                      {module.id === "reservations" && module.enabled && (
                        <button
                          onClick={() => setShowReservationsModal(true)}
                          className="mt-4 text-xs font-semibold text-gray-900 hover:text-gray-700 underline transition-colors block text-left"
                        >
                          Configurar Reservaciones
                        </button>
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

          {activeView === "reservations" && (
            <motion.div
              key="reservations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 max-w-6xl mx-auto"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-4xl font-semibold text-gray-900 tracking-tight uppercase italic">
                    Reservaciones
                  </h1>
                  <p className="text-gray-500 font-light mt-1">
                    Gestiona las reservaciones de mesas y optimiza el flujo en tiempo real.
                  </p>
                </div>

                {/* Calendar View Selectors & Nav */}
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button
                    onClick={() => {
                      const today = new Date(2026, 5, 4);
                      setCalendarMonth(new Date(2026, 5, 1));
                      setSelectedCalendarDay(today);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Hoy
                  </button>

                  <div className="flex items-center border border-gray-200 rounded-xl bg-white p-1 shadow-sm">
                    <button
                      onClick={() => {
                        if (calendarViewMode === "month") {
                          setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                        } else {
                          setSelectedCalendarDay(new Date(selectedCalendarDay.getTime() - 24 * 60 * 60 * 1000));
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      &lt;
                    </button>
                    <span className="px-3 text-sm font-medium text-gray-700 min-w-[100px] text-center">
                      {calendarViewMode === "month"
                        ? calendarMonth.toLocaleDateString("es-EC", { month: "long", year: "numeric" })
                        : selectedCalendarDay.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => {
                        if (calendarViewMode === "month") {
                          setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                        } else {
                          setSelectedCalendarDay(new Date(selectedCalendarDay.getTime() + 24 * 60 * 60 * 1000));
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="flex border border-gray-200 rounded-xl bg-white p-1 shadow-sm">
                    <button
                      onClick={() => setCalendarViewMode("month")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                        calendarViewMode === "month" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Mes
                    </button>
                    <button
                      onClick={() => setCalendarViewMode("day")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                        calendarViewMode === "day" ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Día
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly View Grid */}
              {calendarViewMode === "month" && (
                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((dayName) => (
                      <div key={dayName} className="text-center text-xs font-bold text-gray-400 py-2">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {getDaysInMonthGrid(calendarMonth).map((cell, idx) => {
                      const cellY = cell.date.getFullYear();
                      const cellM = String(cell.date.getMonth() + 1).padStart(2, "0");
                      const cellD = String(cell.date.getDate()).padStart(2, "0");
                      const cellDateStr = `${cellY}-${cellM}-${cellD}`;

                      const dayRes = reservations.filter((r) => {
                        const rDateStr = getEcuadorDateString(r.fecha_hora_deseada);
                        return rDateStr === cellDateStr;
                      });

                      const selectedY = selectedCalendarDay.getFullYear();
                      const selectedM = String(selectedCalendarDay.getMonth() + 1).padStart(2, "0");
                      const selectedD = String(selectedCalendarDay.getDate()).padStart(2, "0");
                      const selectedDateStr = `${selectedY}-${selectedM}-${selectedD}`;

                      const isSelected = selectedDateStr === cellDateStr;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedCalendarDay(cell.date);
                            setCalendarViewMode("day");
                          }}
                          className={cn(
                            "min-h-[6rem] p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300",
                            cell.isCurrentMonth ? "bg-white/50 border-gray-100 hover:border-gray-300" : "bg-gray-50/20 border-transparent text-gray-400",
                            isSelected && "border-gray-900 bg-gray-50/50 shadow-sm"
                          )}
                        >
                          <span className={cn(
                            "text-sm font-semibold",
                            isSelected && "text-gray-900 underline decoration-2 decoration-gray-900"
                          )}>
                            {cell.date.getDate()}
                          </span>

                          {dayRes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {dayRes.length} {dayRes.length === 1 ? "reserva" : "reservas"}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily View Timeline */}
              {calendarViewMode === "day" && (
                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Horario de Reserva: {selectedCalendarDay.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}
                    </h2>
                    <button
                      onClick={() => setCalendarViewMode("month")}
                      className="text-xs font-semibold text-gray-900 hover:text-gray-700 underline transition-colors"
                    >
                      Volver a Vista Mensual
                    </button>
                  </div>

                  <div className="relative border-l border-gray-200 pl-4 space-y-4">
                    {/* Live indicator line if today */}
                    {(() => {
                      const selectedY = selectedCalendarDay.getFullYear();
                      const selectedM = String(selectedCalendarDay.getMonth() + 1).padStart(2, "0");
                      const selectedD = String(selectedCalendarDay.getDate()).padStart(2, "0");
                      const targetDateStr = `${selectedY}-${selectedM}-${selectedD}`;

                      const nowEcuadorStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
                      const isSelectedToday = targetDateStr === nowEcuadorStr;
                      if (!isSelectedToday) return null;
                      
                      const nowEcuadorTime = new Date().toLocaleTimeString("en-US", {
                        timeZone: "America/Guayaquil",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                      });
                      const [hourStr, minStr] = nowEcuadorTime.split(":");
                      const hour = parseInt(hourStr);
                      const min = parseInt(minStr);
                      if (hour < 8 || hour > 22) return null;
                      
                      const hourIndex = hour - 8;
                      const topOffset = 80 * hourIndex + (80 * min / 60) + 12; // approximate height of row is 5rem (80px)
                      return (
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                          style={{ top: `${topOffset}px` }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5 -top-1" />
                        </div>
                      );
                    })()}

                    {/* Hour Rows */}
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour) => {
                      const selectedY = selectedCalendarDay.getFullYear();
                      const selectedM = String(selectedCalendarDay.getMonth() + 1).padStart(2, "0");
                      const selectedD = String(selectedCalendarDay.getDate()).padStart(2, "0");
                      const targetDateStr = `${selectedY}-${selectedM}-${selectedD}`;

                      const hourRes = reservations.filter((r) => {
                        const rDateStr = getEcuadorDateString(r.fecha_hora_deseada);
                        const rHour = getEcuadorHour(r.fecha_hora_deseada);
                        return rDateStr === targetDateStr && rHour === hour;
                      });

                      const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`;

                      return (
                        <div key={hour} className="flex gap-4 min-h-[5rem] group">
                          {/* Hour Label */}
                          <div className="w-16 flex-shrink-0 text-right text-xs font-bold text-gray-400 pt-1">
                            {displayHour}
                          </div>

                          {/* Reservation Cards in Row */}
                          <div className="flex-1 bg-white/30 border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
                            {hourRes.length === 0 ? (
                              <span className="text-xs font-light text-gray-400 italic">Disponible</span>
                            ) : (
                              hourRes.map((res) => (
                                <div
                                  key={res.id}
                                  className={cn(
                                    "p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 flex-1 min-w-[280px] shadow-sm",
                                    res.estado === "confirmado" && "bg-emerald-50/50 border-emerald-100 text-emerald-950",
                                    res.estado === "pendiente_aprobacion" && "bg-amber-50/50 border-amber-200 text-amber-950 animate-pulse-subtle",
                                    res.estado === "reagendado" && "bg-purple-50/50 border-purple-200 text-purple-950",
                                    res.estado === "cancelado" && "bg-rose-50/50 border-rose-100 text-rose-950 opacity-60"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="font-semibold text-sm">
                                        {res.cliente_nombre}
                                      </span>
                                      <span className="text-xs font-light opacity-80">
                                        ({res.cliente_id})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                      <span className="inline-flex items-center gap-1 opacity-90">
                                        <Users className="w-3.5 h-3.5" />
                                        {res.cantidad_personas} {res.cantidad_personas === 1 ? "persona" : "personas"}
                                      </span>
                                      <span className="opacity-90">
                                        Hora: {new Date(res.fecha_hora_deseada).toLocaleTimeString("es-EC", {
                                          timeZone: "America/Guayaquil",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false
                                        })}
                                      </span>
                                      {res.estado === "reagendado" && res.propuesta_alternativa && (
                                        <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                                          Propuesta: {new Date(res.propuesta_alternativa).toLocaleTimeString("es-EC", {
                                            timeZone: "America/Guayaquil",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false
                                          })}
                                        </span>
                                      )}
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                        res.estado === "confirmado" && "bg-emerald-100 text-emerald-800",
                                        res.estado === "pendiente_aprobacion" && "bg-amber-100 text-amber-800",
                                        res.estado === "reagendado" && "bg-purple-100 text-purple-800",
                                        res.estado === "cancelado" && "bg-rose-100 text-rose-800"
                                      )}>
                                        {res.estado === "pendiente_aprobacion" ? "Pendiente" : res.estado}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actions and Delete Button */}
                                  <div className="flex items-center gap-2 self-end md:self-auto relative">
                                    {res.estado === "pendiente_aprobacion" && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            const updateRes = await updateReservationStatus(res.id, "confirmado");
                                            if (updateRes.success) {
                                              await fetchAndSetReservations();
                                            } else {
                                              alert(updateRes.error || "Error al aceptar");
                                            }
                                          }}
                                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                                        >
                                          Aceptar Mesa
                                        </button>
                                        
                                        <button
                                          onClick={() => {
                                            setActiveReservationForAlternative(
                                              activeReservationForAlternative === res.id ? null : res.id
                                            );
                                          }}
                                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm"
                                        >
                                          Proponer Alternativa
                                        </button>

                                        {/* Dropdown for alternative times */}
                                        {activeReservationForAlternative === res.id && (
                                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 space-y-1">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase p-2 border-b border-gray-50 mb-1">Horas más tarde:</div>
                                            {[1, 1.5, 2, 2.5].map((hours) => (
                                              <button
                                                key={hours}
                                                onClick={() => handleProposeAlternative(res.id, res.fecha_hora_deseada, hours)}
                                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                              >
                                                {hours === 1 ? "+1 hora" : `+${hours} horas`}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )}

                                    <button
                                      onClick={async () => {
                                        if (confirm("¿Estás seguro de que deseas eliminar esta reservación?")) {
                                          const deleteRes = await deleteReservation(res.id);
                                          if (deleteRes.success) {
                                            await fetchAndSetReservations();
                                          } else {
                                            alert(deleteRes.error || "Error al eliminar");
                                          }
                                        }
                                      }}
                                      className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors shadow-sm"
                                      title="Eliminar reservación"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <h1 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight uppercase italic">
                  CLIENTES
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
                <h1 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight uppercase italic">
                  EQUIPO
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
                <h1 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight uppercase italic">
                  AJUSTES
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

        {/* Promotions Configuration Modal */}
        <AnimatePresence>
          {showLoyaltyModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowLoyaltyModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-2xl p-8 space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Configurar Promociones
                  </h3>
                  <p className="text-sm font-light text-gray-500 mt-1.5 leading-relaxed">
                    Define la regla que tu agente de IA utilizará para ofrecer promociones y fidelizar a tus clientes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Condición de compra</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={loyaltyForm.triggerCount}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, triggerCount: e.target.value })}
                          placeholder="Ej: 5"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-400 block mb-1">Producto</label>
                        <input
                          type="text"
                          value={loyaltyForm.triggerProduct}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, triggerProduct: e.target.value })}
                          placeholder="Ej: Hamburguesa"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Recompensa gratis</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={loyaltyForm.rewardCount}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, rewardCount: e.target.value })}
                          placeholder="Ej: 1"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-400 block mb-1">Producto Gratis</label>
                        <input
                          type="text"
                          value={loyaltyForm.rewardProduct}
                          onChange={(e) => setLoyaltyForm({ ...loyaltyForm, rewardProduct: e.target.value })}
                          placeholder="Ej: Gaseosa"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowLoyaltyModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      const res = await saveLoyaltyRule(loyaltyForm);
                      if (res.success) {
                        setShowLoyaltyModal(false);
                      } else {
                        alert(res.error || "Error al guardar");
                      }
                    }}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reservations Configuration Modal */}
        <AnimatePresence>
          {showReservationsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowReservationsModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-2xl p-8 space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    Configurar Reservaciones
                  </h3>
                  <p className="text-sm font-light text-gray-500 mt-1.5 leading-relaxed">
                    Define las reglas para controlar el tráfico de clientes en tu negocio.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Grupo Máximo</label>
                    <input
                      type="number"
                      value={reservationsForm.limite_grupo_autonomo}
                      onChange={(e) => setReservationsForm({ ...reservationsForm, limite_grupo_autonomo: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                    />
                    <p className="text-[11px] font-light text-gray-500 leading-normal">
                      Cualquier reserva mayor a este número de personas pasará a tu aprobación en Whatsapp antes de confirmarse.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Tope de Personas por Hora</label>
                    <input
                      type="number"
                      value={reservationsForm.tope_personas_por_hora}
                      onChange={(e) => setReservationsForm({ ...reservationsForm, tope_personas_por_hora: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                    />
                    <p className="text-[11px] font-light text-gray-500 leading-normal">
                      Cuántas personas con reserva puede soportar tu negocio cada hora, tomando en cuenta el flujo de clientes sin reserva.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowReservationsModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      const res = await saveReservationsConfig(reservationsForm);
                      if (res.success) {
                        setShowReservationsModal(false);
                      } else {
                        alert(res.error || "Error al guardar");
                      }
                    }}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default function LiquidGlassDashboard() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm font-light text-gray-500 italic">Cargando dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </React.Suspense>
  );
}