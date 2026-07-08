"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

export function AdminHeader({ user, profile }: { user: any; profile: any }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "A";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-4 md:hidden">
        <Sheet>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-skynovara-dark border-r border-white/10">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            {/* We can duplicate sidebar logic here or extract the nav items to a shared component */}
            <div className="p-4 border-b border-white/10">
                <span className="font-heading font-bold text-xl text-gradient">SkyNovara</span>
            </div>
            {/* Quick mobile nav placeholder */}
            <div className="p-4 text-sm text-muted-foreground">Please use desktop for full admin experience.</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block">
        {/* Breadcrumbs or Page Title could go here */}
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarFallback className="bg-skynovara-primary/20 text-skynovara-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#0A1028] border-white/10" align="end" >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.full_name || "Admin User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}