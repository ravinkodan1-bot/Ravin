"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    name: "Rajesh Kumar",
    company: "ChemTech Manufacturing",
    role: "Managing Director",
    content: "SkyNovara completely transformed our operations. We went from manually managing 15 Excel sheets to a fully automated AI dashboard. We saved ₹25L annually and removed all human error from our supply chain.",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Rajesh+Kumar&background=0D8ABC&color=fff",
  },
  {
    name: "Priya Sharma",
    company: "Global Logistics Solutions",
    role: "Operations Head",
    content: "The WhatsApp AI bot SkyNovara built for us handles 500+ client queries a day automatically. Our customer support costs dropped by 60% in the first month. It literally feels like we hired 10 invisible employees.",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Priya+Sharma&background=8B5CF6&color=fff",
  },
  {
    name: "Vikram Desai",
    company: "Desai Real Estate",
    role: "Founder",
    content: "Lead leakage was our biggest problem. Now, the moment a lead comes from Meta, SkyNovara's system texts them, assigns an agent, and follows up indefinitely. Our conversion rate tripled in 45 days.",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Vikram+Desai&background=4F8BFF&color=fff",
  },
];

export function TestimonialsPreview() {
  return (
    <section className="py-24 relative overflow-hidden bg-black">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-skynovara-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-skynovara-primary text-sm font-medium mb-6"
          >
            <Star className="w-4 h-4 fill-skynovara-primary text-skynovara-primary" />
            <span>Client Reviews</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
          >
            Don't Just Take Our Word For It
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400"
          >
            See how traditional businesses scaled to the next level by replacing manual workflows with intelligent AI systems.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className="glass p-8 rounded-2xl border border-white/10 relative group hover:border-skynovara-primary/30 transition-colors"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-white/5 group-hover:text-skynovara-primary/20 transition-colors" />

              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>

              <p className="text-gray-300 mb-8 leading-relaxed">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                  />
                </div>
                <div>
                  <h4 className="text-white font-medium">{testimonial.name}</h4>
                  <p className="text-xs text-gray-400">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
