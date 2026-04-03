export default function Footer() {
  return (
    <footer className="border-t border-[#2E2E2E] bg-transparent py-8 px-6 mt-20 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* IDENTIFICADOR DE SISTEMA */}
        <div className="font-['Fira_Code'] text-[10px] text-[#555555] tracking-widest uppercase">
          QUANTUM_OS · SYS_CORE_v2.4.1 · CONFIDENTIAL
        </div>

        {/* MÉTRICAS Y ESTADO */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4">
            <span className="font-['Fira_Code'] text-[10px] text-[#888888] tracking-widest uppercase">
              Nodes: Online
            </span>
            <span className="font-['Fira_Code'] text-[10px] text-[#888888] tracking-widest uppercase">
              Evo_API: ✓
            </span>
          </div>
          
          <div className="flex items-center gap-2 font-['Fira_Code'] text-[10px] text-[#00FFFF] tracking-widest uppercase">
            <div className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
            KERNEL_ACTIVE
          </div>
        </div>

      </div>
    </footer>
  );
}