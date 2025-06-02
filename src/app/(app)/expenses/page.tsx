
"use client";

import React, { useState, useMemo } from 'react';
import type { Expense, ExpenseCategory } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddExpenseForm } from "@/components/expense/add-expense-form";
import { PlusCircle, Edit3, Trash2, Wallet, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const fetchExpenseCategories = async (userId: string): Promise<ExpenseCategory[]> => {
  if (!userId) return [];
  const q = query(collection(db, "users", userId, "expenseCategories"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseCategory));
};

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

export default function ExpensesPage() {
  const { user, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const dialogDescriptionId = React.useId();

  const { data: expenseCategories = [], isLoading: isLoadingCategories } = useQuery<ExpenseCategory[], Error>({
    queryKey: ['expenseCategories', user?.uid],
    queryFn: () => fetchExpenseCategories(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses, error: expensesError } = useQuery<Expense[], Error>({
    queryKey: ['expenses', user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: !!user?.uid,
  });

  const categoryMap = useMemo(() => {
    return expenseCategories.reduce((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {} as Record<string, string>);
  }, [expenseCategories]);

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: Omit<Expense, 'id' | 'userId'>) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");
      const dataToSave = {
        ...expenseData,
        date: Timestamp.fromDate(new Date(expenseData.date)),
        userId: user.uid,
      };
      return addDoc(collection(db, "users", user.uid, "expenses"), dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      toast({ title: "Expense Added", description: "New expense entry has been added." });
      setIsDialogOpen(false);
      setEditingExpense(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to add expense: ${error.message}`, variant: "destructive" });
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async (updatedExpense: Expense) => {
      if (!user?.uid || !updatedExpense.id) throw new Error("User or expense ID missing");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");
      const expenseRef = doc(db, "users", user.uid, "expenses", updatedExpense.id);
      const { id, userId, ...dataToUpdate } = updatedExpense;
      const finalData = {
          ...dataToUpdate,
          date: Timestamp.fromDate(new Date(dataToUpdate.date)),
      };
      return updateDoc(expenseRef, finalData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      toast({ title: "Expense Updated", description: `Expense entry "${variables.description}" has been updated.` });
      setIsDialogOpen(false);
      setEditingExpense(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update expense: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");
      const expenseRef = doc(db, "users", user.uid, "expenses", expenseId);
      return deleteDoc(expenseRef);
    },
    onSuccess: (data, expenseId) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      const deletedExpense = expenses.find(exp => exp.id === expenseId);
      toast({ title: "Expense Deleted", description: `Expense entry "${deletedExpense?.description}" has been deleted.`, variant: "destructive" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete expense: ${error.message}`, variant: "destructive" });
    }
  });


  const handleFormSubmit = (values: Omit<Expense, 'id' | 'userId'>) => {
     if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to add or edit expenses.", variant: "destructive"});
      return;
    }
    if (editingExpense) {
      updateExpenseMutation.mutate({ ...editingExpense, ...values });
    } else {
      addExpenseMutation.mutate(values);
    }
  };

  const handleEdit = (expense: Expense) => {
     if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to edit expenses.", variant: "destructive"});
      return;
    }
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDelete = (expenseId: string) => {
     if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to delete expenses.", variant: "destructive"});
      return;
    }
    deleteExpenseMutation.mutate(expenseId);
  };

  const isLoading = isLoadingCategories || isLoadingExpenses;

  if (isLoading && expenses.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-1/3" />
          <Skeleton className="h-10 w-full sm:w-1/4" />
        </div>
        <div className="rounded-lg border shadow-sm bg-card p-4 space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (expensesError) {
    return <div className="text-destructive">Error loading expenses: {expensesError.message}</div>;
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Expenses</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingExpense(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { setEditingExpense(null); setIsDialogOpen(true); }}
              disabled={!hasActiveSubscription}
              title={!hasActiveSubscription ? "Activate subscription to add expenses" : "Add New Expense"}
              className="w-full sm:w-auto"
            >
              {!hasActiveSubscription && <Lock className="mr-2 h-4 w-4" />}
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Expense
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="w-[90vw] max-w-lg sm:max-w-[425px] max-h-[80vh] overflow-y-auto"
            aria-describedby={dialogDescriptionId}
          >
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit" : "Add"} Expense Entry</DialogTitle>
              <DialogDescription id={dialogDescriptionId}>
                {editingExpense ? "Update the details of your expense entry." : "Enter the details for your new expense entry."}
                {!hasActiveSubscription && " Please activate your subscription to proceed."}
              </DialogDescription>
            </DialogHeader>
             {hasActiveSubscription ? (
                <AddExpenseForm
                  onSubmit={handleFormSubmit}
                  categories={expenseCategories}
                  initialData={editingExpense ? {
                      ...editingExpense,
                      date: new Date(editingExpense.date) 
                  } : undefined}
                  onCancel={() => { setIsDialogOpen(false); setEditingExpense(null); }}
                />
              ) : (
                <div className="text-center text-muted-foreground py-6">
                    <Lock className="mx-auto h-10 w-10 mb-3" />
                    <p className="mb-3">Your trial or subscription has ended.</p>
                    <Button asChild><Link href="/subscription">Manage Subscription</Link></Button>
                </div>
              )}
          </DialogContent>
        </Dialog>
      </div>
      
      {!hasActiveSubscription && expenses.length > 0 && (
         <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md">
            <div className="flex items-center">
                <Lock className="h-5 w-5 mr-3" />
                <div>
                    <p className="font-bold">Action Required</p>
                    <p className="text-sm">Your trial or subscription has ended. Please <Link href="/subscription" className="underline font-medium hover:text-yellow-800">renew your subscription</Link> to add, edit, or delete expense entries.</p>
                </div>
            </div>
        </div>
      )}

      {(isLoading && expenses.length === 0) ? null : expenses.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Wallet className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Expense Entries Yet</h2>
          <p>Start tracking your spending by adding your first expense entry!</p>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="rounded-lg border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-right hidden md:table-cell">Actions</TableHead>
                <TableHead className="text-right md:hidden">
                  <span className="sr-only">Expand</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const isExpanded = expandedRowId === expense.id;
                return (
                  <React.Fragment key={expense.id}>
                    <TableRow 
                      className={cn("md:cursor-default cursor-pointer", isExpanded && "bg-muted/30")}
                      onClick={() => setExpandedRowId(isExpanded ? null : expense.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="break-words max-w-[120px] sm:max-w-xs">
                          {expense.description}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden"> {/* Date for mobile below description */}
                          {format(new Date(expense.date), "PP")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">₹{expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{format(new Date(expense.date), "PPP")}</TableCell>
                      <TableCell className="hidden md:table-cell break-words max-w-[100px] sm:max-w-[150px]">{categoryMap[expense.categoryId] || "N/A"}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(expense); }} className="mr-2" disabled={!hasActiveSubscription} title="Edit Expense">
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }} disabled={!hasActiveSubscription} title="Delete Expense">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right md:hidden">
                        <Button variant="ghost" size="icon" aria-label={isExpanded ? "Collapse row" : "Expand row"}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="md:hidden bg-muted/50 hover:bg-muted/60 border-b border-border">
                        <TableCell colSpan={3} className="p-3">
                          <div className="space-y-3">
                            <div>
                              <strong className="block text-xs uppercase text-muted-foreground">Category</strong>
                              <span>{categoryMap[expense.categoryId] || "N/A"}</span>
                            </div>
                            <div>
                              <strong className="block text-xs uppercase text-muted-foreground">Actions</strong>
                              <div className="flex flex-col items-start gap-2 mt-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleEdit(expense); }} 
                                  className="w-full justify-start"
                                  disabled={!hasActiveSubscription}
                                  title="Edit Expense"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" /> Edit Expense
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }} 
                                  className="w-full justify-start"
                                  disabled={!hasActiveSubscription}
                                  title="Delete Expense"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete Expense
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

