import React, { useState, useEffect } from "react";
import { CheckCircle2, Shield, Smartphone, Zap } from "lucide-react";
import { formatKsh } from "@/services/loanService";

interface DisbursementItem {
  id: string;
  phone: string;
  amount: number;
  time: string;
  county: string;
  type: string;
}

// Counties across Kenya for realistic geographic distribution
const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", 
  "Thika", "Meru", "Nyeri", "Machakos", "Kisii", 
  "Kakamega", "Kitale", "Naivasha", "Kericho", "Garissa"
];

const LOAN_TYPES = [
  "Salary Fast Loan",
  "Biashara Booster",
  "Britam Secured Loan",
  "Emergency Credit",
  "Pre-Approved Limit"
];

// Generate random amount between KSh 22,500 (CRB secured) and KSh 38,500 (Original full limit)
function generateRandomAmount(): number {
  const min = 22500;
  const max = 38500;
  // Step by 100 or 500 for realistic Kenyan loan disbursements
  const step = 500;
  const steps = Math.floor((max - min) / step);
  const randomStep = Math.floor(Math.random() * (steps + 1));
  return min + randomStep * step;
}

// Generate random Kenyan mobile number
function generateRandomKenyanPhone(): string {
  const prefixes = ["0722", "0721", "0712", "0714", "0790", "0798", "0745", "0701", "0708", "0110", "0112", "0728", "0792"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(100 + Math.random() * 900); // 3 digits
  return `${prefix}***${suffix}`;
}

export const RecentDisbursements: React.FC = () => {
  const [transactions, setTransactions] = useState<DisbursementItem[]>([
    { id: "1", phone: "0722***412", amount: 38500, time: "Just now", county: "Nairobi", type: "Salary Fast Loan" },
    { id: "2", phone: "0714***889", amount: 22500, time: "1 min ago", county: "Mombasa", type: "Britam Secured Loan" },
    { id: "3", phone: "0790***120", amount: 31000, time: "2 mins ago", county: "Nakuru", type: "Biashara Booster" },
    { id: "4", phone: "0745***671", amount: 26500, time: "3 mins ago", county: "Eldoret", type: "Britam Secured Loan" },
    { id: "5", phone: "0701***334", amount: 38500, time: "4 mins ago", county: "Kisumu", type: "Emergency Credit" },
    { id: "6", phone: "0112***941", amount: 24500, time: "5 mins ago", county: "Thika", type: "Britam Secured Loan" },
    { id: "7", phone: "0728***510", amount: 35000, time: "6 mins ago", county: "Nyeri", type: "Biashara Booster" },
    { id: "8", phone: "0792***723", amount: 22500, time: "7 mins ago", county: "Machakos", type: "Britam Secured Loan" },
    { id: "9", phone: "0710***198", amount: 38500, time: "8 mins ago", county: "Meru", type: "Salary Fast Loan" },
    { id: "10", phone: "0708***664", amount: 28000, time: "9 mins ago", county: "Kisii", type: "Pre-Approved Limit" }
  ]);

  // Dynamically inject new live disbursements periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newItem: DisbursementItem = {
        id: Date.now().toString(),
        phone: generateRandomKenyanPhone(),
        amount: generateRandomAmount(),
        time: "Just now",
        county: COUNTIES[Math.floor(Math.random() * COUNTIES.length)],
        type: LOAN_TYPES[Math.floor(Math.random() * LOAN_TYPES.length)]
      };

      setTransactions((prev) => [newItem, ...prev.slice(0, 14)]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full py-5 glass-panel border-y border-white/40 dark:border-white/10 z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Live M-Pesa Disbursements:
            </span>
          </div>

          <div className="flex-1 w-full overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <div className="flex items-center gap-3 text-xs">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="inline-flex items-center gap-2 bg-white/85 dark:bg-slate-800/85 border border-white/80 dark:border-white/10 px-3.5 py-1.5 rounded-full shadow-xs shrink-0 font-medium transition-all hover:scale-102"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-mono font-bold text-foreground">{tx.phone}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                    {formatKsh(tx.amount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({tx.county} • {tx.time})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
