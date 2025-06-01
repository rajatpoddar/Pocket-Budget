
export interface Metric {
  id: string;
  title: string;
  value: string;
  change?: string;
  icon?: React.ElementType;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; // Added for profile picture URL
  phoneNumber?: string | null; // Added for phone number
  createdAt: Date; 
  // Subscription fields
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'cancelled' | 'none' | 'pending_confirmation';
  planType?: 'monthly' | 'yearly' | 'none';
  requestedPlanType?: 'monthly' | 'yearly'; // Plan user selected, pending admin approval
  trialEndDate?: Date;
  subscriptionEndDate?: Date;
  subscribedAt?: Date;
  isAdmin?: boolean; 
}

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  hasProjectTracking?: boolean;
  isDailyFixedIncome?: boolean; // New field for daily fixed income
  dailyFixedAmount?: number;    // New field for the fixed daily amount
}

export interface BudgetGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  description?: string;
  userId?: string;
}

export interface Client {
  id: string;
  name: string;
  number?: string;
  address?: string;
  userId?: string; 
}

export interface FreelanceDetails {
  clientName: string; 
  clientNumber?: string; 
  clientAddress?: string; 
  projectCost: number;
  numberOfWorkers?: number;
  duesClearedAt?: Date; 
}

export interface Income {
  id:string;
  description: string;
  amount: number; 
  date: Date; 
  categoryId: string;
  userId?: string;
  freelanceDetails?: FreelanceDetails; 
  clientId?: string; 
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  userId?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date; 
  categoryId: string;
  userId?: string;
}

export interface ClientFinancialSummary extends Client {
  totalPaid: number;
  totalDues: number;
}
