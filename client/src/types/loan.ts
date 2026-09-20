export type Step = 
  | "id" 
  | "menu" 
  | "submenu" 
  | "crb" 
  | "repay" 
  | "stk_waiting" 
  | "done";

export type LoanCategoryType = "salary" | "biashara" | "emergency";

export interface LoanCategoryInfo {
  id: LoanCategoryType;
  name: string;
  badge: string;
  principal: number;
  repayment: number;
  interest: number;
  tenure: string;
  description: string;
}

export interface LoanApplicationState {
  nationalId: string;
  phone: string;
  mainChoice: "1" | "2" | "3" | null;
  loanSubtype: LoanCategoryType | null;
  qualifyAmount: number;
  approvedSecuredAmount: number;
  crbScore: number;
  crbStatus: "Risky Loan" | "Good" | "Excellent";
  securityFee: number;
  repaymentBalance: number;
  monthlyBoostAmount: number;
  multiplierLoanAmount: number;
  step: Step;
}

export interface StkPushRequest {
  phone: string;
  packageSize: "SECURED" | "MIN";
  amount: number;
  nationalId?: string;
  reference?: string;
}

export interface StkPushResponse {
  success: boolean;
  localId: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  timestamp: string;
}

export interface DisbursementReceipt {
  transactionId: string;
  mpesaReceiptNo: string;
  timestamp: string;
  phone: string;
  nationalId: string;
  loanType: string;
  approvedAmount: number;
  securityFeePaid: number;
  disbursedAmount: number;
  repaymentDue: number;
  repaymentDueDate: string;
  status: "COMPLETED" | "PROCESSING" | "PENDING_DISBURSEMENT";
  guarantor: "Britam Insurance Kenya";
}

export interface UssdSession {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  text: string;
  depth: number;
  history: string[];
}
