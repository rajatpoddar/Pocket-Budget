
import type { IncomeCategory, ExpenseCategory } from '@/types';

export const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: 'default-income-salary', name: 'Salary', isDefault: true },
  { id: 'default-income-freelance', name: 'Freelance/Projects', isDefault: true },
  { id: 'default-income-investments', name: 'Investments', isDefault: true },
  { id: 'default-income-gifts', name: 'Gifts Received', isDefault: true },
  { id: 'default-income-other', name: 'Other Income', isDefault: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'default-expense-food', name: 'Food & Groceries', isDefault: true },
  { id: 'default-expense-transport', name: 'Transportation', isDefault: true },
  { id: 'default-expense-housing', name: 'Housing (Rent/Mortgage)', isDefault: true },
  { id: 'default-expense-utilities', name: 'Utilities (Bills)', isDefault: true },
  { id: 'default-expense-health', name: 'Healthcare & Medical', isDefault: true },
  { id: 'default-expense-entertainment', name: 'Entertainment & Leisure', isDefault: true },
  { id: 'default-expense-shopping', name: 'Shopping (General)', isDefault: true },
  { id: 'default-expense-education', name: 'Education', isDefault: true },
  { id: 'default-expense-personal', name: 'Personal Care', isDefault: true },
  { id: 'default-expense-other', name: 'Other Expenses', isDefault: true },
];
