import ParticleNetwork from "@/components/ParticleNetwork";
import GlowOrbs from "@/components/GlowOrbs";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Animated background layers */}
      <GlowOrbs />
      <ParticleNetwork />

      {/* Content */}
      <Navbar />
      <Hero />
      <Services />
      <Portfolio />
      <Testimonials />
      <Contact />
    </main>
  );
}
