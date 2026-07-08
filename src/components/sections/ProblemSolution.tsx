"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, TrendingDown, Users, CheckCircle2, Zap, BrainCircuit, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProblemSolution() {
  const problems = [
    {
      icon: Users,
      title: "Human Dependency",
      desc: "Your business stops when your team goes home. Sick leaves, holidays, and attrition directly impact your bottom line and operations.",
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      border: "border-orange-400/20"
    },
    {
      icon: Clock,
      title: "Delayed Execution",
      desc: "Reports take days to compile. Leads get cold while waiting for a follow-up. Manual processes are simply too slow for modern business.",
      color: "text-red-400",
      bg: "bg-red-400/10",
      border: "border-red-400/20"
    },
    {
      icon: TrendingDown,
      title: "Costly Errors",
      desc: "Manual data entry in Excel, ERPs, and accounting software leads to costly mistakes, duplicate entries, and compliance headaches.",
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
      border: "border-yellow-400/20"
    }
  ];

  const solutions = [
    {
      icon: Zap,
      title: "24/7 Execution",
      desc: "AI agents never sleep. Leads are engaged in seconds, invoices are processed instantly, and operations run continuously without breaks."
    },
    {
      icon: BrainCircuit,
      title: "100% Accuracy",
      desc: "Eliminate human error entirely. AI models process data, update your ERP, and generate reports with mathematical precision."
    },
    {
      icon: LineChart,
      title: "Infinite Scale",
      desc: "Handle 10 leads or 10,000 leads with the exact same overhead. Scale your business output exponentially without hiring a single new employee."
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-skynovara-dark -z-20" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-skynovara-primary/10 rounded-full blur-[150px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-skynovara-violet/10 rounded-full blur-[150px] -z-10 mix-blend-screen" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">

        {/* Problem Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6"
          >
            <AlertTriangle className="w-4 h-4" />
            The True Cost of Manual Work
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
          >
            Are You Running A Business, <br className="hidden md:block" /> Or Managing <span className="text-red-400">Inefficiency?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            Indian businesses lose millions annually due to slow processes, human error, and bloated payrolls. If your operations rely on manual data entry, you are already falling behind.
          </motion.p>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-32">
          {problems.map((prob, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
            >
              <Card className="bg-black/20 border-white/5 h-full relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/40 z-0" />
                <CardContent className="p-8 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${prob.bg} ${prob.border} border flex items-center justify-center mb-6`}>
                    <prob.icon className={`w-7 h-7 ${prob.color}`} />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-white mb-3 group-hover:text-red-300 transition-colors">{prob.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {prob.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Transition Line */}
        <div className="relative h-32 flex justify-center items-center mb-16 opacity-50">
           <div className="w-px h-full bg-gradient-to-b from-red-500/0 via-skynovara-primary to-skynovara-primary/0" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-skynovara-primary bg-[#050816] flex items-center justify-center">
              <ArrowDownIcon className="w-4 h-4 text-skynovara-primary" />
           </div>
        </div>

        {/* Solution Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-skynovara-primary/10 border border-skynovara-primary/20 text-skynovara-primary text-sm font-medium mb-6"
          >
            <CheckCircle2 className="w-4 h-4" />
            The SkyNovara Solution
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
          >
            Replace Manual Effort With <br className="hidden md:block" /> <span className="text-gradient">Intelligent AI Systems.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            We build custom AI agents and workflow automations that integrate directly with your existing software. We don't just optimize your business; we put it on autopilot.
          </motion.p>
        </div>

        {/* Solution Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((sol, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
            >
              <Card className="glass-card h-full relative overflow-hidden group border-skynovara-primary/20 hover:border-skynovara-primary/40 transition-all hover:-translate-y-1 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-skynovara-primary/5 to-skynovara-violet/5 z-0" />
                <CardContent className="p-8 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-skynovara-primary/10 border border-skynovara-primary/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(79,139,255,0.2)] group-hover:shadow-[0_0_25px_rgba(79,139,255,0.4)] transition-shadow">
                    <sol.icon className="w-7 h-7 text-skynovara-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-white mb-3 group-hover:text-skynovara-primary transition-colors">{sol.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {sol.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M19 12l-7 7-7-7"/>
    </svg>
  );
}