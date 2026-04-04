"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const NICHES = [
  { id: "gastro", label: "GASTRONOMÍA" },
  { id: "retail", label: "REVENTA / E-COMMERCE" },
  { id: "clinic", label: "CLÍNICA / SERVICIOS" }
];

const AVAILABLE_NEEDS = [
  { id: "calendar", label: "AGENDAR_CITAS" },
  { id: "ocr", label: "VALIDAR_PAGOS" },
  { id: "crm", label: "GESTIÓN_CLIENTES" },
  { id: "orders", label: "TOMAR_PEDIDOS" },
  { id: "catalog", label: "CATÁLOGO_DIGITAL" },
  { id: "shipping", label: "LOGÍSTICA_ENVÍOS" }
];

export default function OnboardingQuantum() {
  const [step, setStep] = useState(0); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    niche: "",
    needs: [] as string[],
    masterPrompt: "",
    testPhone: ""
  });

  const toggleNeed = (id: string) => {
    setFormData(prev => ({
      ...prev,
      needs: prev.needs.includes(id) 
        ? prev.needs.filter(n => n !== id) 
        : [...prev.needs, id]
    }));
  };

  const handleContinue = () => {
    setError("");
    
    // Validación de seguridad básica
    if (!email.includes("@")) {
      setError("INGRESE_UN_CORREO_VALIDO");
      return;
    }
    if (password.length < 6) {
      setError("LA_CONTRASEÑA_DEBE_TENER_AL_MENOS_6_CARACTERES");
      return;
    }
    if (password !== confirmPassword) {
      setError("LAS_CONTRASEÑAS_NO_COINCIDEN");
      return;
    }

    setStep(1);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center font-sans p-4 selection:bg-[#00FFFF] selection:text-black">
      {/* SCANLINES OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }} />
      
      <div className="max-w-md w-full border border-[#1A1A1A] bg-[#0D0D0D] p-10 relative z-10 shadow-2xl">
        {/* ESQUINAS DECORATIVAS */}
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-gradient-to-b from-[#00FFFF] to-transparent" />
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-gradient-to-r from-[#00FFFF] to-transparent" />

        <header className="mb-10 text-center">
          <div className="font-mono text-[10px] text-[#444] tracking-[0.3em] uppercase mb-2">Quantum // System_Setup</div>
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido a Quantum</h1>
        </header>

        <AnimatePresence mode="wait">
          {/* PASO 0: LOGIN CON VALIDACIÓN DE CONTRASEÑA */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col">
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#666] uppercase mb-2 tracking-widest">Correo electrónico</label>
                  <input 
                    type="email" 
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF] outline-none transition-all font-mono"
                  />
                </div>

                {/* DESPLIEGUE PROGRESIVO DE CONTRASEÑAS */}
                <AnimatePresence>
                  {email.length > 2 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="block font-mono text-[10px] text-[#666] uppercase mb-2 tracking-widest">Nueva Contraseña</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF] outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[#666] uppercase mb-2 tracking-widest">Repetir Contraseña</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#111] border border-[#222] p-3 text-sm focus:border-[#00FFFF] outline-none transition-all font-mono"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-[9px] font-mono text-red-500 uppercase tracking-tighter">
                    Error: {error}
                  </p>
                )}

                <button 
                  onClick={handleContinue}
                  className="w-full bg-white text-black font-bold py-3 text-xs uppercase tracking-widest hover:bg-[#00FFFF] transition-colors"
                >
                  Continuar
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#1A1A1A]"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#0D0D0D] px-4 text-[#444]">o continuar con</span></div>
              </div>

              <button 
                onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                className="w-full border border-[#222] bg-[#111] py-3 flex items-center justify-center gap-3 hover:bg-[#1A1A1A] transition-colors group"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-mono text-[10px] tracking-widest text-[#888] group-hover:text-white">Google Account</span>
              </button>

              <p className="mt-8 text-center text-[#444] text-[10px] tracking-tight">
                ¿Ya tienes una cuenta? <Link href="/login" className="text-[#00FFFF] hover:underline">Inicia sesión</Link>
              </p>
            </motion.div>
          )}

          {/* PASO 1: SECTOR */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }} className="space-y-8">
              <div>
                <span className="font-mono text-[10px] text-[#444] block mb-4 uppercase tracking-[0.2em]">01_Sector del negocio</span>
                <div className="grid grid-cols-1 gap-2">
                  {NICHES.map(niche => (
                    <button
                      key={niche.id}
                      onClick={() => setFormData({...formData, niche: niche.id})}
                      className={`py-3 px-4 border font-mono text-[10px] tracking-widest text-left transition-all ${formData.niche === niche.id ? 'border-[#00FFFF] bg-[#00FFFF]/5 text-[#00FFFF]' : 'border-[#1A1A1A] bg-[#111] text-[#444] hover:border-[#333]'}`}
                    >
                      {niche.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] text-[#444] block mb-4 uppercase tracking-[0.2em]">02_Habilidades del Agente</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_NEEDS.map(need => (
                    <label key={need.id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${formData.needs.includes(need.id) ? 'border-[#00FFFF]/30 bg-[#00FFFF]/5' : 'border-[#1A1A1A] bg-[#111] hover:bg-[#151515]'}`}>
                      <input type="checkbox" className="hidden" onChange={() => toggleNeed(need.id)} />
                      <div className={`w-3 h-3 border flex items-center justify-center ${formData.needs.includes(need.id) ? 'border-[#00FFFF]' : 'border-[#333]'}`}>
                        {formData.needs.includes(need.id) && <div className="w-1.5 h-1.5 bg-[#00FFFF]" />}
                      </div>
                      <span className={`font-mono text-[9px] tracking-widest ${formData.needs.includes(need.id) ? 'text-white' : 'text-[#444]'}`}>{need.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!formData.niche} className="w-full py-4 bg-white text-black font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-[#00FFFF] transition-all disabled:opacity-20">
                Siguiente Paso
              </button>
            </motion.div>
          )}

          {/* PASO 2: CONTEXTO */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }} className="space-y-6">
              <div>
                <span className="font-mono text-[10px] text-[#444] block mb-2 uppercase tracking-[0.2em]">03_Contexto del negocio</span>
                <p className="text-[11px] text-[#666] mb-4 leading-relaxed">Define las reglas base de tu IA.</p>
                <textarea 
                  value={formData.masterPrompt}
                  onChange={(e) => setFormData({...formData, masterPrompt: e.target.value})}
                  placeholder="Ej: Somos TechStore. Atendemos de 9am a 6pm. Solo aceptamos transferencias..."
                  className="w-full h-40 bg-[#111] border border-[#1A1A1A] p-4 text-xs text-white font-mono focus:border-[#00FFFF] outline-none resize-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-6 py-4 border border-[#1A1A1A] text-[#444] font-mono text-[10px] tracking-widest hover:text-white transition-colors">Atrás</button>
                <button onClick={() => setStep(3)} disabled={formData.masterPrompt.length < 10} className="flex-1 py-4 bg-white text-black font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-[#00FFFF] transition-all disabled:opacity-20">Finalizar</button>
              </div>
            </motion.div>
          )}

          {/* PASO 3: QR */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
              <div className="border border-[#1A1A1A] bg-[#111] p-8 inline-block mx-auto relative">
                 <div className="w-48 h-48 bg-[#0D0D0D] border border-[#222] p-2 relative flex items-center justify-center text-center">
                    <span className="font-mono text-[8px] text-[#00FFFF] animate-pulse uppercase tracking-tighter">Sincronizando con Evolution API...</span>
                 </div>
              </div>
              <p className="text-[11px] text-[#666] max-w-xs mx-auto italic">Escanea el código QR desde dispositivos vinculados en WhatsApp.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}