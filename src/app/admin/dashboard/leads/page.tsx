"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Mail, Phone, Calendar } from "lucide-react";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Note: Ensure this environment variable matches the deployed Apps Script URL
const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

interface Lead {
  ID: string;
  Timestamp: string;
  "Full Name": string;
  "Company Name": string;
  Email: string;
  "Mobile Number": string;
  "WhatsApp Number": string;
  Industry: string;
  "Company Size": string;
  City: string;
  "Current Software": string;
  "Automation Requirement": string;
  Budget: string;
  "Preferred Contact Method": string;
  Message: string;
  Source: string;
  Status: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Fetch securely through our Next.js API route proxy
      const res = await fetch('/api/admin/leads');
      const result = await res.json();

      if (res.ok && result.status === "success" && Array.isArray(result.data)) {
        // Reverse to show newest first assuming chronological insertion
        setLeads(result.data.reverse());
      } else {
        toast.error(result.message || result.error || "Failed to load leads");
        console.error("Failed to fetch leads or unauthorized:", result);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      toast.error("Failed to connect to backend proxy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "contacted":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "qualified":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "won":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "lost":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Contact Leads</h1>
          <p className="text-muted-foreground mt-1">Manage leads directly from Google Sheets.</p>
        </div>
        <Button
          onClick={fetchLeads}
          disabled={loading}
          variant="outline"
          className="border-white/10 hover:bg-white/5"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh Leads
        </Button>
      </div>

      <Card className="bg-black/20 border-white/10 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-skynovara-primary" />
                    <p className="text-muted-foreground mt-2 text-sm">Fetching leads from Google Sheets...</p>
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No leads found. Ensure the web app URL is correct.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, idx) => (
                  <TableRow key={lead.ID || idx} className="border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(lead.Timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{lead["Full Name"]}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" /> {lead.Email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-white">{lead["Company Name"]}</div>
                      <div className="text-xs text-muted-foreground">{lead.Industry}</div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[200px] text-sm text-gray-300" title={lead["Automation Requirement"]}>
                        {lead["Automation Requirement"] || "Not specified"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(lead.Status)}>
                        {lead.Status || "New"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-skynovara-primary hover:text-skynovara-primary/80 hover:bg-skynovara-primary/10">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="bg-[#0A1028] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading">Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contact Information</h4>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{selectedLead["Full Name"]}</p>
                    <p className="flex items-center gap-2 text-sm text-gray-300"><Mail className="w-4 h-4 text-skynovara-primary"/> {selectedLead.Email}</p>
                    <p className="flex items-center gap-2 text-sm text-gray-300"><Phone className="w-4 h-4 text-skynovara-primary"/> {selectedLead["Mobile Number"]}</p>
                    <p className="flex items-center gap-2 text-sm text-gray-300"><Calendar className="w-4 h-4 text-skynovara-primary"/> Submitted: {new Date(selectedLead.Timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1 mt-6">Company Details</h4>
                  <div className="space-y-1">
                    <p className="text-sm"><span className="text-gray-400">Company:</span> {selectedLead["Company Name"]}</p>
                    <p className="text-sm"><span className="text-gray-400">Industry:</span> {selectedLead.Industry}</p>
                    <p className="text-sm"><span className="text-gray-400">Size:</span> {selectedLead["Company Size"]}</p>
                    <p className="text-sm"><span className="text-gray-400">City:</span> {selectedLead.City}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Details</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Requirement</p>
                      <p className="text-sm bg-black/30 p-2 rounded border border-white/5 mt-1">{selectedLead["Automation Requirement"] || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Budget</p>
                      <p className="text-sm font-medium text-green-400">{selectedLead.Budget || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Message</p>
                      <p className="text-sm bg-black/30 p-2 rounded border border-white/5 mt-1 whitespace-pre-wrap">{selectedLead.Message || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 pt-4 border-t border-white/10 flex justify-end gap-3">
                 <Button variant="outline" className="border-white/10 hover:bg-white/5">Update Status in Sheet</Button>
                 <Button onClick={() => setSelectedLead(null)} className="bg-white text-black hover:bg-gray-200">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
