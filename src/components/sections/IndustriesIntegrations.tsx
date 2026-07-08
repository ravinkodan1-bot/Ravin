"use client";

import { motion } from "framer-motion";
import { Factory, FlaskConical, Building2, Globe2, ShoppingBag, Stethoscope, GraduationCap, Hotel, HardHat, Warehouse } from "lucide-react";
import Image from "next/image";

export function IndustriesIntegrations() {
  const industries = [
    { name: "Manufacturing", icon: Factory },
    { name: "Chemical", icon: FlaskConical },
    { name: "Import/Export", icon: Globe2 },
    { name: "Real Estate", icon: Building2 },
    { name: "Retail & E-Com", icon: ShoppingBag },
    { name: "Healthcare", icon: Stethoscope },
    { name: "Logistics", icon: Warehouse },
    { name: "Construction", icon: HardHat },
    { name: "Hospitality", icon: Hotel },
    { name: "Education", icon: GraduationCap },
  ];

  // Placeholder names for integration logos (in reality, you'd use SVGs)
  const integrations = [
    "OpenAI", "Claude", "Gemini", "WhatsApp", "Google Workspace",
    "Zapier", "Make.com", "n8n", "Salesforce", "HubSpot",
    "Zoho", "Shopify", "Stripe", "Razorpay", "Tally"
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">

        {/* Industries */}
        <div className="mb-32">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              Built For Indian Industry.
            </h2>
            <p className="text-gray-400">
              We understand the unique challenges of traditional businesses. Our solutions are designed to modernize operations without disrupting your core workflow.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((ind, idx) => (
              <motion.div
                key={ind.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="glass px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/5 hover:border-skynovara-primary/50 hover:bg-white/5 transition-all cursor-default group"
              >
                <ind.icon className="w-5 h-5 text-gray-400 group-hover:text-skynovara-primary transition-colors" />
                <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{ind.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Integrations (Logo Cloud style) */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              Integrates With Everything.
            </h2>
            <p className="text-gray-400">
              You don't need to change your software. We connect your existing tools into one seamless, automated ecosystem.
            </p>
          </div>

          {/* Infinite Scroll Logo Cloud Simulation */}
          <div className="relative w-full overflow-hidden flex flex-col gap-6 mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)">

             {/* Row 1 */}
             <motion.div
               animate={{ x: [0, -1000] }}
               transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
               className="flex gap-6 w-max"
             >
                {[...integrations, ...integrations].map((tech, idx) => (
                   <div key={`r1-${idx}`} className="w-48 h-20 glass-card rounded-2xl flex items-center justify-center border border-white/5 text-gray-400 font-heading font-semibold text-lg hover:text-white hover:border-white/20 transition-all">
                      {tech}
                   </div>
                ))}
             </motion.div>

             {/* Row 2 (Reverse) */}
             <motion.div
               animate={{ x: [-1000, 0] }}
               transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
               className="flex gap-6 w-max"
             >
                {[...integrations.reverse(), ...integrations].map((tech, idx) => (
                   <div key={`r2-${idx}`} className="w-48 h-20 glass-card rounded-2xl flex items-center justify-center border border-white/5 text-gray-400 font-heading font-semibold text-lg hover:text-white hover:border-white/20 transition-all">
                      {tech}
                   </div>
                ))}
             </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}