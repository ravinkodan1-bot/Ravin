import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function SolutionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">Our Solutions</h1>
          <p className="text-gray-400 text-lg">Comprehensive AI systems for every industry.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
