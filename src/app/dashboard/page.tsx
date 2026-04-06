"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, Zap, Calendar, ScanLine, ShoppingCart, 
  MessageSquare, Settings, Activity, Smartphone, 
  Wifi, HelpCircle, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// MOCK DATA PARA WHATSAPP INSTANCES (EVOLUTION API)
const MOCK_INSTANCES = [
  { id: "inst_1", name: "WhatsApp Ventas", status: "CONNECTED", phone: "+593 999 123 456", quality: "EXCELLENT", messages: 1245 },
  { id: "inst_2", name: "Soporte Técnico", status: "DISCONNECTED", phone: "+593 999 654 321", quality: "OFFLINE", messages: 0 },
];

const NODE_ICONS = {
  ocr: ScanLine,
  voice: MessageSquare,
  orders: ShoppingCart,
  calendar: Calendar,
  retail: Settings,
};

// Definimos la estructura base de los nodos
const ALL_NODES = [
  { id: "ocr", name: "[PENTAGONAL_OCR]", desc: "Escudo OCR para validar transferencias bancarias en PDF e Imágenes.", type: "CORE", icon: "ocr", color: "#00FFFF" },
  { id: "voice", name: "[VOICE_DECODER]", desc: "Recepción de audios y transmisión de intenciones por voz.", type: "CORE", icon: "voice", color: "#FF00FF" },
  { id: "orders", name: "[CORE_ORDER]", desc: "Compilador automático de comandas y carritos de compras.", type: "NICHO", icon: "orders", color: "#00FF88" },
  { id: "calendar", name: "[NEXUS_CALENDAR]", desc: "Sincronización bidireccional con Google Calendar.", type: "NICHO", icon: "calendar", color: "#FFAA00" },
  { id: "retail", name: "[RETAIL_QUERY]", desc: "Búsqueda semántica inteligente en inventario de productos.", type: "NICHO", icon: "retail", color: "#0088FF" },
];

export default function DashboardModular() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirección si no está logueado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Estado para las dos zonas
  const [activeNodes, setActiveNodes] = useState(ALL_NODES.slice(0, 2)); 
  const [inventoryNodes, setInventoryNodes] = useState(ALL_NODES.slice(2)); 
  const [isDraggingOver, setIsDraggingOver] = useState<"ACTIVE" | "INVENTORY" | null>(null);

  // --- LÓGICA DE DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, nodeId: string, source: "ACTIVE" | "INVENTORY") => {
    e.dataTransfer.setData("nodeId", nodeId);
    e.dataTransfer.setData("source", source);
  };

  const handleDragOver = (e: React.DragEvent, zone: "ACTIVE" | "INVENTORY") => {
    e.preventDefault();
    setIsDraggingOver(zone);
  };

  const handleDrop = (e: React.DragEvent, targetZone: "ACTIVE" | "INVENTORY") => {
    e.preventDefault();
    setIsDraggingOver(null);
    
    const nodeId = e.dataTransfer.getData("nodeId");
    const sourceZone = e.dataTransfer.getData("source");

    if (sourceZone === targetZone) return;

    const nodeToMove = ALL_NODES.find(n => n.id === nodeId);
    if (!nodeToMove) return;

    if (targetZone === "ACTIVE") {
      setInventoryNodes(prev => prev.filter(n => n.id !== nodeId));
      setActiveNodes(prev => [...prev, nodeToMove]);
    } else {
      setActiveNodes(prev => prev.filter(n => n.id !== nodeId));
      setInventoryNodes(prev => [...prev, nodeToMove]);
    }
  };

  // Render Component de Nodo
  const NodeCard = ({ node, source }: { node: typeof ALL_NODES[0], source: "ACTIVE" | "INVENTORY" }) => {
    const Icon = NODE_ICONS[node.icon as keyof typeof NODE_ICONS] || Cpu;
    const isActive = source === "ACTIVE";

    return (
      <motion.div
        layout
        layoutId={node.id}
        draggable
        onDragStart={(e: any) => handleDragStart(e, node.id, source)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`p-5 rounded-xl border backdrop-blur-md cursor-grab active:cursor-grabbing transition-all relative flex flex-col gap-3 group ${
          isActive 
            ? 'border-[#00FFFF]/50 bg-[#00FFFF]/5 shadow-[0_0_20px_rgba(0,255,255,0.15)]' 
            : 'border-[#1A1A1A] bg-[#0D0D0D]/80 hover:border-[#333] hover:bg-[#111]'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'bg-[#1A1A1A] text-[#666]'}`}>
            <Icon size={16} />
          </div>
          <span className={`text-[9px] tracking-widest border px-2 py-0.5 rounded-full ${isActive ? 'border-[#00FFFF]/50 text-[#00FFFF]' : 'border-[#333] text-[#666]'}`}>
            {node.type}
          </span>
        </div>
        
        <div>
          <h3 className={`text-sm font-bold font-mono tracking-tight ${isActive ? 'text-white' : 'text-[#888] group-hover:text-[#aaa]'}`}>{node.name}</h3>
          <p className="text-[10px] text-[#666] font-mono leading-relaxed mt-1">{node.desc}</p>
        </div>
        
        {isActive && (
          <div className="absolute top-0 right-0 w-full h-full pointer-events-none rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-[50%] h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF] to-transparent animate-shimmer" />
          </div>
        )}
      </motion.div>
    );
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#00FFFF] font-mono animate-pulse">Iniciando Terminal...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex overflow-hidden selection:bg-[#00FFFF] selection:text-black font-sans">
      {/* BACKGROUND SCANLINES */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)" }} />
      <div className="pointer-events-none fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#00FFFF]/5 to-transparent z-0" />

      {/* DASHBOARD SIDEBAR (Left) */}
      <aside className="w-16 md:w-64 border-r border-[#1A1A1A] bg-[#0A0A0A]/90 backdrop-blur-xl z-20 flex flex-col justify-between hidden sm:flex">
        <div className="p-4 md:p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-[#333] flex items-center justify-center">
              <Zap size={16} className="text-[#00FFFF]" />
            </div>
            <span className="hidden md:block font-bold text-sm tracking-widest uppercase">Quantum OS</span>
          </Link>
          
          <nav className="mt-12 flex flex-col gap-2">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#00FFFF]/10 border border-[#00FFFF]/20 text-[#00FFFF] transition-all w-full text-left">
              <Activity size={18} />
              <span className="hidden md:block text-xs font-mono tracking-wider">PANEL ACTIVO</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent text-[#666] hover:bg-[#1A1A1A] hover:text-[#bbb] transition-all w-full text-left">
              <Smartphone size={18} />
              <span className="hidden md:block text-xs font-mono tracking-wider">INSTANCIAS</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent text-[#666] hover:bg-[#1A1A1A] hover:text-[#bbb] transition-all w-full text-left">
              <Settings size={18} />
              <span className="hidden md:block text-xs font-mono tracking-wider">CONFIGURACIÓN</span>
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-6 border-t border-[#1A1A1A] flex items-center gap-3 mt-auto">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00FFFF] to-blue-500 flex items-center justify-center text-black font-bold text-xs">
            {session?.user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold text-white truncate max-w-[120px]">{session?.user?.email}</span>
            <span className="text-[10px] text-[#666] font-mono">Plan Pro</span>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 relative z-10 flex flex-col h-screen overflow-hidden">
        
        {/* TOP BAR: WhatsApp Mock Instances */}
        <header className="border-b border-[#1A1A1A] bg-[#0A0A0A]/50 backdrop-blur-md p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              Monitoreo de Sistema
              <span className="px-2 py-0.5 rounded-full bg-[#00FFFF]/10 border border-[#00FFFF]/30 text-[#00FFFF] text-[10px] uppercase tracking-widest font-mono">ONLINE</span>
            </h1>
            <p className="text-xs text-[#666] mt-1 font-mono">Monitoreando conexiones Evolution API activas.</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 xl:pb-0 custom-scrollbar">
            {MOCK_INSTANCES.map((inst) => (
              <div key={inst.id} className="min-w-[200px] border border-[#1A1A1A] bg-[#111] p-3 rounded-xl flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inst.status === 'CONNECTED' ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-[#FF3333]/10 text-[#FF3333]'}`}>
                  {inst.status === 'CONNECTED' ? <Wifi size={18} /> : <ShieldAlert size={18} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">{inst.name}</h4>
                  <span className="text-[10px] text-[#666] font-mono">{inst.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col xl:flex-row gap-6 overflow-y-auto overflow-x-hidden min-h-0">
          
          {/* INVENTARIO IZQUIERDO */}
          <aside 
            className={`w-full xl:w-80 flex flex-col relative rounded-2xl border transition-all duration-300 p-5 ${
              isDraggingOver === "INVENTORY" 
                ? 'border-[#333] bg-[#0A0A0A] shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]' 
                : 'border-[#1A1A1A] bg-[#0A0A0A]'
            }`}
            onDragOver={(e) => handleDragOver(e, "INVENTORY")}
            onDragLeave={() => setIsDraggingOver(null)}
            onDrop={(e) => handleDrop(e, "INVENTORY")}
          >
            <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-3 mb-4 shrink-0">
              <span className="text-[10px] text-[#666] tracking-[0.2em] font-mono uppercase font-semibold">
                Repositorio Nodos
              </span>
              <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-[#666] text-[10px] flex items-center justify-center font-mono">
                {inventoryNodes.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <AnimatePresence>
                {inventoryNodes.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center border border-dashed border-[#222] rounded-xl text-[10px] text-[#444] tracking-widest font-mono text-center p-6"
                  >
                    TODOS LOS NODOS<br/>INYECTADOS
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {inventoryNodes.map(node => <NodeCard key={node.id} node={node} source="INVENTORY" />)}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </aside>

          {/* ÁREA ACTIVA (NUCLEO) */}
          <section 
            className={`flex-1 relative flex flex-col rounded-2xl border transition-all duration-300 p-5 xl:p-8 ${
              isDraggingOver === "ACTIVE" 
                ? 'border-[#00FFFF] bg-[#00FFFF]/5 shadow-[inset_0_0_100px_rgba(0,255,255,0.05)]' 
                : 'border-[#1A1A1A] bg-[#0A0A0A]'
            }`}
            onDragOver={(e) => handleDragOver(e, "ACTIVE")}
            onDragLeave={() => setIsDraggingOver(null)}
            onDrop={(e) => handleDrop(e, "ACTIVE")}
          >
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-[#1A1A1A] pb-4 mb-6 shrink-0 gap-4">
              <div>
                <h2 className="text-2xl font-bold font-mono text-white tracking-tight uppercase">Placa_Activa</h2>
                <p className="text-[10px] text-[#00FFFF] tracking-widest uppercase mt-2 flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse shadow-[0_0_10px_#00FFFF]" /> 
                  Arrastra Nodos para inyectar capacidades
                </p>
              </div>
              <button className="px-6 py-2.5 bg-[#1A1A1A] border border-[#333] hover:border-[#00FFFF] text-white hover:text-[#00FFFF] rounded-lg font-mono text-[10px] tracking-[0.2em] font-bold transition-all shadow-sm">
                COMPILAR SISTEMA
              </button>
            </header>

            {/* ZONA DE DROP ACTIVA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6 auto-rows-max">
                <AnimatePresence>
                  {activeNodes.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="col-span-full h-48 border-2 border-dashed border-[#222] rounded-2xl flex flex-col items-center justify-center text-[#444] font-mono text-xs tracking-widest uppercase gap-3 bg-[#111]/50"
                    >
                      <Cpu size={24} className="opacity-20" />
                      <div className="flex flex-col items-center">
                        <span>NÚCLEO EN REPOSO</span>
                        <span className="text-[9px] mt-1 opacity-60 text-center px-4">Esperando inserción de módulos cognitivos para iniciar la secuencia</span>
                      </div>
                    </motion.div>
                  ) : (
                    activeNodes.map(node => <NodeCard key={node.id} node={node} source="ACTIVE" />)
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* LOG INFERIOR */}
            <div className="mt-4 pt-4 border-t border-[#1A1A1A] font-mono text-[9px] text-[#444] flex flex-col sm:flex-row justify-between uppercase shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#333]" />
                CAPACIDAD LÓGICA EN USO: {Math.min(activeNodes.length * 20, 100)}%
              </div>
              <div className="flex items-center gap-2 text-[#00FFFF]/70">
                <HelpCircle size={10} />
                <span>[ {activeNodes.length} NODOS ] SINCRONIZADOS SEGUROS</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      {/* SHIMMER ANIMATION STYLE */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}} />
    </div>
  );
}