"use client";

import { motion } from "motion/react";
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
        
        {/* LOGO TITO */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#1A1A1A] tracking-tight group">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F54927] group-hover:scale-110 transition-transform shadow-sm shadow-[#F54927]/40" />
          Tito
        </Link>

        {/* NAVEGACIÓN */}
        <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium">
          
          {/* SECCIONES */}
          <div className="hidden md:flex items-center gap-8 text-[#4B5563]">
            <a href="#producto" className="hover:text-[#F54927] transition-colors">
              Producto
            </a>
            <a href="#planes" className="hover:text-[#F54927] transition-colors">
              Precios
            </a>
          </div>

          {/* BOTÓN DE ACCIÓN */}
          <Link 
            href={status === "authenticated" ? "/dashboard" : "/onboarding"} 
            className="text-white bg-[#F54927] px-5 py-2 hover:bg-[#d93d1f] rounded-lg transition-all shadow-sm shadow-[#F54927]/30 flex items-center justify-center min-w-[140px]"
          >
            {status === "loading" ? "..." : status === "authenticated" ? "Ir al Panel" : "Comenzar Gratis"}
          </Link>
          
        </nav>
      </div>
    </motion.header>
  );
}