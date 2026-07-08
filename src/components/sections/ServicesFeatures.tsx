"use client";

import { motion } from "framer-motion";
import { Mic, MessageCircle, FileSpreadsheet, Cog, BarChart, FileText, Blocks, LayoutDashboard } from "lucide-react";

export function ServicesFeatures() {
  const services = [
    {
      icon: Mic,
      title: "AI Voice Agents",
      desc: "Deploy human-like conversational agents to handle incoming customer queries, qualify leads, and book appointments automatically over phone calls.",
      tech: ["ElevenLabs", "Vapi", "Twilio", "OpenAI"]
    },
    {
      icon: MessageCircle,
      title: "WhatsApp & Chatbot Automation",
      desc: "Turn WhatsApp into a sales machine. Automate lead capture, customer support, and order updates instantly without manual chat handling.",
      tech: ["WhatsApp API", "ManyChat", "Dialogflow"]
    },
    {
      icon: FileSpreadsheet,
      title: "Google Workspace & Sheets",
      desc: "Eliminate manual data entry. Build complex internal tools and automated pipelines directly within Google Sheets and Google Workspace.",
      tech: ["Apps Script", "Google APIs", "Make.com"]
    },
    {
      icon: FileText,
      title: "OCR & Document Processing",
      desc: "Extract data from invoices, POs, and receipts automatically. Pipe the extracted data directly into your ERP or accounting software.",
      tech: ["Google Cloud Vision", "AWS Textract", "Python"]
    },
    {
      icon: Cog,
      title: "Custom CRM & ERP Integrations",
      desc: "Connect disconnected systems. Sync data automatically between your CRM, marketing platforms, and operational databases.",
      tech: ["Zapier", "Make.com", "n8n", "Custom APIs"]
    },
    {
      icon: LayoutDashboard,
      title: "Business Intelligence Dashboards",
      desc: "Get real-time insights without waiting for reports. We build automated dashboards that pull data from all your systems into one view.",
      tech: ["Looker Studio", "PowerBI", "Retool"]
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-[#0A1028]/50 border-t border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-skynovara-primary/5 rounded-[100%] blur-[120px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-skynovara-primary/10 border border-skynovara-primary/20 text-skynovara-primary text-sm font-medium mb-6"
          >
            <Blocks className="w-4 h-4" />
            Core Capabilities
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
          >
            We Automate <span className="text-gradient">Everything.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            From simple data entry to complex decision-making processes, we build AI architectures that replace entire departments.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="group relative"
            >
               {/* Hover Glow */}
               <div className="absolute inset-0 bg-gradient-to-br from-skynovara-primary/20 to-skynovara-violet/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

               <div className="relative h-full glass p-8 rounded-3xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 z-10 flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <service.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-heading font-bold text-white mb-3">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">
                    {service.desc}
                  </p>

                  <div className="mt-auto">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Powered By</p>
                    <div className="flex flex-wrap gap-2">
                       {service.tech.map((t, i) => (
                         <span key={i} className="text-xs font-medium px-2 py-1 rounded-md bg-black/40 border border-white/5 text-gray-300">
                           {t}
                         </span>
                       ))}
                    </div>
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}