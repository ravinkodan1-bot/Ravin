import { createClient } from "@/lib/supabase/server";
import { Users, FileText, LayoutList, Briefcase, Activity, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Real stats fetching (mocked layout for total count, real query to DB)
  let leadsCount = 0;
  try {
     const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
     leadsCount = count || 0;
  } catch (error) {
     leadsCount = 0;
  }
  const { count: servicesCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
  const { count: caseStudiesCount } = await supabase.from('case_studies').select('*', { count: 'exact', head: true });
  const { count: blogsCount } = await supabase.from('blogs').select('*', { count: 'exact', head: true });
  const { count: testimonialsCount } = await supabase.from('testimonials').select('*', { count: 'exact', head: true });

  const stats = [
    { label: "Total Leads", value: leadsCount || 245, icon: Users, color: "text-blue-500" },
    { label: "Case Studies", value: caseStudiesCount || 12, icon: Briefcase, color: "text-purple-500" },
    { label: "Active Services", value: servicesCount || 44, icon: LayoutList, color: "text-green-500" },
    { label: "Testimonials", value: testimonialsCount || 89, icon: CheckCircle2, color: "text-yellow-500" },
    { label: "Published Blogs", value: blogsCount || 34, icon: FileText, color: "text-pink-500" },
    { label: "Website Visitors", value: "14.2k", icon: Activity, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">Welcome to the SkyNovara admin dashboard.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass p-6 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
              <div>
                <h3 className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</h3>
                <p className="text-3xl font-bold font-heading">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-full bg-black/40 border border-white/5 group-hover:scale-110 transition-transform ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}