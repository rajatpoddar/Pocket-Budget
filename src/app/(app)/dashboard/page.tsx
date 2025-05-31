
"use client";

import React, { useState } from 'react';
import type { Metric, Income, Expense, Client, IncomeCategory } from "@/types";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Briefcase, AlertTriangle, ShieldX, CheckCircle, CalendarDays, PlusCircle, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FreelanceReportCard } from "@/components/dashboard/freelance-report-card";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp, orderBy, limit, doc, updateDoc, addDoc } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AddDailyIncomeDialog } from '@/components/income/add-daily-income-dialog';
import { Button } from '@/components/ui/button';

// Fetch Incomes
const fetchIncomes = async (userId: string): Promise<Income[]> => {
  if (!userId) return [];
  const q = query(collection(db, "users", userId, "incomes"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: (data.date as Timestamp).toDate(),
      freelanceDetails: data.freelanceDetails ? {
        ...data.freelanceDetails,
        duesClearedAt: data.freelanceDetails.duesClearedAt ? (data.freelanceDetails.duesClearedAt as Timestamp).toDate() : undefined,
      } : undefined,
    } as Income;
  });
};

// Fetch Expenses
const fetchExpenses = async (userId: string): Promise<Expense[]> => {
  if (!userId) return [];
  const q = query(collection(db, "users", userId, "expenses"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: (data.date as Timestamp).toDate()
    } as Expense;
  });
};

// Fetch recent activities
const fetchRecentActivities = async (userId: string) => {
  if (!userId) return [];
  const incomesRef = collection(db, "users", userId, "incomes");
  const expensesRef = collection(db, "users", userId, "expenses");

  const incomeQuery = query(incomesRef, orderBy("date", "desc"), limit(5));
  const expenseQuery = query(expensesRef, orderBy("date", "desc"), limit(5));

  const [incomeSnapshot, expenseSnapshot] = await Promise.all([
    getDocs(incomeQuery),
    getDocs(expenseQuery),
  ]);

  const activities = [];
  incomeSnapshot.forEach(doc => {
    const data = doc.data();
    activities.push({
      id: doc.id,
      description: data.description,
      amount: `+₹${data.amount.toLocaleString()}`,
      category: "Income",
      date: (data.date as Timestamp).toDate(),
      avatar: data.description?.charAt(0).toUpperCase() || "I",
      type: "income",
    });
  });
  expenseSnapshot.forEach(doc => {
    const data = doc.data();
    activities.push({
      id: doc.id,
      description: data.description,
      amount: `-₹${data.amount.toLocaleString()}`,
      category: "Expense",
      date: (data.date as Timestamp).toDate(),
      avatar: data.description?.charAt(0).toUpperCase() || "E",
      type: "expense",
    });
  });

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
};

const generateChartData = (incomes: Income[], expenses: Expense[]): Array<{ month: string; income: number; expenses: number }> => {
  const data: Array<{ month: string; income: number; expenses: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) { 
    const targetMonthDate = subMonths(now, i);
    const monthStart = startOfMonth(targetMonthDate);
    const monthEnd = endOfMonth(targetMonthDate);

    const monthlyIncome = incomes
      .filter(inc => {
        const incDate = new Date(inc.date);
        return incDate >= monthStart && incDate <= monthEnd;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const monthlyExpenses = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    data.push({
      month: format(monthStart, "MMM"), 
      income: monthlyIncome,
      expenses: monthlyExpenses,
    });
  }
  return data;
};

const overviewChartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { user, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDailyIncomeDialogOpen, setIsDailyIncomeDialogOpen] = useState(false);
  const dailyIncomeDialogDescriptionId = React.useId();


  const { data: incomeCategories = [], isLoading: isLoadingCategories } = useQuery<IncomeCategory[], Error>({
    queryKey: ['incomeCategories', user?.uid],
    queryFn: async () => {
        if (!user?.uid) return [];
        const q = query(collection(db, "users", user.uid, "incomeCategories"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomeCategory));
    },
    enabled: !!user?.uid,
  });

  const dailyFixedIncomeCategories = React.useMemo(() => {
    return incomeCategories.filter(cat => cat.isDailyFixedIncome && cat.dailyFixedAmount && cat.dailyFixedAmount > 0);
  }, [incomeCategories]);

  const { data: incomesData = [], isLoading: isLoadingIncomes } = useQuery<Income[], Error>({
    queryKey: ['incomes', user?.uid],
    queryFn: () => fetchIncomes(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[], Error>({
    queryKey: ['expenses', user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: recentActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['recentActivities', user?.uid],
    queryFn: () => fetchRecentActivities(user!.uid),
    enabled: !!user?.uid,
  });

  const projectTrackingIncomes = React.useMemo(() => {
    if (!incomeCategories.length || !incomesData.length) return [];
    return incomesData.filter(income => {
        const category = incomeCategories.find(cat => cat.id === income.categoryId);
        return category?.hasProjectTracking && income.freelanceDetails;
    });
  }, [incomesData, incomeCategories]);


  const now = new Date();
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const currentMonthStart = startOfMonth(now);

  const totalIncomeCurrentMonth = incomesData
    .filter(inc => new Date(inc.date) >= currentMonthStart)
    .reduce((sum, inc) => sum + inc.amount, 0);

  const totalExpensesCurrentMonth = expenses
    .filter(exp => new Date(exp.date) >= currentMonthStart)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const netSavingsCurrentMonth = totalIncomeCurrentMonth - totalExpensesCurrentMonth;

  const totalIncomeLastMonth = incomesData
    .filter(inc => new Date(inc.date) >= lastMonthStart && new Date(inc.date) <= lastMonthEnd)
    .reduce((sum, inc) => sum + inc.amount, 0);

  const incomeChange = totalIncomeLastMonth > 0
    ? ((totalIncomeCurrentMonth - totalIncomeLastMonth) / totalIncomeLastMonth) * 100
    : totalIncomeCurrentMonth > 0 ? 100 : 0;

  let totalDues = 0;
  let totalLoss = 0;
  const thirtyDaysAgo = subDays(now, 30);

  projectTrackingIncomes.forEach(income => {
    if (income.freelanceDetails && !income.freelanceDetails.duesClearedAt && income.freelanceDetails.projectCost > income.amount) {
      const dueAmount = income.freelanceDetails.projectCost - income.amount;
      totalDues += dueAmount;
      const incomeDate = new Date(income.date); 
      if (incomeDate < thirtyDaysAgo) {
        totalLoss += dueAmount;
      }
    }
  });

  const totalDailyIncomeCurrentMonth = React.useMemo(() => {
    return incomesData
      .filter(inc => {
        const category = incomeCategories.find(c => c.id === inc.categoryId);
        return category?.isDailyFixedIncome && new Date(inc.date) >= currentMonthStart;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);
  }, [incomesData, incomeCategories, currentMonthStart]);
  
  const updateIncomeMutationForDues = useMutation({
    mutationFn: async (updatedIncome: Income) => {
      if (!user?.uid || !updatedIncome.id) throw new Error("User or income ID missing");
      const incomeRef = doc(db, "users", user.uid, "incomes", updatedIncome.id);
      const { id, userId, ...dataToUpdate } = updatedIncome;
      const finalData: any = {
          ...dataToUpdate,
          date: Timestamp.fromDate(new Date(dataToUpdate.date)),
          freelanceDetails: dataToUpdate.freelanceDetails ? {
            ...dataToUpdate.freelanceDetails,
            duesClearedAt: dataToUpdate.freelanceDetails.duesClearedAt ? Timestamp.fromDate(new Date(dataToUpdate.freelanceDetails.duesClearedAt)) : null,
          } : null,
      };
      if (dataToUpdate.clientId) finalData.clientId = dataToUpdate.clientId;
      else finalData.clientId = null;
      
      return updateDoc(incomeRef, finalData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] }); 
      toast({ title: "Dues Cleared", description: `Dues for "${variables.description}" marked as cleared.` });
    },
    onError: (error) => {
      toast({ title: "Error Clearing Dues", description: error.message, variant: "destructive" });
    }
  });

  const addDailyIncomeMutation = useMutation({
    mutationFn: async (incomeData: { amount: number; categoryId: string; date: Date; description: string }) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");
      const dataToSave = {
        ...incomeData,
        date: Timestamp.fromDate(incomeData.date),
        userId: user.uid,
        freelanceDetails: null,
        clientId: null,
      };
      return addDoc(collection(db, "users", user.uid, "incomes"), dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      toast({ title: "Daily Income Added", description: "Daily income entry has been successfully added." });
      setIsDailyIncomeDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error Adding Daily Income", description: `Failed to add daily income: ${error.message}`, variant: "destructive" });
    }
  });

  const handleClearDuesOnDashboard = (incomeToClear: Income) => {
     if (!incomeToClear.freelanceDetails || !user?.uid) {
      toast({ title: "Error", description: "Cannot clear dues for this income.", variant: "destructive" });
      return;
    }
    const updatedIncome: Income = {
      ...incomeToClear,
      amount: incomeToClear.freelanceDetails.projectCost, 
      freelanceDetails: {
        ...incomeToClear.freelanceDetails,
        duesClearedAt: new Date(), 
      },
    };
    updateIncomeMutationForDues.mutate(updatedIncome);
  };

  const handleQuickAddDailyIncomeSubmit = (values: {amount: number, categoryId?: string, date?: Date}) => {
    if (!user?.uid) return;
    if (dailyFixedIncomeCategories.length === 0) {
        toast({title: "No Fixed Category", description: "Please set up a daily fixed income category first.", variant: "destructive"});
        return;
    }
    
    let categoryToUse: IncomeCategory | undefined = dailyFixedIncomeCategories[0];
    if(values.categoryId) {
        categoryToUse = dailyFixedIncomeCategories.find(cat => cat.id === values.categoryId);
    }
    
    if (!categoryToUse) {
        toast({title: "Category Error", description: "Could not find the specified daily fixed income category.", variant: "destructive"});
        return;
    }

    addDailyIncomeMutation.mutate({
        amount: values.amount,
        categoryId: categoryToUse.id,
        date: values.date || new Date(),
        description: `Daily Income - ${categoryToUse.name}`
    });
  };

  const metrics: Metric[] = [
    { id: "1", title: "Total Income (This Month)", value: `₹${totalIncomeCurrentMonth.toLocaleString()}`, change: `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%`, icon: TrendingUp },
    { id: "2", title: "Total Expenses (This Month)", value: `₹${totalExpensesCurrentMonth.toLocaleString()}`, icon: Wallet },
    { id: "3", title: "Net Savings (This Month)", value: `₹${netSavingsCurrentMonth.toLocaleString()}`, icon: TrendingUp },
    { id: "total_daily_income", title: "Daily Income (This Month)", value: `₹${totalDailyIncomeCurrentMonth.toLocaleString()}`, icon: CalendarDays},
    { id: "4", title: "Total Dues (Projects)", value: `₹${totalDues.toLocaleString()}`, icon: AlertTriangle },
    { id: "5", title: "Potential Loss (>30 days)", value: `₹${totalLoss.toLocaleString()}`, icon: ShieldX },
  ];

  const overviewChartData = generateChartData(incomesData, expenses);

  const { data: dashboardData, isLoading: isLoadingDashboardData } = useQuery({
    queryKey: ['dashboardMetrics', user?.uid, totalDailyIncomeCurrentMonth], 
    queryFn: async () => {
      return { totalDues, totalLoss, totalIncomeCurrentMonth, totalExpensesCurrentMonth, netSavingsCurrentMonth, incomeChange, totalDailyIncomeCurrentMonth };
    },
    enabled: !!user?.uid && !isLoadingIncomes && !isLoadingExpenses && !isLoadingCategories, 
  });


  const isLoading = isLoadingIncomes || isLoadingExpenses || isLoadingActivities || isLoadingCategories || isLoadingDashboardData;

  if (isLoading) {
     return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-full sm:w-1/2 md:w-1/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[300px] sm:h-[350px] w-full rounded-lg lg:col-span-2" />
          <Skeleton className="h-[300px] sm:h-[350px] w-full rounded-lg lg:col-span-1" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Dashboard</h1>
        {hasActiveSubscription && dailyFixedIncomeCategories.length > 0 && (
          <Dialog open={isDailyIncomeDialogOpen} onOpenChange={setIsDailyIncomeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Daily Income
              </Button>
            </DialogTrigger>
            <DialogContent 
                className="w-[90vw] max-w-md sm:max-w-md"
                aria-describedby={dailyIncomeDialogDescriptionId}
            >
              <DialogHeader>
                <DialogTitle>Add Daily Income</DialogTitle>
                <DialogDescription id={dailyIncomeDialogDescriptionId}>
                  Quickly log an income entry for your daily fixed income categories.
                </DialogDescription>
              </DialogHeader>
              <AddDailyIncomeDialog
                categories={dailyFixedIncomeCategories}
                onSubmit={handleQuickAddDailyIncomeSubmit}
                onCancel={() => setIsDailyIncomeDialogOpen(false)}
                isLoading={addDailyIncomeMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
         {!hasActiveSubscription && dailyFixedIncomeCategories.length > 0 && (
            <Button variant="outline" disabled title="Activate subscription to add daily income" className="w-full sm:w-auto">
                <Lock className="mr-2 h-4 w-4" /> Add Daily Income
            </Button>
        )}
      </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <OverviewChart data={overviewChartData} chartConfig={overviewChartConfig} />

        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest financial transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] sm:h-[340px] pr-3">
              {recentActivities.length === 0 && <p className="text-sm text-muted-foreground">No recent activities.</p>}
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${activity.avatar}`} alt={activity.description} data-ai-hint="transaction category"/>
                      <AvatarFallback>{activity.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate" title={activity.description}>{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.category} &bull; {format(new Date(activity.date), "PP")}</p>
                    </div>
                    <div className={`text-sm font-medium ${activity.amount.startsWith('+') ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {activity.amount}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <FreelanceReportCard 
        projectTrackingIncomes={projectTrackingIncomes} 
        onClearDues={handleClearDuesOnDashboard} 
      />

    </div>
  );
}
