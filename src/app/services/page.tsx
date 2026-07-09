import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ServicesFeatures } from "@/components/sections/ServicesFeatures";

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-32 pb-16">
        <ServicesFeatures />
      </main>
      <Footer />
    </div>
  );
}
