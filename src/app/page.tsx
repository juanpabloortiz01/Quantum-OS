import Header from "@/components/Header";
import QuantumHero from "@/components/QuantumHero";
import TitoSkills from "@/components/TitoSkills";
import QuantumPricing from "@/components/QuantumPricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBFBFA] overflow-x-hidden text-[#1A1A1A] font-sans relative">
      <div className="relative z-10">
        <Header />
        <QuantumHero />
        <TitoSkills />
        <QuantumPricing />
        <Footer />
      </div>
    </main>
  );
}