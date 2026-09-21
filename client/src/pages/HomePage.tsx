import React from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  Award, 
  Users, 
  CheckCircle2, 
  Clock, 
  Lock, 
  TrendingUp,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FauluLoanWizard } from "@/components/loan/FauluLoanWizard";
import { RecentDisbursements } from "@/components/loan/RecentDisbursements";
import { LoanCalculator } from "@/components/loan/LoanCalculator";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Ambient glowing gradient mesh orbs in background */}
      <div className="ambient-glow-mesh">
        <div className="glow-orb-blue top-[-100px] left-[-100px]" />
        <div className="glow-orb-emerald top-[300px] right-[-150px]" />
        <div className="glow-orb-purple bottom-[200px] left-[15%]" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-8 pb-12 md:pt-14 md:pb-16 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Express Digital Microfinance & M-Pesa Gateway</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-tight">
              Instant M-Pesa Loans with <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Britam Credit Shield</span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
              Check your eligibility in seconds. Access up to <strong className="text-foreground font-bold">KSh 38,500</strong> with automated M-Pesa release, CRB 504 risk protection underwritten by Britam, or use our secure online portal from any smartphone or computer.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <div className="clay-pill px-4 py-2 rounded-2xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Web Portal: Apply Online</span>
              </div>
              <Link to="/track">
                <Button variant="ghost" size="sm" className="text-xs font-semibold">
                  Lookup Existing Application
                </Button>
              </Link>
            </div>
          </div>

          {/* Centerpiece: Faulu Loan Wizard Card */}
          <div id="apply" className="my-6">
            <FauluLoanWizard />
          </div>
        </div>
      </section>

      {/* Live Disbursements Ticker */}
      <RecentDisbursements />

      {/* Why Choose Faulu 4-Pillar Grid with Glass Cards */}
      <section className="py-14 px-4 sm:px-6 max-w-7xl mx-auto w-full z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-600 font-bold">
            TRUSTED MICROFINANCE
          </Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Why Over 450,000 Kenyans Choose Faulu
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Combining regulated traditional banking stability with instant mobile money disbursement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-3xl space-y-3 hover:translate-y-[-4px] transition-all shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Instant M-Pesa Release
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated disbursement straight to your Safaricom M-Pesa line within 60 seconds of PIN authorization.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-3 hover:translate-y-[-4px] transition-all shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Britam Underwritten
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Guaranteed credit protection for CRB 504 risk profiles. No collateral or physical paperwork required.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-3 hover:translate-y-[-4px] transition-all shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              4x Limit Multiplier
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every on-time repayment multiplies your credit limit up to 4 times within 30 days of active participation.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-3 hover:translate-y-[-4px] transition-all shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Secure Online Access
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Apply securely through our responsive modern web portal with a simple digital application process.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Loan Calculator Component */}
      <LoanCalculator />

      {/* Frequently Asked Questions */}
      <section className="py-14 px-4 sm:px-6 max-w-4xl mx-auto w-full z-10">
        <div className="text-center mb-8 space-y-2">
          <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-600 font-bold">
            FAQ & SUPPORT
          </Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Got questions about Faulu loans, CRB scores, or M-Pesa payments?
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          <AccordionItem value="item-1" className="glass-panel rounded-2xl px-5 border-none shadow-sm">
            <AccordionTrigger className="text-sm font-bold text-foreground py-4 hover:no-underline">
              How does the Britam Loan Security Guarantee work for CRB 504 scores?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
              If your CRB credit bureau score is evaluated at 504 (Risky Loan status due to existing outstanding loans), Faulu partners with Britam Insurance Kenya to secure your allocation. By paying the nominal loan security fee (KSh 465), Britam underwrites your default risk, allowing us to instantly release KSh 22,500 to your M-Pesa.
            </AccordionContent>
          </AccordionItem>


          <AccordionItem value="item-3" className="glass-panel rounded-2xl px-5 border-none shadow-sm">
            <AccordionTrigger className="text-sm font-bold text-foreground py-4 hover:no-underline">
              What is the 4x Multiplier Limit Booster?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
              The 4x multiplier program rewards proactive credit builders. By contributing or repaying monthly installments (e.g., KSh 1,000), you automatically qualify for a 4x higher credit allocation (KSh 4,000) within 30 days.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="glass-panel rounded-2xl px-5 border-none shadow-sm">
            <AccordionTrigger className="text-sm font-bold text-foreground py-4 hover:no-underline">
              How fast are funds disbursed to M-Pesa?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
              All approved funds are sent via Safaricom B2C M-Pesa API within 60 seconds after the security fee STK prompt is authorized with your M-Pesa PIN.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Footer />
    </div>
  );
}
