"use client";
import { useState, useEffect, useRef, Suspense } from "react";


import { motion, AnimatePresence } from "motion/react";
import {
  ScanLine, MessageSquare, ShoppingCart, Calendar, Settings,
  Wifi, WifiOff, Activity, Smartphone, LogOut, ChevronRight,
  GripVertical, Inbox, Zap, BarChart3, HelpCircle, User, ArrowLeft
} from "lucide-react";

import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { saveSchedulingConfig, getCalendarConnectionStatus } from "./action";



// ── MOCK WHATSAPP INSTANCES ──────────────────────────────────────────
const MOCK_INSTANCES = [
  { id: "inst_1", name: "WhatsApp Principal", status: "CONNECTED", phone: "+593 999 123 456", messages: 1245 },
  { id: "inst_2", name: "Soporte al Cliente", status: "DISCONNECTED", phone: "+593 999 654 321", messages: 0 },
];

// ── CAPACIDADES DEL AGENTE ───────────────────────────────────────────
const ICON_MAP = {
  calendar: Calendar,
};

const ALL_CAPABILITIES = [
  { 
    id: "calendar", 
    name: "Agendar citas", 
    desc: "Sincroniza tu disponibilidad con Google Calendar y permite que tus clientes agenden por WhatsApp.", 
    icon: "calendar" 
  },
];


// ── NAVEGACIÓN LATERAL ───────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: Activity,   label: "Panel",       active: true  },
  { icon: Smartphone, label: "WhatsApp",    active: false },
  { icon: BarChart3,  label: "Reportes",    active: false },
  { icon: Settings,   label: "Ajustes",     active: false },
];

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#E2E8F0] border-t-[#1A1A1A] animate-spin" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {

    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Drag & drop state
  const [active, setActive] = useState<any[]>([]);
  const [library, setLibrary] = useState(ALL_CAPABILITIES);
  const [dragOver, setDragOver]   = useState<"active" | "library" | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<"active" | "library" | null>(null);
  const [selectedCap, setSelectedCap] = useState<string | null>(searchParams.get("cap") || null);
  
  const [schedConfig, setSchedConfig] = useState({

    simultaneous: 1,
    limitPerDay: 1,
    isGoogleConnected: false, // Debería venir de la DB
  });


  const activeRef = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  const onDragEnd = (info: any, id: string, from: "active" | "library") => {
    setDragOver(null);
    setDraggingFrom(null);
    const activeRect = activeRef.current?.getBoundingClientRect();

    const libraryRect = libraryRef.current?.getBoundingClientRect();
    const point = info.point;

    let to: "active" | "library" | null = null;

    if (activeRect && point.x >= activeRect.left && point.x <= activeRect.right && point.y >= activeRect.top && point.y <= activeRect.bottom) {
      to = "active";
    } else if (libraryRect && point.x >= libraryRect.left && point.x <= libraryRect.right && point.y >= libraryRect.top && point.y <= libraryRect.bottom) {
      to = "library";
    }

    if (!to || from === to) return;

    const cap = ALL_CAPABILITIES.find(c => c.id === id)!;
    if (to === "active") {
      setLibrary(p => p.filter(c => c.id !== id));
      setActive(p => [...p, cap]);
    } else {
      setActive(p => p.filter(c => c.id !== id));
      setLibrary(p => [...p, cap]);
    }
  };


   useEffect(() => {
    async function checkConn() {
      const res = await getCalendarConnectionStatus()
      setSchedConfig(prev => ({ ...prev, isGoogleConnected: res.connected }))
    }
    checkConn()
  }, [])

  const handleSaveConfig = async () => {
    setIsLoading(true)
    const res = await saveSchedulingConfig({
      simultaneous: schedConfig.simultaneous,
      limitPerDay: schedConfig.limitPerDay,
    })
    setIsLoading(false)
    if (res.success) {
      alert("Configuración guardada con éxito")
    } else {
      alert(res.error || "Fallo al guardar")
    }
  }

  const handleGoogleSync = async () => {
    // Pedir permisos específicos de calendario
    await signIn("google", {
      authorizationParams: {
        scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        access_type: "offline",
        prompt: "consent",
      },
      callbackUrl: "/dashboard?cap=calendar", // Volver aquí después
    });
  }

  if (status === "loading" || (isLoading && !selectedCap)) {


    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#E2E8F0] border-t-[#1A1A1A] animate-spin" />
          <span className="text-sm text-[#6B7280] font-medium">Cargando tu panel…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1A1A1A] flex font-sans selection:bg-slate-200">

      {/* ── SIDEBAR ───────────────────────────────────────────────── */}
      <aside className="hidden sm:flex w-16 md:w-60 flex-col border-r border-[#E2E8F0] bg-white shrink-0">
        {/* Logo */}
        <div className="px-4 md:px-6 h-14 flex items-center border-b border-[#E2E8F0] shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-[#1A1A1A] flex items-center justify-center shrink-0">
              <Zap size={12} className="text-white" />
            </span>
            <span className="hidden md:block text-sm font-semibold text-[#1A1A1A] tracking-tight">Quantum OS</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left text-sm font-medium ${
                  item.active
                    ? "bg-[#F3F4F6] text-[#1A1A1A]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-all group cursor-pointer"
               onClick={() => signOut({ callbackUrl: "/" })}>
            <div className="w-7 h-7 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
              <User size={14} className="text-[#4B5563]" />
            </div>
            <div className="hidden md:flex flex-col flex-1 min-w-0">
              <span className="text-xs font-medium text-[#1A1A1A] truncate">{session?.user?.email}</span>
              <span className="text-[10px] text-[#9CA3AF]">Plan Gratuito</span>
            </div>
            <LogOut size={14} className="hidden md:block text-[#9CA3AF] group-hover:text-[#1A1A1A] transition-colors shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-[#1A1A1A]">Panel de control</h1>
            <p className="text-xs text-[#9CA3AF]">Gestiona tu agente de ventas</p>
          </div>
          {/* WhatsApp status pills */}
          <div className="flex items-center gap-2">
            {MOCK_INSTANCES.map(inst => (
              <div key={inst.id}
                   className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                     inst.status === "CONNECTED"
                       ? "border-[#D1FAE5] bg-[#F0FDF4] text-[#065F46]"
                       : "border-[#FEE2E2] bg-[#FEF2F2] text-[#991B1B]"
                   }`}>
                {inst.status === "CONNECTED"
                  ? <Wifi size={11} />
                  : <WifiOff size={11} />}
                {inst.name}
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col xl:flex-row gap-6">

          {/* LEFT — WhatsApp connections summary + stats */}
          <div className="w-full xl:w-72 flex flex-col gap-4 shrink-0">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Conversaciones", value: "1,245", sub: "este mes" },
                { label: "Pedidos tomados", value: "84",   sub: "este mes" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{s.value}</p>
                  <p className="text-xs text-[#9CA3AF]">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* WhatsApp connections */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1A1A]">Conexiones de WhatsApp</span>
                <button className="text-[10px] font-medium text-[#6B7280] hover:text-[#1A1A1A] transition-colors flex items-center gap-1">
                  Gestionar <ChevronRight size={10} />
                </button>
              </div>
              {MOCK_INSTANCES.map(inst => (
                <div key={inst.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#F3F4F6] bg-[#FBFBFA]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    inst.status === "CONNECTED" ? "bg-[#F0FDF4]" : "bg-[#FEF2F2]"
                  }`}>
                    {inst.status === "CONNECTED"
                      ? <Wifi size={14} className="text-[#10B981]" />
                      : <WifiOff size={14} className="text-[#EF4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A1A1A] truncate">{inst.name}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{inst.phone}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    inst.status === "CONNECTED"
                      ? "bg-[#D1FAE5] text-[#065F46]"
                      : "bg-[#FEE2E2] text-[#991B1B]"
                  }`}>
                    {inst.status === "CONNECTED" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ))}
              <button className="w-full py-2.5 border border-dashed border-[#E2E8F0] rounded-lg text-xs font-medium text-[#6B7280] hover:border-[#94A3B8] hover:text-[#1A1A1A] hover:bg-[#F9FAFB] transition-all">
                + Conectar WhatsApp
              </button>
            </div>

            {/* Library */}
            <div
              ref={libraryRef}
              className={`relative bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                dragOver === "library" ? "border-[#94A3B8] bg-[#F9FAFB]" : "border-[#E2E8F0]"
              }`}
              style={{ zIndex: draggingFrom === "library" ? 50 : 1 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1A1A]">Capacidades disponibles</span>
                <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{library.length}</span>
              </div>
              <p className="text-[10px] text-[#9CA3AF] -mt-1">Arrastra las que quieras activar →</p>
              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {library.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="py-4 text-center text-xs text-[#D1D5DB] border border-dashed border-[#E2E8F0] rounded-lg"
                    >
                      Todas las capacidades están activas
                    </motion.div>
                  ) : (
                     library.map(cap => (
                      <CapabilityCard
                        key={cap.id}
                        cap={cap}
                        zone="library"
                        onDragEnd={onDragEnd}
                        setDragOver={setDragOver}
                        setDraggingFrom={setDraggingFrom}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT — Active capabilities */}
          <div
            ref={activeRef}
            className={`relative flex-1 bg-white border rounded-xl flex flex-col transition-all ${
              dragOver === "active" ? "border-[#94A3B8]" : "border-[#E2E8F0]"
            }`}
            style={{ zIndex: draggingFrom === "active" ? 50 : 1 }}
          >
            {/* Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#1A1A1A]">Capacidades activas</h2>
                <p className="text-xs text-[#9CA3AF]">Configura el comportamiento de tu agente</p>
              </div>
            </div>

            {/* Active grid */}
            <div className="flex-1 p-5 overflow-y-auto">
              {!selectedCap ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
                  <AnimatePresence>
                    {active.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="col-span-full h-48 border-2 border-dashed border-[#E2E8F0] rounded-xl flex flex-col items-center justify-center gap-2 text-[#9CA3AF]"
                      >
                        <Inbox size={24} className="opacity-40" />
                        <span className="text-sm font-medium">Sin capacidades activas</span>
                        <span className="text-xs">Arrastra desde la lista de la izquierda</span>
                      </motion.div>
                    ) : (
                      active.map(cap => (
                        <CapabilityCard
                          key={cap.id}
                          cap={cap}
                          zone="active"
                          onDragEnd={onDragEnd}
                          setDragOver={setDragOver}
                          setDraggingFrom={setDraggingFrom}
                          onClick={() => setSelectedCap(cap.id)}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="max-w-xl mx-auto py-4">
                  <button 
                    onClick={() => setSelectedCap(null)}
                    className="flex items-center gap-2 text-xs text-[#6B7280] hover:text-[#1A1A1A] mb-6 transition-colors"
                  >
                    <ArrowLeft size={14} /> Volver al listado
                  </button>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center shadow-inner">
                      <Calendar size={24} className="text-[#1A1A1A]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1A1A1A]">Configuración de Agendamiento</h3>
                      <p className="text-sm text-[#9CA3AF]">Define cómo el agente gestionará las citas físicas.</p>
                    </div>
                  </div>

                  <div className="space-y-6 bg-[#FBFBFA] p-6 rounded-2xl border border-[#F3F4F6]">
                    {/* Google Status */}
                    <div className={`p-4 rounded-xl border ${schedConfig.isGoogleConnected ? "border-[#D1FAE5] bg-[#F0FDF4]" : "border-[#E2E8F0] bg-white"} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        {schedConfig.isGoogleConnected ? (
                          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962l3.007 2.332c.708-2.127 2.692-3.714 5.036-3.714z" fill="#EA4335"/></svg>
                          </div>
                        )}
                        <div>
                          <span className={`text-sm font-semibold ${schedConfig.isGoogleConnected ? "text-[#065F46]" : "text-[#1A1A1A]"}`}>
                            {schedConfig.isGoogleConnected ? "Google Calendar Conectado" : "Sincroniza tu calendario"}
                          </span>
                          {!schedConfig.isGoogleConnected && <p className="text-[10px] text-[#9CA3AF]">Requiere vincular tu cuenta para agendar</p>}
                        </div>
                      </div>
                      
                      {schedConfig.isGoogleConnected ? (
                        <span className="text-xs text-[#065F46] opacity-70 italic">Sincronizado</span>
                      ) : (
                        <button 
                          onClick={handleGoogleSync}
                          className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold hover:bg-[#F9FAFB] transition-all shadow-sm"
                        >
                          Vincular Google
                        </button>
                      )}
                    </div>


                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#374151] uppercase tracking-wide">Citas simultáneas</label>
                        <p className="text-[11px] text-[#6B7280] mb-2">¿Cuántas citas pueden atenderse al mismo tiempo en tu clínica?</p>
                        <input 
                          type="number" 
                          value={schedConfig.simultaneous}
                          onChange={(e) => setSchedConfig({...schedConfig, simultaneous: parseInt(e.target.value)})}
                          className="w-full h-11 px-4 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#374151] uppercase tracking-wide">Límite por persona al día</label>
                        <p className="text-[11px] text-[#6B7280] mb-2">Máximo de citas que un mismo cliente puede agendar en un solo día.</p>
                        <input 
                          type="number" 
                          value={schedConfig.limitPerDay}
                          onChange={(e) => setSchedConfig({...schedConfig, limitPerDay: parseInt(e.target.value)})}
                          className="w-full h-11 px-4 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        />
                      </div>

                      <div className="space-y-2 opacity-60">
                        <label className="text-xs font-bold text-[#374151] uppercase tracking-wide">Margen entre citas (Buffer)</label>
                        <p className="text-[11px] text-[#6B7280] mb-2">Tiempo de descanso establecido por defecto.</p>
                        <div className="h-11 px-4 rounded-xl border border-[#E2E8F0] bg-[#F3F4F6] text-sm flex items-center">
                          15 minutos
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveConfig}
                      disabled={isLoading}
                      className="w-full h-12 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-black transition-all shadow-lg shadow-black/10 mt-4 disabled:opacity-50"
                    >
                      {isLoading ? "Guardando..." : "Guardar configuración"}
                    </button>

                  </div>
                </div>
              )}
            </div>

            {/* Footer status */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-sm" />
                <span className="text-[11px] text-[#6B7280] font-medium">
                  {active.length} capacidad{active.length !== 1 ? "es" : ""} activa{active.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button className="flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors">
                <HelpCircle size={12} />
                ¿Cómo funciona?
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// ── CAPABILITY CARD ──────────────────────────────────────────────────
function CapabilityCard({
  cap,
  zone,
  onDragEnd,
  setDragOver,
  setDraggingFrom,
  onClick,
}: {
  cap: typeof ALL_CAPABILITIES[0];
  zone: "active" | "library";
  onDragEnd: (info: any, id: string, from: "active" | "library") => void;
  setDragOver: (zone: "active" | "library" | null) => void;
  setDraggingFrom: (zone: "active" | "library" | null) => void;
  onClick?: () => void;
}) {


  const Icon = ICON_MAP[cap.icon as keyof typeof ICON_MAP];
  const isActive = zone === "active";

  return (
    <motion.div
      layout
      layoutId={cap.id}
      onClick={onClick}
      drag

      dragSnapToOrigin
      dragElastic={0.05}
      onDragStart={() => {
        setDraggingFrom(zone);
        setDragOver(zone === "active" ? "library" : "active");
      }}
      onDragEnd={(_, info) => onDragEnd(info, cap.id, zone)}

      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
      whileDrag={{ 
        scale: 1.05, 
        zIndex: 999,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)"
      }}
      className={`p-4 rounded-xl border cursor-grab active:cursor-grabbing transition-colors select-none ${
        isActive
          ? "border-[#E2E8F0] bg-white shadow-sm hover:border-[#94A3B8] hover:shadow-md"
          : "border-[#F3F4F6] bg-[#FBFBFA] hover:border-[#E2E8F0] hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isActive ? "bg-[#F3F4F6]" : "bg-[#EFEFEF]"
        }`}>
          <Icon size={15} className={isActive ? "text-[#1A1A1A]" : "text-[#9CA3AF]"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${isActive ? "text-[#1A1A1A]" : "text-[#6B7280]"}`}>
            {cap.name}
          </p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-relaxed line-clamp-2">{cap.desc}</p>
        </div>
        <GripVertical size={13} className="text-[#D1D5DB] shrink-0 mt-0.5" />
      </div>
      {isActive && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span className="text-[10px] text-[#10B981] font-medium">Activa</span>
        </div>
      )}
    </motion.div>
  );
}