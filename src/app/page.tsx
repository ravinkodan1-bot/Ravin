import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ProblemSolution } from "@/components/sections/ProblemSolution";
import { ServicesFeatures } from "@/components/sections/ServicesFeatures";
import { IndustriesIntegrations } from "@/components/sections/IndustriesIntegrations";
import { ROICalculator } from "@/components/sections/ROICalculator";
import { SuccessStoriesProcess } from "@/components/sections/SuccessStoriesProcess";
import { TestimonialsPreview } from "@/components/sections/TestimonialsPreview";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <ProblemSolution />
        <ServicesFeatures />
        <IndustriesIntegrations />
        <ROICalculator />
        <SuccessStoriesProcess />
        <TestimonialsPreview />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}