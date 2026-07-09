import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SuccessStoriesProcess } from "@/components/sections/SuccessStoriesProcess";

export default function CaseStudiesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-32 pb-16">
        <SuccessStoriesProcess />
      </main>
      <Footer />
    </div>
  );
}
