import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function CaseStudiesPage() {
  const supabase = await createClient();
  const { data: caseStudies } = await supabase
    .from("case_studies")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Case Studies</h1>
          <p className="text-muted-foreground mt-1">Manage success stories and ROI transformations.</p>
        </div>
        <Button className="bg-skynovara-primary hover:bg-skynovara-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Case Study
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseStudies?.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No case studies found. Create your first case study.
                  </TableCell>
                </TableRow>
              ) : (
                caseStudies?.map((cs) => (
                  <TableRow key={cs.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{cs.title}</TableCell>
                    <TableCell className="text-muted-foreground">{cs.client_name}</TableCell>
                    <TableCell>
                      <Badge variant={cs.is_published ? "default" : "secondary"}
                             className={cs.is_published ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                        {cs.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">Delete</Button>
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
