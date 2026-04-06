"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Header() {
  const { status } = useSession();
  
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 w-full z-50 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO QUANTUM */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#1A1A1A] tracking-tight group">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] group-hover:scale-110 transition-transform"></span>
          Quantum OS
        </Link>

        {/* NAVEGACIÓN NIVELADA */}
        <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium">
          
          {/* SECCIONES */}
          <div className="hidden md:flex items-center gap-8 text-[#4B5563]">
            <a href="#producto" className="hover:text-[#1A1A1A] transition-colors">
              Producto
            </a>
            <a href="#planes" className="hover:text-[#1A1A1A] transition-colors">
              Precios
            </a>
          </div>

          {/* BOTÓN DE DESPLIEGUE */}
          <Link 
            href={status === "authenticated" ? "/dashboard" : "/onboarding"} 
            className="text-white bg-[#1A1A1A] px-5 py-2 hover:bg-[#333] rounded-lg transition-all shadow-sm flex items-center justify-center min-w-[140px]"
          >
            {status === "loading" ? "..." : status === "authenticated" ? "Ir al Panel" : "Comenzar Gratis"}
          </Link>
          
        </nav>
      </div>
    </motion.header>
  );
}