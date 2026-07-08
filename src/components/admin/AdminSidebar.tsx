"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Users,
  Settings,
  HelpCircle,
  FolderKanban,
  ImageIcon,
  LogOut,
  Mail,
  CreditCard
} from "lucide-react";

const navItems = [
  { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/admin/dashboard/leads", icon: Mail },
  { title: "Services", href: "/admin/dashboard/services", icon: Briefcase },
  { title: "Case Studies", href: "/admin/dashboard/case-studies", icon: FolderKanban },
  { title: "Blogs", href: "/admin/dashboard/blogs", icon: FileText },
  { title: "Testimonials", href: "/admin/dashboard/testimonials", icon: MessageSquare },
  { title: "Pricing", href: "/admin/dashboard/pricing", icon: CreditCard },
  { title: "Media Library", href: "/admin/dashboard/media", icon: ImageIcon },
  { title: "FAQs", href: "/admin/dashboard/faqs", icon: HelpCircle },
  { title: "Team / Users", href: "/admin/dashboard/users", icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { title: "Settings", href: "/admin/dashboard/settings", icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export function AdminSidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <span className="font-heading font-bold text-xl text-gradient">SkyNovara</span>
          <span className="text-xs bg-skynovara-primary/20 text-skynovara-primary px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          // Check role based access if defined
          if (item.roles && role && !item.roles.includes(role)) {
            return null;
          }

          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-skynovara-primary/10 text-skynovara-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
         <div className="text-xs text-muted-foreground px-3 mb-2">Logged in as: {role || 'USER'}</div>
      </div>
    </aside>
  );
}
