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

export default async function FAQsPage() {
  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">FAQs</h1>
          <p className="text-muted-foreground mt-1">Manage frequently asked questions.</p>
        </div>
        <Button className="bg-skynovara-primary hover:bg-skynovara-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add FAQ
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs?.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No FAQs found.
                  </TableCell>
                </TableRow>
              ) : (
                faqs?.map((faq) => (
                  <TableRow key={faq.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white max-w-md truncate" title={faq.question}>{faq.question}</TableCell>
                    <TableCell className="text-muted-foreground">{faq.category || "General"}</TableCell>
                    <TableCell>
                      <Badge variant={faq.is_published ? "default" : "secondary"}
                             className={faq.is_published ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                        {faq.is_published ? "Published" : "Draft"}
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