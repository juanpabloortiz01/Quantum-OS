import Header from "@/components/Header";
import QuantumHero from "@/components/QuantumHero";
import QuantumProcess from "@/components/QuantumProcess";
import QuantumAbout from "@/components/QuantumAbout";
import QuantumPricing from "@/components/QuantumPricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0D0D0D] overflow-x-hidden text-white font-['Inter'] selection:bg-[#00FFFF] selection:text-black relative">
      {/* SCANLINES OVERLAY GLOBAL */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" 
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} 
      />
      
      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10">
        <Header />
        <QuantumHero />
        <QuantumProcess />
        <QuantumAbout />
        <QuantumPricing />
        <Footer />
      </div>
    </main>
  );
}