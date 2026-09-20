import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, PhoneCall, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/40 dark:border-white/10">
      {/* Top micro-bar for regulatory compliance notice */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-[11px] py-1 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 shadow-xs">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Licensed & Regulated by Central Bank of Kenya (CBK)</span>
        <span className="hidden md:inline text-white/50">•</span>
        <span className="hidden md:inline text-white/90">Credit Protection by Britam Insurance</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_2px_3px_rgba(255,255,255,0.4)] transition-transform group-hover:scale-105">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg md:text-xl tracking-tight text-foreground">
                FAULU
              </span>
              <span className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/10">
                Microfinance
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
              Official Digital Lending Portal
            </p>
          </div>
        </Link>

        {/* Center / Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* USSD Code Display (Informational) */}
          <div className="clay-pill hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-500/30 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>USSD: *321*2#</span>
          </div>

          <Link to="/track">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Track Loan
            </Button>
          </Link>

          <a href="#calculator" className="hidden md:inline-block">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Rates Calculator
            </Button>
          </a>

        </div>
      </div>
    </header>
  );
};
