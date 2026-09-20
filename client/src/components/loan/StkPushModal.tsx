import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Download, 
  Share2, 
  ArrowRight,
  Receipt,
  Clock,
  RotateCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  formatKsh, 
  generateMpesaCode, 
  saveDisbursementRecord 
} from "@/services/loanService";
import { DisbursementReceipt } from "@/types/loan";

interface StkPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  nationalId: string;
  amount: number;
  loanType: string;
  packageSize: "SECURED" | "MIN";
  onSuccess: (receipt: DisbursementReceipt) => void;
}

export const StkPushModal: React.FC<StkPushModalProps> = ({
  isOpen,
  onClose,
  phone,
  nationalId,
  amount,
  loanType,
  packageSize,
  onSuccess
}) => {
  const [phase, setPhase] = useState<"pushing" | "pin_prompt" | "processing" | "success" | "failed">("pushing");
  const [pin, setPin] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [receipt, setReceipt] = useState<DisbursementReceipt | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("pushing");
      setPin("");
      setCountdown(30);
      setReceipt(null);

      // Auto trigger simulated STK push display after 1.5s
      const timer = setTimeout(() => {
        setPhase("pin_prompt");
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Countdown timer during STK push
  useEffect(() => {
    if (!isOpen || (phase !== "pushing" && phase !== "pin_prompt")) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, phase]);

  const handleAuthorizePin = () => {
    if (pin.length !== 4 && pin.length > 0 && !/^\d{4}$/.test(pin)) {
      toast.error("Please enter a valid 4-digit M-Pesa PIN");
      return;
    }

    setPhase("processing");

    setTimeout(() => {
      const isApprovedSecured = packageSize === "SECURED";
      const approvedAmt = isApprovedSecured ? 22500 : (amount * 4);
      const mpesaCode = generateMpesaCode();

      const newReceipt: DisbursementReceipt = {
        transactionId: "TXN-" + Date.now().toString(36).toUpperCase(),
        mpesaReceiptNo: mpesaCode,
        timestamp: new Date().toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        phone: phone || "0722000000",
        nationalId: nationalId || "12345678",
        loanType: loanType || (isApprovedSecured ? "Britam Secured Loan" : "Limit Multiplier"),
        approvedAmount: approvedAmt,
        securityFeePaid: amount,
        disbursedAmount: isApprovedSecured ? 22500 : 0,
        repaymentDue: isApprovedSecured ? 23200 : 0,
        repaymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        status: "COMPLETED",
        guarantor: "Britam Insurance Kenya"
      };

      saveDisbursementRecord(newReceipt);
      setReceipt(newReceipt);
      setPhase("success");
      onSuccess(newReceipt);
      toast.success("M-Pesa payment confirmed! Loan release initiated.");
    }, 2200);
  };

  const handleDownloadReceipt = () => {
    toast.success("Receipt downloaded as PDF format");
  };

  const handleShareReceipt = () => {
    if (navigator.share && receipt) {
      navigator.share({
        title: "Faulu Microfinance Loan Receipt",
        text: `Faulu Loan Receipt ${receipt.mpesaReceiptNo} for ${formatKsh(receipt.approvedAmount)} approved.`
      }).catch(() => {});
    } else {
      toast.info("Transaction code copied to clipboard!");
      navigator.clipboard.writeText(receipt?.mpesaReceiptNo || "");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden border border-white/60 dark:border-white/10 glass-panel rounded-3xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-[0_4px_12px_rgba(16,185,129,0.35)]">
                M
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  M-PESA Direct Checkout
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium">
                  Safaricom Daraja Express STK Gateway
                </DialogDescription>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Secured 256-Bit
            </span>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* PHASE 1: PUSH IN PROGRESS */}
            {phase === "pushing" && (
              <motion.div
                key="pushing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                    <Smartphone className="w-10 h-10 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">
                    Sending STK Prompt...
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Please check your phone <span className="font-mono font-bold text-foreground">{phone}</span> for the Safaricom M-Pesa PIN prompt.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/60 p-2.5 rounded-xl">
                  <Clock className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Prompt expires in {countdown}s</span>
                </div>
              </motion.div>
            )}

            {/* PHASE 2: SIMULATED ON-SCREEN M-PESA PIN PROMPT */}
            {phase === "pin_prompt" && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Simulated Phone Screen Dialog Box */}
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-4 shadow-md">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      SIMULATED SAFARICOM STK PROMPT
                    </span>
                    <span className="font-mono">{countdown}s</span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/20 text-xs space-y-1 font-mono shadow-inner">
                    <p className="font-bold text-foreground">
                      Do you want to pay {formatKsh(amount)} to FAULU MICROFINANCE (Britam Escrow)?
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Account: {packageSize === "SECURED" ? "LOAN-SEC-GUARANTEE" : "REPAY-BOOST"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground block">
                      Enter M-Pesa PIN (Simulate approval):
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        className="text-center font-mono tracking-widest text-lg bg-white dark:bg-slate-900 rounded-xl"
                        autoFocus
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAuthorizePin}
                        className="clay-button-emerald px-6 py-2.5 rounded-xl font-bold text-sm shrink-0 cursor-pointer"
                      >
                        Authorize
                      </motion.button>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">
                      Tip: Enter any 4 digits or click Authorize to simulate prompt completion.
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel Transaction
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE 3: PROCESSING WITH SAFARICOM GATEWAY */}
            {phase === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 space-y-4"
              >
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">
                    Verifying Transaction with Safaricom & Britam...
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Securing credit underwriting and authorizing instant funds release.
                  </p>
                </div>
              </motion.div>
            )}

            {/* PHASE 4: SUCCESS RECEIPT */}
            {phase === "success" && receipt && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-center space-y-1.5 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-xl text-emerald-950 dark:text-emerald-200">
                    Disbursement Authorized!
                  </h3>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 font-medium">
                    Funds release to M-Pesa account <span className="font-mono font-bold">{phone}</span> is active.
                  </p>
                </div>

                {/* Printable Official Receipt Card */}
                <div className="p-5 bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-white/60 dark:border-white/10 text-xs space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground font-medium">Receipt No:</span>
                    <span className="font-mono font-extrabold text-foreground text-sm">{receipt.mpesaReceiptNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Disbursed Amount:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">{formatKsh(receipt.approvedAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Security Guarantee Paid:</span>
                    <span className="font-mono font-bold text-foreground">{formatKsh(receipt.securityFeePaid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Beneficiary ID:</span>
                    <span className="font-mono text-foreground font-semibold">{receipt.nationalId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Underwriter:</span>
                    <span className="text-foreground font-semibold">{receipt.guarantor}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground font-medium">Repayment Due Date:</span>
                    <span className="font-bold text-foreground">{receipt.repaymentDueDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReceipt}
                    className="flex-1 text-xs gap-1.5 h-10 rounded-xl font-bold"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareReceipt}
                    className="flex-1 text-xs gap-1.5 h-10 rounded-xl font-bold"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="clay-button-primary px-6 h-10 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Done
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
