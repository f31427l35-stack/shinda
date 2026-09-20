import React, { useState } from "react";
import { Calculator, ArrowRight, CheckCircle2, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatKsh, LOAN_CATEGORIES } from "@/services/loanService";
import { LoanCategoryType } from "@/types/loan";

export const LoanCalculator: React.FC = () => {
  const [amount, setAmount] = useState(38500);
  const [selectedCategory, setSelectedCategory] = useState<LoanCategoryType>("salary");
  const [durationDays, setDurationDays] = useState(30);

  // Interest rate per category
  const interestRate = selectedCategory === "salary" ? 0.0234 : selectedCategory === "biashara" ? 0.0364 : 0.0623;
  const interest = Math.round(amount * interestRate);
  const totalRepayment = amount + interest;

  return (
    <section id="calculator" className="w-full py-14 glass-panel border-y border-white/40 dark:border-white/10 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold font-mono">
            TRANSPARENT SCHEDULE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Faulu Loan Repayment Calculator
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            No hidden charges, zero paperwork, upfront pricing calculated per Central Bank of Kenya lending guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Controls column */}
          <div className="md:col-span-7 space-y-6 clay-card p-6 md:p-8 border border-white/60 dark:border-white/10">
            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                1. Select Loan Category
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(LOAN_CATEGORIES) as LoanCategoryType[]).map((key) => {
                  const item = LOAN_CATEGORIES[key];
                  const isActive = selectedCategory === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(key);
                        setDurationDays(key === "salary" ? 30 : key === "biashara" ? 45 : 60);
                      }}
                      className={`p-3.5 rounded-2xl text-left border transition-all text-xs cursor-pointer ${
                        isActive
                          ? "border-blue-500 bg-blue-500 text-white font-bold shadow-md"
                          : "border-border bg-white/70 dark:bg-slate-800/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className={`text-[10px] ${isActive ? "text-blue-100" : "text-muted-foreground"}`}>
                        {item.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Principal Amount Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  2. Loan Amount
                </label>
                <span className="font-mono font-extrabold text-xl text-blue-600 dark:text-blue-400">
                  {formatKsh(amount)}
                </span>
              </div>
              <Slider
                value={[amount]}
                min={5000}
                max={50000}
                step={500}
                onValueChange={(val) => setAmount(val[0])}
                className="py-2"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>KSh 5,000</span>
                <span>KSh 25,000</span>
                <span>KSh 50,000</span>
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  3. Repayment Period
                </label>
                <span className="font-mono font-bold text-sm text-foreground">{durationDays} Days</span>
              </div>
              <Slider
                value={[durationDays]}
                min={15}
                max={90}
                step={15}
                onValueChange={(val) => setDurationDays(val[0])}
                className="py-2"
              />
            </div>
          </div>

          {/* Results column */}
          <div className="md:col-span-5 glass-panel rounded-3xl p-6 md:p-8 space-y-6 shadow-xl border border-white/60 dark:border-white/10">
            <h3 className="font-bold text-base text-foreground border-b border-border pb-3">
              Estimated Schedule Summary
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Principal Disbursed:</span>
                <span className="font-mono font-bold text-foreground text-sm">{formatKsh(amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Fixed Processing Interest:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  + {formatKsh(interest)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Security Guarantee:</span>
                <span className="font-bold text-blue-600">Britam Escrow</span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <span className="text-sm font-bold text-foreground">Total Repayable:</span>
                <div className="text-right">
                  <div className="font-mono text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    {formatKsh(totalRepayment)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Due after {durationDays} days</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-500/10 rounded-2xl text-[11px] text-blue-900 dark:text-blue-200 leading-snug font-medium">
              ℹ️ High-risk applicants with CRB rating 504 are approved for guaranteed secured allocations with Britam Insurance security guarantee fee.
            </div>

            <a href="#apply" className="block">
              <button className="w-full py-4 px-6 text-sm font-bold rounded-2xl clay-button-primary cursor-pointer">
                Apply for {formatKsh(amount)} Now
              </button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
