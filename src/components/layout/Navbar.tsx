"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Services", href: "/services" },
  { name: "Case Studies", href: "/case-studies" },
  { name: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-black/40 backdrop-blur-xl border-b border-white/10 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="relative z-10 flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-skynovara-primary to-skynovara-violet flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
               <span className="font-bold text-white text-lg leading-none">S</span>
            </div>
            <span className="text-xl font-heading font-bold text-white tracking-tight">
              SkyNovara
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-skynovara-primary to-skynovara-violet transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/contact">
              <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-medium transition-transform hover:scale-105">
                Book Free Audit
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden relative z-10 p-2 text-gray-300 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-skynovara-dark/95 backdrop-blur-xl border-b border-white/10 p-6 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-gray-300 hover:text-white py-2 border-b border-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="mt-4">
                <Button className="w-full bg-gradient-to-r from-skynovara-primary to-skynovara-violet text-white rounded-full">
                  Book Free Audit
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}