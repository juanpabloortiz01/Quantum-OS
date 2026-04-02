"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { finalizeOnboarding } from "./action";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", niche: "gastro", context: "" });
  const [isDeploying, setIsDeploying] = useState(false);

  const nextStep = () => setStep(s => s + 1);

  const handleFinalize = async () => {
    setIsDeploying(true);
    const res = await finalizeOnboarding(formData);
    if (res?.error) {
      alert(`[ERROR_DE_SISTEMA]: ${res.error}`);
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center font-mono p-6">
      {/* SCANLINES OVERLAY */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)" }} />
      
      <div className="max-w-md w-full border border-[#1A1A1A] bg-[#0F0F0F] p-8 relative z-10">
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#00FFFF]" />
        
        <header className="mb-8">
          <div className="text-[10px] text-[#444] tracking-[0.3em] mb-2">PROCESO_DE_CONFIGURACIÓN // PASO_0{step}</div>
          <div className="h-1 w-full bg-[#1A1A1A]">
            <motion.div className="h-full bg-[#00FFFF]" animate={{ width: `${(step/3)*100}%` }} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }}>
              <h2 className="text-xl mb-6 italic underline decoration-[#00FFFF]/30">IDENTIDAD_DEL_NODO</h2>
              <input 
                type="text" 
                placeholder="NOMBRE_DEL_NEGOCIO"
                className="w-full bg-[#111] border border-[#222] p-4 text-sm focus:border-[#00FFFF] outline-none mb-4"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <select 
                className="w-full bg-[#111] border border-[#222] p-4 text-sm focus:border-[#00FFFF] outline-none mb-8 text-[#666]"
                onChange={(e) => setFormData({...formData, niche: e.target.value})}
              >
                <option value="gastro">GASTRONOMÍA</option>
                <option value="retail">RETAIL_DROPSHIPPING</option>
                <option value="services">SERVICIOS_CITAS</option>
              </select>
              <button onClick={nextStep} className="w-full py-4 bg-[#00FFFF] text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">[ SIGUIENTE ]</button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }}>
              <h2 className="text-xl mb-6 italic">ENLACE_WHATSAPP</h2>
              <div className="aspect-square bg-[#111] border border-[#222] flex items-center justify-center mb-8 relative">
                <span className="text-[10px] text-[#333] animate-pulse">ESPERANDO_GENERACIÓN_QR...</span>
                {/* Aquí va el componente de QR de EvolutionAPI */}
              </div>
              <button onClick={nextStep} className="w-full py-4 bg-[#00FFFF] text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors">[ VINCULADO_EXITOSAMENTE ]</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl mb-6 italic">INYECCIÓN_DE_MEMORIA</h2>
              <textarea 
                placeholder="PEGA_TU_MENÚ_O_CATÁLOGO_AQUÍ..."
                className="w-full h-40 bg-[#111] border border-[#222] p-4 text-sm focus:border-[#00FFFF] outline-none mb-8 resize-none"
                onChange={(e) => setFormData({...formData, context: e.target.value})}
              />
              <button 
                onClick={handleFinalize} 
                disabled={isDeploying}
                className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-[#00FFFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? "[ DEPLOYING_NODE... ]" : "[ FINALIZAR_DESPLIEGUE ]"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}