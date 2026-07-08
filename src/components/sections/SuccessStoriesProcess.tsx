"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Banknote, Workflow, BarChart3, TrendingUp, Search, Code, Rocket, HandHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SuccessStoriesProcess() {
  const caseStudies = [
    {
      title: "Chemical Manufacturer Automates Daily MIS",
      industry: "Chemical Manufacturing",
      before: "8 Employees, Manual Excel, 3-Day Delay",
      after: "AI Dashboard, Instant Reports, 0 Errors",
      metrics: [
         { label: "Time Saved", value: "80%", icon: Clock },
         { label: "Annual Saving", value: "₹25L", icon: Banknote },
      ]
    },
    {
      title: "Logistics Firm Eliminates Manual Dispatch",
      industry: "Supply Chain & Logistics",
      before: "12 Staff, Whatsapp Chaos, Lost Orders",
      after: "WhatsApp AI Bot, Auto-Routing, 100% Tracking",
      metrics: [
         { label: "Order Capacity", value: "3x", icon: TrendingUp },
         { label: "Response Time", value: "< 2s", icon: Clock },
      ]
    },
    {
      title: "Real Estate Agency Automates Lead Follow-up",
      industry: "Real Estate",
      before: "Leads dropping, missed follow-ups",
      after: "AI Voice Agent handles initial qualification",
      metrics: [
         { label: "Conversion Rate", value: "+45%", icon: BarChart3 },
         { label: "Meetings Booked", value: "2x", icon: TrendingUp },
      ]
    }
  ];

  const processSteps = [
    { title: "Discovery", icon: Search, desc: "We audit your current operations to find manual bottlenecks." },
    { title: "Workflow Mapping", icon: Workflow, desc: "We design an optimized, automated architecture." },
    { title: "Development", icon: Code, desc: "We build custom AI agents and integrations." },
    { title: "Deployment", icon: Rocket, desc: "Seamless launch without disrupting current work." },
    { title: "Support", icon: HandHeart, desc: "24/7 monitoring and continuous optimization." },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">

        {/* Case Studies Preview */}
        <div className="mb-32">
           <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-2xl">
                 <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4">
                   Real Transformations. <br/> <span className="text-gradient">Real ROI.</span>
                 </h2>
                 <p className="text-gray-400">See how Indian businesses are scaling without adding payroll.</p>
              </div>
              <Link href="/case-studies">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  View All Case Studies <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
           </div>

           <div className="grid md:grid-cols-3 gap-6">
              {caseStudies.map((study, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="glass-card h-full border-white/10 hover:border-skynovara-primary/30 transition-all flex flex-col">
                    <CardContent className="p-8 flex flex-col flex-1">
                      <div className="text-xs font-semibold text-skynovara-primary uppercase tracking-wider mb-3">{study.industry}</div>
                      <h3 className="text-xl font-heading font-semibold text-white mb-6 leading-snug">{study.title}</h3>

                      <div className="space-y-4 mb-8 flex-1">
                         <div>
                            <div className="text-xs text-red-400 mb-1 font-medium">BEFORE</div>
                            <div className="text-sm text-gray-400">{study.before}</div>
                         </div>
                         <div className="h-px w-full bg-white/5" />
                         <div>
                            <div className="text-xs text-green-400 mb-1 font-medium">AFTER</div>
                            <div className="text-sm text-white font-medium">{study.after}</div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        {study.metrics.map((metric, i) => (
                          <div key={i} className="bg-black/30 rounded-xl p-4 border border-white/5">
                            <metric.icon className="w-4 h-4 text-gray-400 mb-2" />
                            <div className="text-2xl font-bold text-white">{metric.value}</div>
                            <div className="text-xs text-gray-400">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Process Timeline */}
        <div className="relative">
           <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                The Path to Full Automation.
              </h2>
              <p className="text-gray-400">Our battle-tested 5-step process ensures a seamless transition to AI.</p>
           </div>

           <div className="relative max-w-5xl mx-auto hidden md:block">
              {/* Connecting Line */}
              <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-skynovara-primary/0 via-skynovara-primary/50 to-skynovara-primary/0" />

              <div className="grid grid-cols-5 gap-4 relative z-10">
                 {processSteps.map((step, idx) => (
                   <div key={idx} className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 rounded-full glass border border-skynovara-primary/30 flex items-center justify-center mb-6 relative group hover:border-skynovara-primary transition-colors bg-skynovara-dark">
                        <div className="absolute inset-0 bg-skynovara-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <step.icon className="w-6 h-6 text-white relative z-10" />
                        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-skynovara-primary text-[10px] font-bold flex items-center justify-center text-white border-2 border-skynovara-dark">
                          0{idx + 1}
                        </div>
                     </div>
                     <h4 className="text-lg font-heading font-semibold text-white mb-2">{step.title}</h4>
                     <p className="text-sm text-gray-400 px-2">{step.desc}</p>
                   </div>
                 ))}
              </div>
           </div>

           {/* Mobile Process list */}
           <div className="md:hidden space-y-6">
              {processSteps.map((step, idx) => (
                   <div key={idx} className="glass p-6 rounded-2xl flex gap-4 items-start border border-white/5">
                     <div className="w-12 h-12 rounded-full bg-skynovara-primary/10 border border-skynovara-primary/20 flex-shrink-0 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-skynovara-primary" />
                     </div>
                     <div>
                       <h4 className="text-lg font-heading font-semibold text-white mb-1">
                          <span className="text-skynovara-primary mr-2">0{idx+1}.</span>{step.title}
                       </h4>
                       <p className="text-sm text-gray-400">{step.desc}</p>
                     </div>
                   </div>
              ))}
           </div>
        </div>

      </div>
    </section>
  );
}