import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Check, X } from "lucide-react";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Testimonials</h1>
          <p className="text-muted-foreground mt-1">Manage and approve client reviews.</p>
        </div>
        <Button className="bg-skynovara-primary hover:bg-skynovara-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Testimonial
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonials?.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No testimonials found.
                  </TableCell>
                </TableRow>
              ) : (
                testimonials?.map((t) => (
                  <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div className="font-medium text-white">{t.client_name}</div>
                      <div className="text-xs text-muted-foreground">{t.company}</div>
                    </TableCell>
                    <TableCell className="text-yellow-500">{"★".repeat(t.rating || 5)}{"☆".repeat(5 - (t.rating || 5))}</TableCell>
                    <TableCell>
                       <Badge variant="outline" className="border-white/10 text-muted-foreground">
                         {t.source}
                       </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'APPROVED' ? "default" : t.status === 'PENDING' ? "secondary" : "destructive"}
                             className={
                               t.status === 'APPROVED' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                               t.status === 'PENDING' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : ""
                             }>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {t.status === 'PENDING' && (
                        <>
                           <Button variant="ghost" size="icon" className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-8 w-8" title="Approve">
                             <Check className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8" title="Reject">
                             <X className="h-4 w-4" />
                           </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
