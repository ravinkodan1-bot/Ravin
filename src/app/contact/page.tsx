"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    mobileNumber: "",
    whatsappNumber: "",
    email: "",
    industry: "",
    companySize: "",
    city: "",
    currentSoftware: "",
    automationRequirement: "",
    budget: "",
    preferredContactMethod: "",
    message: ""
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SCRIPT_URL) {
      toast.error("Form submission URL not configured.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, source: "Website" }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setSuccess(true);
        // Reset form or keep as is for success screen
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      // Sometimes fetch fails due to CORS if Apps Script isn't set up perfectly for preflight,
      // but the POST might still succeed. We will show generic error if fetch actually throws.
      console.error(error);
      toast.error("Network error. Please try again or contact us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-skynovara-dark relative">
      <div className="absolute inset-0 bg-aurora opacity-30 pointer-events-none" />
      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Let's Automate <span className="text-gradient">Your Business</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Fill out the form below to get a free automation audit. Our experts will analyze your workflows and show you how to save time and increase revenue.
            </p>
          </div>

          <div className="glass-card p-8 md:p-12 rounded-3xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-heading font-bold text-white mb-4">Request Received!</h2>
                  <p className="text-gray-400 text-lg max-w-md mx-auto mb-8">
                    Thank you! Our automation experts are reviewing your details and will contact you shortly to schedule your free audit.
                  </p>
                  <Button onClick={() => setSuccess(false)} variant="outline" className="border-white/20 text-white">
                    Submit Another Request
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-300">Full Name *</Label>
                      <Input id="fullName" required value={formData.fullName} onChange={(e) => handleChange("fullName", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-gray-300">Company Name *</Label>
                      <Input id="companyName" required value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Work Email *</Label>
                      <Input id="email" type="email" required value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber" className="text-gray-300">Mobile Number *</Label>
                      <Input id="mobileNumber" required value={formData.mobileNumber} onChange={(e) => handleChange("mobileNumber", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber" className="text-gray-300">WhatsApp Number</Label>
                      <Input id="whatsappNumber" value={formData.whatsappNumber} onChange={(e) => handleChange("whatsappNumber", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300">City</Label>
                      <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} className="bg-black/40 border-white/10 text-white h-12" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Industry *</Label>
                      <Select required onValueChange={(v: string | null) => v && handleChange("industry", v)}>
                        <SelectTrigger className="bg-black/40 border-white/10 text-white h-12">
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A1028] border-white/10 text-white">
                          {["Manufacturing", "Chemical", "Trading", "Import/Export", "Retail", "Healthcare", "Real Estate", "Logistics", "Agency", "Other"].map(i => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Company Size</Label>
                      <Select onValueChange={(v: string | null) => v && handleChange("companySize", v)}>
                        <SelectTrigger className="bg-black/40 border-white/10 text-white h-12">
                          <SelectValue placeholder="Select Size" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A1028] border-white/10 text-white">
                          {["1-10", "11-50", "51-200", "201-500", "500+"].map(i => (
                            <SelectItem key={i} value={i}>{i} Employees</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Budget Range</Label>
                      <Select onValueChange={(v: string | null) => v && handleChange("budget", v)}>
                        <SelectTrigger className="bg-black/40 border-white/10 text-white h-12">
                          <SelectValue placeholder="Select Budget" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A1028] border-white/10 text-white">
                          {["₹30,000 - ₹1L", "₹1L - ₹5L", "₹5L - ₹10L", "₹10L+"].map(i => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="automationRequirement" className="text-gray-300">What processes do you want to automate? *</Label>
                    <Textarea id="automationRequirement" required placeholder="e.g., Lead generation, invoice processing, inventory tracking..." value={formData.automationRequirement} onChange={(e) => handleChange("automationRequirement", e.target.value)} className="bg-black/40 border-white/10 text-white min-h-[100px]" />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-14 text-lg bg-gradient-to-r from-skynovara-primary to-skynovara-violet text-white hover:opacity-90 transition-opacity rounded-xl font-semibold">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                    {loading ? "Submitting Request..." : "Request Free Audit"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
