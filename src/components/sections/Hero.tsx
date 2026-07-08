"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Zap, LineChart, MessageSquare, Play, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useMouse } from "react-use";

const FloatingElement = ({ children, className, delay = 0, yOffset = 20 }: { children: React.ReactNode, className?: string, delay?: number, yOffset?: number }) => (
  <motion.div
    initial={{ y: 0 }}
    animate={{ y: [-yOffset, yOffset, -yOffset] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { docX, docY } = useMouse(containerRef as any);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-[100svh] flex items-center justify-center pt-24 pb-12 overflow-hidden selection:bg-skynovara-primary/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-skynovara-dark -z-30" />

      {/* Mouse Follow Glow (only client-side) */}
      {mounted && (
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen pointer-events-none -z-20 opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(79,139,255,0.4) 0%, rgba(139,92,246,0.1) 70%, transparent 100%)",
          }}
          animate={{
             x: docX - 300,
             y: docY - 300,
          }}
          transition={{ type: "spring", damping: 40, stiffness: 200, mass: 0.5 }}
        />
      )}

      {/* Static Aurora Gradients */}
      <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-skynovara-primary/20 blur-[150px] mix-blend-screen -z-20 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-skynovara-violet/20 blur-[150px] mix-blend-screen -z-20 animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_70%,transparent_100%)] -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto">

          {/* Left Column: Copy */}
          <motion.div style={{ y, opacity }} className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/10 mb-8 shadow-xl"
            >
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              <span className="text-sm font-medium text-gray-200">SkyNovara Agentic AI is Live</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5rem] font-heading font-extrabold tracking-tight text-white mb-6 leading-[1.05]"
            >
              Stop Relying On <br className="hidden lg:block" />
              Employees. <br />
              <span className="text-gradient">Automate Everything.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-gray-400 max-w-xl mb-10 leading-relaxed font-light"
            >
              Why pay salaries for manual data entry, follow-ups, and reports? Our AI systems work 24/7/365 without leaves, holidays, or errors. Scale your business, not your payroll.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Link href="/contact" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base bg-white text-black hover:bg-gray-100 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] group">
                  Book Free Workflow Audit
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/case-studies" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 text-base border-white/10 hover:bg-white/5 rounded-xl font-medium text-white transition-all hover:border-white/20">
                  <Play className="w-4 h-4 mr-2 text-skynovara-primary" />
                  See It In Action
                </Button>
              </Link>
            </motion.div>

            {/* Social Proof Mini */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-12 flex items-center gap-4 text-sm text-gray-400"
            >
               <div className="flex -space-x-3">
                 {[1,2,3,4].map((i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-skynovara-dark bg-gradient-to-br from-skynovara-primary to-skynovara-violet flex items-center justify-center text-xs font-bold text-white shadow-lg z-[${5-i}]`}>
                      C{i}
                    </div>
                 ))}
               </div>
               <div>
                  <div className="flex items-center text-yellow-500 mb-1">
                     {"★★★★★"}
                  </div>
                  <p>Trusted by 500+ Indian Businesses</p>
               </div>
            </motion.div>

          </motion.div>

          {/* Right Column: Interactive Mockup & Floating Cards */}
          <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
             className="relative hidden lg:block h-[600px] w-full"
          >
             {/* Main Dashboard Mockup */}
             <div className="absolute inset-0 rounded-2xl glass-card border border-white/10 shadow-2xl overflow-hidden flex flex-col transform perspective-1000 rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0">
                {/* Mockup Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-black/40">
                   <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-500/80" />
                     <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                     <div className="w-3 h-3 rounded-full bg-green-500/80" />
                   </div>
                   <div className="mx-auto px-4 py-1 rounded-md bg-white/5 text-xs text-gray-400 font-mono flex items-center gap-2">
                     <Bot className="w-3 h-3" /> skynovara-ai-engine.app
                   </div>
                </div>
                {/* Mockup Body */}
                <div className="flex-1 p-6 flex flex-col gap-6 bg-gradient-to-br from-black/60 to-[#0A1028]/80">
                   <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-xl font-heading font-semibold text-white">Live Workflow Status</h3>
                        <p className="text-sm text-gray-400 mt-1">AI Agents currently processing...</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gradient">98.5%</div>
                        <div className="text-xs text-green-400 uppercase tracking-wider">Efficiency</div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      {[
                        { title: "Invoice Processing (OCR)", status: "Active", time: "1s ago", icon: FileText, progress: 100 },
                        { title: "WhatsApp Lead Follow-up", status: "Active", time: "Just now", icon: MessageSquare, progress: 85 },
                        { title: "Inventory Restock Alert", status: "Completed", time: "2m ago", icon: Zap, progress: 100 }
                      ].map((task, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-skynovara-primary/20 flex items-center justify-center">
                                 <task.icon className="w-5 h-5 text-skynovara-primary" />
                              </div>
                              <div>
                                 <div className="text-sm font-medium text-white">{task.title}</div>
                                 <div className="text-xs text-gray-400">{task.time}</div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                                 <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${task.progress}%` }}
                                    transition={{ duration: 1.5, delay: 0.5 + idx * 0.2 }}
                                    className="h-full bg-gradient-to-r from-skynovara-primary to-skynovara-violet"
                                 />
                              </div>
                              <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {task.status}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="mt-auto grid grid-cols-2 gap-4">
                      <div className="glass p-4 rounded-xl">
                        <div className="text-gray-400 text-xs mb-1">Manual Hours Saved</div>
                        <div className="text-2xl font-bold text-white">1,240 hrs</div>
                        <div className="text-xs text-green-400 mt-1">+12% this week</div>
                      </div>
                      <div className="glass p-4 rounded-xl">
                        <div className="text-gray-400 text-xs mb-1">Cost Reduction</div>
                        <div className="text-2xl font-bold text-white">₹3.5 Lakh</div>
                        <div className="text-xs text-green-400 mt-1">This month</div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Floating Elements */}
             <FloatingElement delay={0} yOffset={15} className="absolute -left-12 top-10 glass-card p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 z-20">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-green-500" />
                </div>
                <div>
                   <p className="text-sm font-medium text-white">AI Voice Agent</p>
                   <p className="text-xs text-gray-400">Handling 50+ calls/min</p>
                </div>
             </FloatingElement>

             <FloatingElement delay={1} yOffset={10} className="absolute -right-8 top-1/2 glass-card p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 z-20">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                   <p className="text-sm font-medium text-white">CRM Synced</p>
                   <p className="text-xs text-gray-400">Zero data entry</p>
                </div>
             </FloatingElement>

          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Temporary icon component since we mapped FileText but didn't import it at top
const FileText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);