"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ROICalculator() {
  const [employees, setEmployees] = useState(5);
  const [avgSalary, setAvgSalary] = useState(25000);
  const [manualTimePercent, setManualTimePercent] = useState(40);

  // Calculations
  const totalMonthlyPayroll = employees * avgSalary;
  const costOfManualWorkMonthly = totalMonthlyPayroll * (manualTimePercent / 100);
  const costOfManualWorkYearly = costOfManualWorkMonthly * 12;

  // Assume SkyNovara automation saves 80% of that manual time, costing a flat or average fee
  const estimatedSavingsYearly = costOfManualWorkYearly * 0.8;
  const hoursSavedMonthly = employees * 160 * (manualTimePercent / 100) * 0.8; // assuming 160 work hours/mo

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section className="py-24 relative overflow-hidden bg-skynovara-dark">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">

          {/* Left: Controls */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-skynovara-primary/10 border border-skynovara-primary/20 text-skynovara-primary text-sm font-medium mb-6"
            >
              <Calculator className="w-4 h-4" />
              ROI Calculator
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
            >
              See How Much You're <br/> <span className="text-red-400">Bleeding.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 mb-10"
            >
              Adjust the sliders below to see exactly how much money and time you are losing to manual data entry, reporting, and follow-ups every year.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex justify-between">
                   <label className="text-sm font-medium text-gray-300">Number of Employees (Admin/Ops)</label>
                   <span className="text-sm font-bold text-white">{employees}</span>
                </div>
                <Slider
                  min={1} max={50} step={1}
                  value={[employees]}
                  onValueChange={(val: number | readonly number[]) => setEmployees(Array.isArray(val) ? val[0] : (val as number))}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                   <label className="text-sm font-medium text-gray-300">Avg Monthly Salary (₹)</label>
                   <span className="text-sm font-bold text-white">{formatCurrency(avgSalary)}</span>
                </div>
                <Slider
                  min={10000} max={100000} step={1000}
                  value={[avgSalary]}
                  onValueChange={(val: number | readonly number[]) => setAvgSalary(Array.isArray(val) ? val[0] : (val as number))}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                   <label className="text-sm font-medium text-gray-300">% Time Spent on Repetitive Tasks</label>
                   <span className="text-sm font-bold text-white">{manualTimePercent}%</span>
                </div>
                <Slider
                  min={10} max={90} step={5}
                  value={[manualTimePercent]}
                  onValueChange={(val: number | readonly number[]) => setManualTimePercent(Array.isArray(val) ? val[0] : (val as number))}
                  className="py-2"
                />
              </div>
            </motion.div>
          </div>

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
             <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full pointer-events-none" />

                <h3 className="text-2xl font-heading font-semibold text-white mb-8">Your Automation Potential</h3>

                <div className="space-y-6 mb-10">
                   <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                      <div className="text-sm text-gray-400 mb-2">Cost of Manual Work (Yearly)</div>
                      <div className="text-3xl md:text-4xl font-bold text-red-400">{formatCurrency(costOfManualWorkYearly)}</div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                        <div className="text-sm text-gray-400 mb-2">Estimated Savings/Yr</div>
                        <div className="text-2xl font-bold text-green-400">{formatCurrency(estimatedSavingsYearly)}</div>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                        <div className="text-sm text-gray-400 mb-2">Hours Saved/Mo</div>
                        <div className="text-2xl font-bold text-skynovara-primary">{Math.round(hoursSavedMonthly)} hrs</div>
                      </div>
                   </div>
                </div>

                <Link href="/contact" className="block w-full">
                  <Button className="w-full h-14 bg-gradient-to-r from-skynovara-primary to-skynovara-violet hover:opacity-90 text-white rounded-xl text-lg font-semibold group">
                    Stop Bleeding Money
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}