"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-b from-skynovara-dark to-[#02040a] -z-20" />

       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-skynovara-primary/20 rounded-[100%] blur-[120px] -z-10 mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}/>

       <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto glass-card rounded-[2.5rem] p-8 md:p-16 text-center border border-white/10 relative overflow-hidden group"
          >
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none" />

             <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-skynovara-primary to-skynovara-violet flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(79,139,255,0.4)] group-hover:scale-110 transition-transform duration-500">
               <Bot className="w-10 h-10 text-white" />
             </div>

             <h2 className="text-4xl md:text-6xl font-heading font-extrabold text-white mb-6 tracking-tight">
               Your Competitors Are Already <br className="hidden md:block" /> <span className="text-gradient">Automating.</span>
             </h2>

             <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
               Every day you wait, you lose money to inefficiency and human error. Stop hiring for repetitive tasks. Let's build your AI workforce today.
             </p>

             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-16 px-10 text-lg bg-white text-black hover:bg-gray-100 rounded-2xl font-bold transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                    Book Free Automation Audit
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </Button>
                </Link>
             </div>
             <p className="text-sm text-gray-500 mt-6 uppercase tracking-wider font-semibold">Limited to 5 new clients per month.</p>
          </motion.div>
       </div>
    </section>
  );
}