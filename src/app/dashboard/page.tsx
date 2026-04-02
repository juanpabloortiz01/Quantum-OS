"use client";
import { useState } from "react";
import { motion } from "framer-motion";

// Definimos la estructura base de los nodos
const ALL_NODES = [
  { id: "ocr", name: "[PENTAGONAL_OCR]", desc: "Escudo OCR para validar transferencias.", type: "CORE" },
  { id: "voice", name: "[VOICE_DECODER]", desc: "Transmisión de intenciones por voz.", type: "CORE" },
  { id: "orders", name: "[CORE_ORDER]", desc: "Compilador automático de comandas.", type: "NICHO" },
  { id: "calendar", name: "[NEXUS_CALENDAR]", desc: "Sincronización con Google Calendar.", type: "NICHO" },
  { id: "retail", name: "[RETAIL_QUERY]", desc: "Búsqueda semántica en inventario.", type: "NICHO" },
];

export default function DashboardModular() {
  // Estado para las dos zonas
  const [activeNodes, setActiveNodes] = useState(ALL_NODES.slice(0, 2)); // Empieza con 2 activos
  const [inventoryNodes, setInventoryNodes] = useState(ALL_NODES.slice(2)); // El resto al inventario
  const [isDraggingOver, setIsDraggingOver] = useState<"ACTIVE" | "INVENTORY" | null>(null);

  // --- LÓGICA DE DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, nodeId: string, source: "ACTIVE" | "INVENTORY") => {
    e.dataTransfer.setData("nodeId", nodeId);
    e.dataTransfer.setData("source", source);
  };

  const handleDragOver = (e: React.DragEvent, zone: "ACTIVE" | "INVENTORY") => {
    e.preventDefault(); // Necesario para permitir el Drop
    setIsDraggingOver(zone);
  };

  const handleDrop = (e: React.DragEvent, targetZone: "ACTIVE" | "INVENTORY") => {
    e.preventDefault();
    setIsDraggingOver(null);
    
    const nodeId = e.dataTransfer.getData("nodeId");
    const sourceZone = e.dataTransfer.getData("source");

    // Si lo suelta en la misma zona de donde salió, no hacemos nada
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

  // Componente de la Tarjeta del Nodo
  const NodeCard = ({ node, source }: { node: any, source: "ACTIVE" | "INVENTORY" }) => (
    <motion.div
      layout
      draggable
      onDragStart={(e: any) => handleDragStart(e, node.id, source)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 border cursor-grab active:cursor-grabbing transition-colors relative flex flex-col gap-2 ${
        source === "ACTIVE" 
          ? 'border-[#00FFFF] bg-[#00FFFF]/10 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
          : 'border-[#333] bg-[#111] hover:border-[#666]'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className={`text-[9px] tracking-widest border px-1.5 py-0.5 ${source === "ACTIVE" ? 'border-[#00FFFF]/50 text-[#00FFFF]' : 'border-[#444] text-[#666]'}`}>
          {node.type}
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-[#444] rounded-full" />
          <div className="w-1 h-1 bg-[#444] rounded-full" />
          <div className="w-1 h-1 bg-[#444] rounded-full" />
        </div>
      </div>
      <h3 className={`text-sm font-bold font-mono ${source === "ACTIVE" ? 'text-white' : 'text-[#888]'}`}>{node.name}</h3>
      <p className="text-[10px] text-[#666] font-mono leading-relaxed">{node.desc}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-4 sm:p-8 flex flex-col md:flex-row gap-8 selection:bg-[#00FFFF] selection:text-black">
      {/* SCANLINES OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)" }} />

      {/* ÁREA IZQUIERDA: INVENTARIO */}
      <aside 
        className={`w-full md:w-80 flex flex-col gap-4 relative z-10 p-4 border transition-colors ${isDraggingOver === "INVENTORY" ? 'border-[#444] bg-[#111]' : 'border-[#1A1A1A] bg-[#0A0A0A]'}`}
        onDragOver={(e) => handleDragOver(e, "INVENTORY")}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, "INVENTORY")}
      >
        <div className="text-[10px] text-[#666] tracking-[0.3em] border-b border-[#1A1A1A] pb-2">
          [ INVENTARIO_DE_NODOS ]
        </div>
        
        {inventoryNodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-[#222] text-[10px] text-[#444] tracking-widest p-8 text-center">
            TODOS LOS NODOS<br/>DESPLEGADOS
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {inventoryNodes.map(node => <NodeCard key={node.id} node={node} source="INVENTORY" />)}
          </div>
        )}
      </aside>

      {/* ÁREA DERECHA: NÚCLEO ACTIVO */}
      <main 
        className={`flex-1 relative z-10 flex flex-col p-6 border transition-all duration-300 ${
          isDraggingOver === "ACTIVE" 
            ? 'border-[#00FFFF] bg-[#00FFFF]/5 shadow-[inset_0_0_50px_rgba(0,255,255,0.05)]' 
            : 'border-[#1A1A1A] bg-[#0A0A0A]'
        }`}
        onDragOver={(e) => handleDragOver(e, "ACTIVE")}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, "ACTIVE")}
      >
        <header className="flex justify-between items-end border-b border-[#1A1A1A] pb-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold font-mono text-white tracking-tight">NÚCLEO_OPERATIVO</h2>
            <p className="text-xs text-[#00FFFF] tracking-widest uppercase mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse" /> ARRASTRA NODOS AQUÍ PARA ACTIVARLOS
            </p>
          </div>
          <button className="px-6 py-3 bg-[#00FFFF] text-black font-mono text-[10px] tracking-[0.2em] font-bold hover:bg-white transition-colors">
            [ COMPILAR_NÚCLEO ]
          </button>
        </header>

        {/* ZONA DE DROP ACTIVA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 content-start">
          {activeNodes.length === 0 ? (
            <div className="col-span-full h-40 border-2 border-dashed border-[#222] flex flex-col items-center justify-center text-[#444] font-mono text-xs tracking-widest uppercase gap-2">
              <span>SISTEMA EN REPOSO</span>
              <span className="text-[9px]">Esperando inyección de módulos...</span>
            </div>
          ) : (
            activeNodes.map(node => <NodeCard key={node.id} node={node} source="ACTIVE" />)
          )}
        </div>

        {/* LOG INFERIOR */}
        <div className="mt-8 pt-4 border-t border-[#1A1A1A] font-mono text-[9px] text-[#444] flex justify-between uppercase">
          <span>CAPACIDAD DE MEMORIA: {activeNodes.length * 20}%</span>
          <span>{activeNodes.length} NODOS ENLAZADOS</span>
        </div>
      </main>
    </div>
  );
}