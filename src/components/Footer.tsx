export default function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white py-10 px-6 relative z-10 w-full transition-colors mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* IDENTIFICADOR DE SISTEMA */}
        <div className="text-xs font-medium text-[#6B7280]">
          © {new Date().getFullYear()} Quantum OS. Todos los derechos reservados.
        </div>

        {/* MÉTRICAS Y ESTADO */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-xs font-medium text-[#94A3B8]">
              Plataforma 2.0
            </span>
            <span className="text-xs font-medium text-[#94A3B8]">
              API: Operativa
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium text-[#10B981]">
            <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Sistemas Activos
          </div>
        </div>

      </div>
    </footer>
  );
}