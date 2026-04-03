"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Header() {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 w-full z-50 border-b border-[#1A1A1A] bg-[#0D0D0D]/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO QUANTUM */}
        <Link href="/" className="flex items-center gap-2 font-mono text-white font-bold tracking-widest group">
          <span className="text-[#00FFFF] group-hover:animate-pulse">{`>`}</span>
          QUANTUM
          <span className="w-1.5 h-4 bg-[#00FFFF] inline-block ml-1 animate-[pulse_1s_infinite]"></span>
        </Link>

        {/* NAVEGACIÓN NIVELADA */}
        <nav className="flex items-center gap-6 sm:gap-8 font-mono text-[10px] tracking-[0.2em]">
          
          {/* SECCIONES */}
          <div className="hidden md:flex items-center gap-8 text-[#555555]">
            <a href="#producto" className="hover:text-[#00FFFF] transition-colors uppercase">
              // PRODUCTO
            </a>
            <a href="#planes" className="hover:text-[#00FFFF] transition-colors uppercase">
              // PLANES
            </a>
          </div>

          {/* BOTÓN DE DESPLIEGUE */}
          <Link 
            href="/onboarding" 
            className="text-white border border-[#2A2A2A] px-4 py-2 hover:border-[#00FFFF]/50 hover:text-[#00FFFF] transition-all bg-[#111111] uppercase"
          >
            [ INICIAR_DESPLIEGUE ]
          </Link>
          
        </nav>
      </div>
    </motion.header>
  );
}