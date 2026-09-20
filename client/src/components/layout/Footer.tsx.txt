import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, PhoneCall, Mail, MapPin, ExternalLink, Lock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full glass-panel border-t border-white/40 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Regulatory Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md">
                F
              </div>
              <span className="font-extrabold text-lg text-foreground tracking-tight">
                Faulu Microfinance
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Kenya's leading regulated microfinance bank, empowering individuals, micro-enterprises, and communities with fast digital credit solutions.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Regulated by Central Bank of Kenya</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-foreground tracking-wider uppercase block text-xs">
              Loan Products
            </span>
            <ul className="space-y-2 text-muted-foreground font-medium">
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  Express Salary Loan (KSh 38,500)
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  Biashara Business Booster
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  Emergency Medical & School Fees
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  4x Multiplier Repayment Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Access Channels */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-foreground tracking-wider uppercase block text-xs">
              Direct Channels
            </span>
            <ul className="space-y-2 text-muted-foreground font-medium">
              <li className="font-mono text-primary font-bold">
                USSD Dial Code: *321*2#
              </li>
              <li>
                <Link to="/track" className="hover:text-foreground transition-colors">
                  Track Application & Receipts
                </Link>
              </li>
              <li>
                <a href="#calculator" className="hover:text-foreground transition-colors">
                  Transparent Rates Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Security */}
          <div className="space-y-3 text-xs">
            <span className="font-bold text-foreground tracking-wider uppercase block text-xs">
              Contact & Support
            </span>
            <div className="space-y-2 text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-primary" />
                <span>+254 711 074 000 / 020 387 7290</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>info@faulukenya.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Faulu Complex, Ngong Lane, Nairobi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
          <p>© {new Date().getFullYear()} Faulu Microfinance Bank Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              Safaricom Daraja SSL
            </span>
            <span>•</span>
            <span>Britam Underwritten</span>
            <span>•</span>
            <span>CRB Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
