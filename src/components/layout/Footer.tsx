import Link from "next/link";
import { Mail, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#02040a] pt-20 pb-10 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-skynovara-primary/50 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group inline-block">
              <span className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-skynovara-primary to-skynovara-violet" />
                SkyNovara
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Automate Everything. Scale Without Hiring. We help businesses replace manual workflows with AI systems.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-skynovara-primary hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-skynovara-primary hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-skynovara-primary hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white mb-6">Solutions</h4>
            <ul className="space-y-4">
              {['AI Voice Agents', 'Custom CRM Automation', 'WhatsApp Marketing', 'Business Intelligence', 'ERP Integrations'].map((item) => (
                <li key={item}>
                  <Link href="/services" className="text-sm text-gray-400 hover:text-white hover:pl-1 transition-all flex items-center gap-1 group">
                    {item}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-skynovara-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white mb-6">Company</h4>
            <ul className="space-y-4">
              {['About Us', 'Case Studies', 'Pricing', 'Blog', 'Contact'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-400 hover:text-white hover:pl-1 transition-all">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li>contact@skynovara.com</li>
              <li>+91 98765 43210</li>
              <li className="pt-4">
                 <Link href="/contact" className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-white/10 hover:bg-white/20 text-white h-10 px-4 py-2 w-full">
                    Schedule a Call
                 </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} SkyNovara. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-300">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}