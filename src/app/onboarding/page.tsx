"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NICHES = [
  { id: "gastro", label: "GASTRONOMÍA" },
  { id: "retail", label: "REVENTA / E-COMMERCE" },
  { id: "clinic", label: "CLÍNICA / SERVICIOS" }
];

const AVAILABLE_NEEDS = [
  { id: "calendar", label: "AGENDAR_CITAS" },
  { id: "ocr", label: "VALIDAR_TRANSFERENCIAS" },
  { id: "crm", label: "REGISTRO_CLIENTES" },
  { id: "orders", label: "TOMAR_PEDIDOS" },
  { id: "catalog", label: "MANEJO_CATÁLOGO" },
  { id: "shipping", label: "COORDINAR_ENVÍOS" }
];

export default function OnboardingRawTech() {
  const [step, setStep] = useState(0); // 0 = Auth, 1 = Niche/Needs, 2 = Prompt, 3 = QR & Test
  const [formData, setFormData] = useState({
    niche: "",
    needs: [] as string[],
    masterPrompt: "",
    testPhone: ""
  });
  const [isTesting, setIsTesting] = useState(false);

  const toggleNeed = (id: string) => {
    setFormData(prev => ({
      ...prev,
      needs: prev.needs.includes(id) 
        ? prev.needs.filter(n => n !== id) 
        : [...prev.needs, id]
    }));
  };

  const handleTestProtocol = () => {
    setIsTesting(true);
    // Simulación del endpoint de EvoAPI
    setTimeout(() => {
      setIsTesting(false);
      alert("[SISTEMA]: PING_ENVIADO. Revisa tu WhatsApp.");
      window.location.href = "/dashboard"; // Redirección al Búnker
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center font-['Inter'] p-4 sm:p-6 selection:bg-[#00FFFF] selection:text-black">
      {/* SCANLINES OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />
      
      <div className="max-w-2xl w-full border border-[#2E2E2E] bg-[#1A1A1A] p-8 relative z-10 shadow-2xl">
        {/* DECORATIVE CORNERS */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-[#00FFFF]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#2E2E2E]" />
        
        <header className="mb-8 border-b border-[#2E2E2E] pb-4 flex justify-between items-end">
          <div>
            <div className="font-['Fira_Code'] text-[10px] text-[#888888] tracking-[0.14em] uppercase mb-1">QUANTUM_OS // INITIALIZATION</div>
            <h1 className="font-['Fira_Code'] text-xl font-semibold tracking-tight">PROTOCOLO_DE_DESPLIEGUE</h1>
          </div>
          {step > 0 && (
            <div className="font-['Fira_Code'] text-[10px] text-[#00FFFF] tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse" /> PASO_0{step}/03
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {/* PASO 0: AUTH GMAIL */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-12">
              <div className="font-['Fira_Code'] text-xs text-[#555555] mb-8 uppercase tracking-widest">[ REQUIERE_AUTENTICACIÓN_NIVEL_1 ]</div>
              <button 
                onClick={() => setStep(1)}
                className="group border border-[#2E2E2E] bg-[#111111] hover:border-[#00FFFF] px-8 py-4 flex items-center gap-4 transition-all duration-300"
              >
                <svg className="w-5 h-5 text-white group-hover:text-[#00FFFF] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-['Fira_Code'] text-sm tracking-widest text-[#888888] group-hover:text-white transition-colors">INICIAR_CON_GMAIL</span>
              </button>
            </motion.div>
          )}

          {/* PASO 1: NICHO Y NECESIDADES */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }}>
              <div className="mb-6">
                <div className="font-['Fira_Code'] text-[11px] text-[#888] uppercase mb-3">SELECT_NICHE //</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {NICHES.map(niche => (
                    <button
                      key={niche.id}
                      onClick={() => setFormData({...formData, niche: niche.id})}
                      className={`py-3 px-2 border font-['Fira_Code'] text-[10px] tracking-widest transition-all ${formData.niche === niche.id ? 'border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF]' : 'border-[#2E2E2E] bg-[#111] text-[#555] hover:border-[#555]'}`}
                    >
                      {niche.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <div className="font-['Fira_Code'] text-[11px] text-[#888] uppercase mb-3">MODULE_REQUIREMENTS //</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_NEEDS.map(need => (
                    <label key={need.id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${formData.needs.includes(need.id) ? 'border-[#00FFFF]/50 bg-[#00FFFF]/5' : 'border-[#2E2E2E] bg-[#111] hover:bg-[#1A1A1A]'}`}>
                      <div className={`w-3 h-3 border flex items-center justify-center ${formData.needs.includes(need.id) ? 'border-[#00FFFF]' : 'border-[#555]'}`}>
                        {formData.needs.includes(need.id) && <div className="w-1.5 h-1.5 bg-[#00FFFF]" />}
                      </div>
                      <span className={`font-['Fira_Code'] text-[10px] tracking-widest ${formData.needs.includes(need.id) ? 'text-white' : 'text-[#888]'}`}>{need.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!formData.niche} className="w-full py-4 border border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF] font-['Fira_Code'] text-[11px] tracking-[0.2em] uppercase hover:bg-[#00FFFF] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                [ CONFIRMAR_PARÁMETROS ]
              </button>
            </motion.div>
          )}

          {/* PASO 2: MASTER PROMPT */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }}>
              <div className="mb-8">
                <div className="font-['Fira_Code'] text-[11px] text-[#888] uppercase mb-3 flex justify-between items-center">
                  <span>INYECCIÓN_DE_MEMORIA_BASE //</span>
                  <span className="text-[#00FFFF] text-[9px] border border-[#00FFFF]/30 px-2 py-0.5">RAG_READY</span>
                </div>
                <p className="text-[12px] text-[#555] mb-4">Ingresa la información central de tu negocio (Horarios, reglas, tono de voz o catálogo base). El agente consumirá esto como su verdad absoluta.</p>
                <textarea 
                  value={formData.masterPrompt}
                  onChange={(e) => setFormData({...formData, masterPrompt: e.target.value})}
                  placeholder="Ej: Somos 'TechStore Loja'. Atendemos de 9am a 6pm. Solo aceptamos transferencias del Banco Pichincha. Habla de forma directa y amable..."
                  className="w-full h-48 bg-[#111] border border-[#2E2E2E] p-4 text-[13px] text-white font-mono focus:border-[#00FFFF] focus:outline-none focus:ring-1 focus:ring-[#00FFFF]/50 resize-none transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-4 border border-[#2E2E2E] text-[#888] font-['Fira_Code'] text-[11px] tracking-[0.2em] hover:text-white transition-colors">
                  [ VOLVER ]
                </button>
                <button onClick={() => setStep(3)} disabled={formData.masterPrompt.length < 10} className="flex-1 py-4 border border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF] font-['Fira_Code'] text-[11px] tracking-[0.2em] hover:bg-[#00FFFF] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  [ COMPILAR_CEREBRO ]
                </button>
              </div>
            </motion.div>
          )}

          {/* PASO 3: QR & TEST PROTOCOL */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               <div className="flex flex-col md:flex-row gap-8 mb-8">
                 {/* QR SECTION */}
                 <div className="flex-1 border border-[#2E2E2E] bg-[#111] p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF] to-transparent opacity-50" />
                    <div className="font-['Fira_Code'] text-[10px] text-[#00FFFF] tracking-widest mb-4 uppercase animate-pulse">ESPERANDO_ENLACE_EVO_API...</div>
                    <div className="w-40 h-40 border border-[#2E2E2E] bg-[#0D0D0D] p-2">
                      {/* Aquí renderizarás el QR real codificado en Base64 */}
                      <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InRyYW5zcGFyZW50Ii8+PGNpcmNsZSBjeD0iNTAlIiBjeT0iNTAlIiByPSIyIiBmaWxsPSIjNTU1Ii8+PC9zdmc+')] opacity-50" style={{backgroundSize: '8px 8px'}} />
                    </div>
                    <div className="mt-4 font-['Fira_Code'] text-[9px] text-[#555] tracking-widest text-center">Escanea desde Dispositivos Vinculados en tu WhatsApp</div>
                 </div>

                 {/* TEST SECTION (Aha! Moment) */}
                 <div className="flex-1 flex flex-col justify-center">
                    <div className="font-['Fira_Code'] text-[11px] text-[#00FF88] uppercase mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      INSTANCIA_CONECTADA
                    </div>
                    <p className="text-[12px] text-[#888] mb-6">Tu agente Quantum está en línea. Ingresa tu número personal para ejecutar la prueba de transmisión.</p>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="+593 99 999 9999"
                        value={formData.testPhone}
                        onChange={(e) => setFormData({...formData, testPhone: e.target.value})}
                        className="flex-1 bg-[#111] border border-[#2E2E2E] px-4 py-3 text-[13px] text-white font-mono focus:border-[#00FFFF] focus:outline-none"
                      />
                      <button 
                        onClick={handleTestProtocol}
                        disabled={isTesting || formData.testPhone.length < 8}
                        className="px-6 border border-[#00FFFF] bg-[#00FFFF] text-black font-['Fira_Code'] text-[11px] tracking-widest font-bold hover:bg-white hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTesting ? "..." : "PING"}
                      </button>
                    </div>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}