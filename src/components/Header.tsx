"use client";

import { motion } from "motion/react";

export default function Header() {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 w-full z-50 border-b border-[#333333] bg-[#0a0a0a]/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo Quantum */}
        <div className="flex items-center gap-2 font-mono text-white font-bold tracking-wider">
          <span className="text-[#00FFFF]">{`>`}</span>
          QUANTUM
          <span className="animate-pulse w-1.5 h-4 bg-[#00FFFF] inline-block ml-1"></span>
        </div>

        {/* Navegación (Oculta en móviles muy pequeños para mantener limpieza) */}
        <nav className="hidden md:flex gap-8 font-mono text-xs tracking-widest text-gray-400">
          <a href="#about" className="hover:text-[#00FFFF] transition-colors">// IDENTIDAD</a>
          <a href="#infraestructura" className="hover:text-[#00FFFF] transition-colors">// INFRAESTRUCTURA</a>
          <a href="#despliegue" className="hover:text-white transition-colors border border-[#333333] px-3 py-1 hover:border-[#00FFFF]">
            [ INICIAR_DESPLIEGUE ]
          </a>
        </nav>
      </div>
    </motion.header>
  );
}