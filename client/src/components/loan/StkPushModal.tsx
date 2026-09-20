import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Share2,
  Clock,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { formatKsh } from "@/services/loanService";
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

interface PaymentStatusResponse {
  status:
    | "awaiting_payment"
    | "paid"
    | "failed"
    | "rejected"
    | "cancelled"
    | "not_found"
    | "unknown"
    | "error";

  receiptNumber?: string | null;
  paidAt?: string | null;
  phone?: string | null;
  totalAmount?: number | null;
}

export const StkPushModal: React.FC<StkPushModalProps> = ({
  isOpen,
  onClose,
  phone,
  nationalId,
  amount,
  loanType,
  packageSize,
  onSuccess,
}) => {
  const [phase, setPhase] = useState<
    "pushing" | "waiting" | "processing" | "success" | "failed"
  >("pushing");

  const [countdown, setCountdown] = useState(60);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(
    null
  );

  const [receipt, setReceipt] =
    useState<DisbursementReceipt | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * Start a REAL STK Push when the modal opens.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    setPhase("pushing");
    setCountdown(60);
    setCheckoutRequestId(null);
    setReceipt(null);
    setErrorMessage("");

    const startPayment = async () => {
      try {
        const response = await fetch("/api/web-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone,
            amount,
            packageSize,
            nationalId,
          }),
        });

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.success || !data.checkoutRequestId) {
          const message =
            data.message ||
            "Unable to start the M-Pesa payment request.";

          setErrorMessage(message);
          setPhase("failed");
          toast.error(message);
          return;
        }

        setCheckoutRequestId(data.checkoutRequestId);
        setPhase("waiting");

        toast.success(
          "M-Pesa prompt sent. Check your phone."
        );
      } catch (error) {
        console.error(
          "Web checkout connection error:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            "Could not connect to the payment service."
          );
          setPhase("failed");
          toast.error(
            "Could not connect to the payment service."
          );
        }
      }
    };

    startPayment();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    phone,
    amount,
    packageSize,
    nationalId,
  ]);

  /*
   * Countdown while waiting for the customer to
   * authorize the STK prompt on their handset.
   */
  useEffect(() => {
    if (
      !isOpen ||
      phase !== "waiting"
    ) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setPhase("failed");
          setErrorMessage(
            "The payment authorization window expired."
          );
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, phase]);

  /*
   * Poll the SAME order record that payment-callback updates.
   */
  useEffect(() => {
    if (
      !isOpen ||
      !checkoutRequestId ||
      phase !== "waiting"
    ) {
      return;
    }

    let cancelled = false;
    let pollCount = 0;

    const maxPolls = 20;

    const checkPaymentStatus = async () => {
      pollCount += 1;

      try {
        const response = await fetch(
          `/api/web-checkout/status?checkoutRequestId=${encodeURIComponent(
            checkoutRequestId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data: PaymentStatusResponse =
          await response.json();

        if (cancelled) {
          return;
        }

        if (data.status === "paid") {
          setPhase("processing");

          /*
           * IMPORTANT:
           * The receipt number comes from the database,
           * which was updated by payment-callback.
           */
          const receiptNumber =
            data.receiptNumber ||
            checkoutRequestId;

          const paidAmount =
            Number(data.totalAmount) ||
            amount;

          const paidAt = data.paidAt
            ? new Date(data.paidAt)
            : new Date();

          const newReceipt: DisbursementReceipt = {
            transactionId: checkoutRequestId,

            mpesaReceiptNo: receiptNumber,

            timestamp: paidAt.toLocaleString(
              "en-KE",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            ),

            phone:
              data.phone ||
              phone,

            nationalId:
              nationalId || "",

            loanType:
              loanType ||
              (packageSize === "SECURED"
                ? "Britam Secured Loan"
                : "Limit Multiplier"),

            /*
             * This is the payment amount confirmed by
             * the callback/database. It is NOT a claim
             * that funds have already been disbursed.
             */
            approvedAmount: paidAmount,

            securityFeePaid: paidAmount,

            disbursedAmount: 0,

            repaymentDue: 0,

            repaymentDueDate: "",

            status: "COMPLETED",

            guarantor:
              "Britam Insurance Kenya",
          };

          setReceipt(newReceipt);
          setPhase("success");

          onSuccess(newReceipt);

          toast.success(
            "M-Pesa payment confirmed."
          );

          return;
        }

        if (
          data.status === "failed" ||
          data.status === "rejected" ||
          data.status === "cancelled"
        ) {
          setErrorMessage(
            "The M-Pesa payment was not completed."
          );
          setPhase("failed");

          toast.error(
            "M-Pesa payment was not completed."
          );

          return;
        }

        if (pollCount >= maxPolls) {
          setErrorMessage(
            "We could not confirm the payment within the waiting period."
          );
          setPhase("failed");

          toast.error(
            "Payment confirmation timed out."
          );
        }
      } catch (error) {
        console.error(
          "Payment status check error:",
          error
        );

        /*
         * Do not immediately declare payment failed
         * because a temporary network error does not
         * mean the M-Pesa transaction failed.
         */
      }
    };

    checkPaymentStatus();

    const interval = setInterval(
      checkPaymentStatus,
      3000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    isOpen,
    checkoutRequestId,
    phase,
    amount,
    phone,
    nationalId,
    loanType,
    packageSize,
    onSuccess,
  ]);

  const handleRetry = () => {
    setPhase("pushing");
    setCountdown(60);
    setCheckoutRequestId(null);
    setReceipt(null);
    setErrorMessage("");
  };

  const handleDownloadReceipt = () => {
    /*
     * Keep this as a UI placeholder for now.
     * We can connect it to a real PDF generator later.
     */
    toast.info(
      "Receipt PDF generation can be connected next."
    );
  };

  const handleShareReceipt = async () => {
    if (!receipt) {
      return;
    }

    const text =
      `M-Pesa payment receipt ${receipt.mpesaReceiptNo} ` +
      `for ${formatKsh(receipt.securityFeePaid)}.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Faulu Payment Receipt",
          text,
        });
      } catch {
        // User cancelled sharing.
      }

      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        "Receipt details copied to clipboard."
      );
    } catch {
      toast.error(
        "Unable to copy receipt details."
      );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
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
                  Secure STK payment
                </DialogDescription>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Secure
            </span>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {phase === "pushing" && (
              <motion.div
                key="pushing"
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className="text-center py-8 space-y-4"
              >
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />

                  <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                    <Smartphone className="w-10 h-10 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">
                    Sending M-Pesa Prompt...
                  </h3>

                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    We're sending a secure payment request to
                    your phone.
                  </p>
                </div>

                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
              </motion.div>
            )}

            {phase === "waiting" && (
              <motion.div
                key="waiting"
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="space-y-5"
              >
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      CHECK YOUR PHONE
                    </span>

                    <span className="font-mono">
                      {countdown}s
                    </span>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/20 text-sm space-y-2 shadow-inner">
                    <p className="font-bold text-foreground">
                      An M-Pesa payment prompt has been
                      sent to:
                    </p>

                    <p className="font-mono font-extrabold text-emerald-600">
                      {phone}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Payment amount:
                      {" "}
                      <span className="font-bold text-foreground">
                        {formatKsh(amount)}
                      </span>
                    </p>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-foreground">
                      Complete the authorization on your
                      M-Pesa handset.
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Your M-Pesa PIN is entered on your
                      phone, not on this website.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/60 p-2.5 rounded-xl">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Waiting for payment confirmation...
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-full text-xs text-muted-foreground"
                >
                  Close
                </Button>
              </motion.div>
            )}

            {phase === "processing" && (
              <motion.div
                key="processing"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="text-center py-8 space-y-4"
              >
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">
                    Payment Confirmed
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Preparing your transaction receipt...
                  </p>
                </div>
              </motion.div>
            )}

            {phase === "failed" && (
              <motion.div
                key="failed"
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="text-center py-7 space-y-5"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg">
                    Payment Not Confirmed
                  </h3>

                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {errorMessage ||
                      "The payment could not be confirmed."}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl"
                  >
                    Close
                  </Button>

                  <Button
                    onClick={handleRetry}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === "success" && receipt && (
              <motion.div
                key="success"
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="space-y-4"
              >
                <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-center space-y-1.5 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <h3 className="font-extrabold text-xl text-emerald-950 dark:text-emerald-200">
                    Payment Confirmed
                  </h3>

                  <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 font-medium">
                    Your M-Pesa payment was successfully
                    confirmed.
                  </p>
                </div>

                <div className="p-5 bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-white/60 dark:border-white/10 text-xs space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground font-medium">
                      M-Pesa Receipt:
                    </span>

                    <span className="font-mono font-extrabold text-foreground text-sm">
                      {receipt.mpesaReceiptNo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      Amount Paid:
                    </span>

                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                      {formatKsh(receipt.securityFeePaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      Phone:
                    </span>

                    <span className="font-mono text-foreground font-semibold">
                      {receipt.phone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      Transaction:
                    </span>

                    <span className="font-mono text-foreground font-semibold text-[10px]">
                      {receipt.transactionId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      Time:
                    </span>

                    <span className="text-foreground font-semibold text-right">
                      {receipt.timestamp}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Payment confirmation does not by itself represent
                  a separate loan disbursement. Any disbursement
                  status should come from the application's backend.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReceipt}
                    className="flex-1 text-xs gap-1.5 h-10 rounded-xl font-bold"
                  >
                    <Download className="w-4 h-4" />
                    Receipt
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
                    whileHover={{
                      scale: 1.05,
                    }}
                    whileTap={{
                      scale: 0.95,
                    }}
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
