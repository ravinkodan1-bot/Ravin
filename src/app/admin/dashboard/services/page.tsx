import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your automation services.</p>
        </div>
        <Button className="bg-skynovara-primary hover:bg-skynovara-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No services found. Create your first service.
                  </TableCell>
                </TableRow>
              ) : (
                services?.map((service) => (
                  <TableRow key={service.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{service.name}</TableCell>
                    <TableCell className="text-muted-foreground">{service.slug}</TableCell>
                    <TableCell>
                      <Badge variant={service.is_published ? "default" : "secondary"}
                             className={service.is_published ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                        {service.is_published ? "Published" : "Draft"}
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
