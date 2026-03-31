"use client";

import { motion } from "motion/react";

export default function QuantumAbout() {
  return (
    <section id="about" className="w-full min-h-screen bg-[#0a0a0a] flex items-center justify-center py-24 px-6 relative z-10 border-t border-[#1a1a1a]">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Columna Izquierda: El Copy */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="font-mono text-[#00FFFF] text-sm mb-4 tracking-widest uppercase">
            [ IDENTIDAD_DEL_SISTEMA ]
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Tu operación no es lenta. <br/>
            <span className="text-gray-500">Es analógica.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-6 leading-relaxed font-light">
            En <strong className="text-white font-normal">Quantum</strong>, no diseñamos interfaces. Reimaginamos la propia infraestructura de tu negocio. <strong className="text-white font-normal">Menos clics, más código.</strong>
          </p>
          <p className="text-gray-400 text-base sm:text-lg mb-8 leading-relaxed font-light">
            Nuestra directiva es simple: identificar procesos analógicos propensos al error humano —como la toma de pedidos y la validación bancaria— y reemplazarlos con motores de IA de alta precisión operativa. <strong className="text-white font-normal">Eficiencia radical, por código.</strong>
          </p>

          {/* Stats/Specs */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#333333] pt-8">
            <div>
              <div className="text-3xl font-mono text-white mb-1">0%</div>
              <div className="text-xs font-mono text-gray-500 uppercase">Fricción Operativa</div>
            </div>
            <div>
              <div className="text-3xl font-mono text-[#00FFFF] mb-1">100%</div>
              <div className="text-xs font-mono text-gray-500 uppercase">Escalabilidad de Código</div>
            </div>
          </div>
        </motion.div>

        {/* Columna Derecha: Elemento Visual Técnico */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative h-full min-h-[400px] border border-[#252525] bg-[#121212] p-6 font-mono text-sm sm:text-xs overflow-hidden"
        >
          {/* Falso terminal corriendo procesos */}
          <div className="absolute top-0 left-0 w-full h-8 bg-[#1a1a1a] border-b border-[#252525] flex items-center px-4 gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-500 ml-2 text-[10px]">quantum_core.exe</span>
          </div>
          
          <div className="mt-8 text-gray-400 flex flex-col gap-2">
            <p><span className="text-green-400">{`>`}</span> Iniciando diagnóstico de flujos de trabajo...</p>
            <p className="delay-100"><span className="text-green-400">{`>`}</span> Cuellos de botella detectados: <span className="text-red-400">Atención al cliente, Validación de pagos.</span></p>
            <p className="delay-200"><span className="text-green-400">{`>`}</span> Compilando solución SaaS...</p>
            <p className="delay-300"><span className="text-green-400">{`>`}</span> Desplegando agentes de IA en nodos de WhatsApp...</p>
            <p className="mt-4 text-[#00FFFF] animate-pulse">ESTADO: INFRAESTRUCTURA OPTIMIZADA.</p>
            
            {/* Decoloración en la parte inferior para fundirse con el fondo */}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#121212] to-transparent pointer-events-none"></div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}