import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Receipt, ShieldCheck, CheckCircle2, ArrowLeft, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getDisbursementRecords, formatKsh } from "@/services/loanService";
import { DisbursementReceipt } from "@/types/loan";
import { toast } from "sonner";

export default function TrackApplicationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<DisbursementReceipt[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DisbursementReceipt[]>([]);

  useEffect(() => {
    const data = getDisbursementRecords();
    setRecords(data);
    setFilteredRecords(data);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredRecords(records);
      return;
    }
    const query = searchTerm.toLowerCase().trim();
    const results = records.filter(
      (r) =>
        r.mpesaReceiptNo.toLowerCase().includes(query) ||
        r.phone.includes(query) ||
        r.nationalId.includes(query) ||
        r.transactionId.toLowerCase().includes(query)
    );
    setFilteredRecords(results);
    if (results.length === 0) {
      toast.info("No matching records found. Make an application to see real-time updates.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="ambient-glow-mesh">
        <div className="glow-orb-blue top-[10%] left-[5%]" />
        <div className="glow-orb-emerald bottom-[10%] right-[10%]" />
      </div>

      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8 z-10">
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home Portal
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Track Loan Application & Receipts
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            Look up your loan approval status, M-Pesa receipt verification, and Britam guarantee certificate.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by M-Pesa Code (e.g. Q982...), National ID, or Mobile Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-5 text-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl border-2 border-white/60 dark:border-white/10 shadow-inner"
            />
          </div>
          <button type="submit" className="clay-button-primary px-7 py-3 rounded-2xl font-bold text-xs shrink-0 cursor-pointer">
            Search
          </button>
        </form>

        {/* Results List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Disbursement History ({filteredRecords.length} records)</span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Central Sync: Live</span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="glass-panel p-10 text-center space-y-4 rounded-3xl border border-white/60 dark:border-white/10 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-lg text-foreground">
                No Loan Records Found
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                You haven't completed any loan applications in this browser yet. Check your qualification on the homepage to start.
              </p>
              <Link to="/" className="inline-block pt-1">
                <button className="clay-button-primary px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  Apply for Loan Now
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((item, idx) => (
                <div key={idx} className="glass-panel rounded-3xl border border-white/60 dark:border-white/10 shadow-md overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
                  <div className="p-5 space-y-4">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-mono font-bold">
                            {item.mpesaReceiptNo}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {item.loanType}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 font-medium">
                          Disbursed on {item.timestamp}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        DISBURSED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-white/60 dark:border-white/10 text-xs shadow-inner">
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">Approved Amount</span>
                        <span className="font-mono font-extrabold text-foreground text-base text-emerald-600">
                          {formatKsh(item.approvedAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">Security Fee</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatKsh(item.securityFeePaid)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">M-Pesa Mobile</span>
                        <span className="font-mono text-foreground font-semibold">{item.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">Guarantor</span>
                        <span className="text-foreground font-semibold">{item.guarantor}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("Receipt PDF downloaded")}
                        className="text-xs gap-1.5 h-9 rounded-xl font-bold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(item.mpesaReceiptNo);
                          toast.success("Receipt code copied!");
                        }}
                        className="text-xs gap-1.5 h-9 rounded-xl font-bold"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
