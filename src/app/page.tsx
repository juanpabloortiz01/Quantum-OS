import Header from "@/components/Header";
import QuantumHero from "@/components/QuantumHero";
import QuantumAbout from "@/components/QuantumAbout";
import QuantumPricing from "@/components/QuantumPricing";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] overflow-x-hidden">
      <Header />
      <QuantumHero />
      <QuantumAbout />
      <QuantumPricing />
    </main>
  );
}