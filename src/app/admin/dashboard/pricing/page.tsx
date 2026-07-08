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

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: pricing } = await supabase
    .from("pricing")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Pricing Plans</h1>
          <p className="text-muted-foreground mt-1">Manage pricing tiers and features.</p>
        </div>
        <Button className="bg-skynovara-primary hover:bg-skynovara-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Plan
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Tier Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing?.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No pricing plans found.
                  </TableCell>
                </TableRow>
              ) : (
                pricing?.map((plan) => (
                  <TableRow key={plan.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      {plan.tier_name}
                      {plan.is_popular && <Badge className="ml-2 bg-skynovara-primary/20 text-skynovara-primary">Popular</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{plan.price}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_published ? "default" : "secondary"}
                             className={plan.is_published ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                        {plan.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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