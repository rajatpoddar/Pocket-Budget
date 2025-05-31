
"use client";

import React, { useState, useMemo } from 'react';
import type { Income, IncomeCategory, Client, FreelanceDetails } from "@/types";
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
import { AddIncomeForm } from "@/components/income/add-income-form";
import { QuickAddDailyIncomeDialog } from "@/components/income/quick-add-daily-income-dialog";
import { PlusCircle, Edit3, Trash2, Wallet, Briefcase, Info, Users, CheckCircle, Lock, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc, Timestamp, orderBy, where } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const fetchIncomeCategories = async (userId: string): Promise<IncomeCategory[]> => {
  if (!userId) return [];
  const q = query(collection(db, "users", userId, "incomeCategories"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomeCategory));
};

const fetchClients = async (userId: string): Promise<Client[]> => {
  if (!userId) return [];
  const q = query(collection(db, "users", userId, "clients"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};

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


export default function IncomesPage() {
  const { user, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddIncomeDialogOpen, setIsAddIncomeDialogOpen] = useState(false);
  const [isQuickAddDialogOpen, setIsQuickAddDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const addIncomeDialogDescriptionId = React.useId();
  const quickAddDialogDescriptionId = React.useId();

  const { data: incomeCategories = [], isLoading: isLoadingCategories } = useQuery<IncomeCategory[], Error>({
    queryKey: ['incomeCategories', user?.uid],
    queryFn: () => fetchIncomeCategories(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery<Client[], Error>({
    queryKey: ['clients', user?.uid],
    queryFn: () => fetchClients(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: incomes = [], isLoading: isLoadingIncomes, error: incomesError } = useQuery<Income[], Error>({
    queryKey: ['incomes', user?.uid],
    queryFn: () => fetchIncomes(user!.uid),
    enabled: !!user?.uid,
  });

  const categoryMap = useMemo(() => {
    return incomeCategories.reduce((acc, category) => {
      acc[category.id] = {
        name: category.name, 
        hasProjectTracking: category.hasProjectTracking || false,
        isDailyFixedIncome: category.isDailyFixedIncome || false,
        dailyFixedAmount: category.dailyFixedAmount
      };
      return acc;
    }, {} as Record<string, {name: string, hasProjectTracking: boolean, isDailyFixedIncome: boolean, dailyFixedAmount?: number}>);
  }, [incomeCategories]);

  const clientMap = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = client.name;
      return acc;
    }, {} as Record<string, string>);
  }, [clients]);

  const dailyFixedIncomeCategories = useMemo(() => {
    return incomeCategories.filter(cat => cat.isDailyFixedIncome && cat.dailyFixedAmount && cat.dailyFixedAmount > 0);
  }, [incomeCategories]);

  const singleDailyFixedCategory = useMemo(() => {
    return dailyFixedIncomeCategories.length === 1 ? dailyFixedIncomeCategories[0] : undefined;
  }, [dailyFixedIncomeCategories]);

  const { dailyFixedIncomes, otherIncomes } = useMemo(() => {
    const daily: Income[] = [];
    const other: Income[] = [];
    incomes.forEach(income => {
      const categoryDetails = categoryMap[income.categoryId];
      if (categoryDetails?.isDailyFixedIncome) {
        daily.push(income);
      } else {
        other.push(income);
      }
    });
    return { dailyFixedIncomes: daily, otherIncomes: other };
  }, [incomes, categoryMap]);

  const addClientMutation = useMutation({
    mutationFn: async (newClientData: Omit<Client, 'id' | 'userId'>) => {
        if (!user?.uid) throw new Error("User not authenticated");
        const clientRef = await addDoc(collection(db, "users", user.uid, "clients"), {
            ...newClientData,
            userId: user.uid,
        });
        return { ...newClientData, id: clientRef.id, userId: user.uid };
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients', user?.uid] });
        toast({ title: "Client Added", description: "New client has been added to your list." });
    },
    onError: (error) => {
        toast({ title: "Error Adding Client", description: error.message, variant: "destructive" });
    }
  });

  const addIncomeMutation = useMutation({
    mutationFn: async (incomeData: Omit<Income, 'id' | 'userId'>) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");

      const dataToSave: any = {
        description: incomeData.description,
        amount: incomeData.amount,
        date: Timestamp.fromDate(new Date(incomeData.date)),
        categoryId: incomeData.categoryId,
        userId: user.uid,
      };

      const category = incomeCategories.find(c => c.id === incomeData.categoryId);
      if (category?.hasProjectTracking && incomeData.freelanceDetails) {
        dataToSave.freelanceDetails = {
          ...incomeData.freelanceDetails,
          duesClearedAt: incomeData.freelanceDetails.duesClearedAt ? Timestamp.fromDate(new Date(incomeData.freelanceDetails.duesClearedAt)) : null,
        };
         if (incomeData.clientId) {
          dataToSave.clientId = incomeData.clientId;
        }
      } else {
        dataToSave.freelanceDetails = null;
        dataToSave.clientId = null;
      }
      return addDoc(collection(db, "users", user.uid, "incomes"), dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      toast({ title: "Income Added", description: "New income entry has been added." });
      setIsAddIncomeDialogOpen(false);
      setIsQuickAddDialogOpen(false);
      setEditingIncome(null);
    },
    onError: (error) => {
      toast({ title: "Error Adding Income", description: `Failed to add income: ${error.message}`, variant: "destructive" });
    }
  });

  const updateIncomeMutation = useMutation({
    mutationFn: async (updatedIncome: Income) => {
      if (!user?.uid || !updatedIncome.id) throw new Error("User or income ID missing");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");

      const incomeRef = doc(db, "users", user.uid, "incomes", updatedIncome.id);
      const { id, userId, ...dataToUpdate } = updatedIncome;

      const finalData: any = {
          ...dataToUpdate,
          date: Timestamp.fromDate(new Date(dataToUpdate.date)),
      };
      
      const category = incomeCategories.find(c => c.id === dataToUpdate.categoryId);
      if (category?.hasProjectTracking && dataToUpdate.freelanceDetails) {
        finalData.freelanceDetails = {
          ...dataToUpdate.freelanceDetails,
          duesClearedAt: dataToUpdate.freelanceDetails.duesClearedAt ? Timestamp.fromDate(new Date(dataToUpdate.freelanceDetails.duesClearedAt)) : null,
        };
        finalData.clientId = dataToUpdate.clientId || null;
      } else {
        finalData.freelanceDetails = null;
        finalData.clientId = null;
      }

      return updateDoc(incomeRef, finalData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      toast({ title: "Income Updated", description: `Income entry "${variables.description}" has been updated.` });
      setIsAddIncomeDialogOpen(false);
      setEditingIncome(null);
    },
    onError: (error) => {
      toast({ title: "Error Updating Income", description: `Failed to update income: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: async (incomeId: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("No active subscription or trial.");
      const incomeRef = doc(db, "users", user.uid, "incomes", incomeId);
      return deleteDoc(incomeRef);
    },
    onSuccess: (data, incomeId) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
      const deletedIncome = incomes.find(inc => inc.id === incomeId);
      toast({ title: "Income Deleted", description: `Income entry "${deletedIncome?.description}" has been deleted.`, variant: "destructive" });
    },
    onError: (error) => {
      toast({ title: "Error Deleting Income", description: `Failed to delete income: ${error.message}`, variant: "destructive" });
    }
  });

  const handleFormSubmit = async (
    values: Omit<Income, 'id' | 'userId' | 'freelanceDetails' | 'clientId'> & {
        existingClientId?: string,
        clientName?: string,
        clientNumber?: string,
        clientAddress?: string,
        projectCost?: number,
        numberOfWorkers?: number
    },
    isNewClient: boolean,
    categoryHasProjectTracking?: boolean
) => {
    if (!hasActiveSubscription) {
        toast({ title: "Action Restricted", description: "Please activate your subscription to add or edit incomes.", variant: "destructive"});
        return;
    }
    let clientId = values.existingClientId === "--new--" || !values.existingClientId ? undefined : values.existingClientId;
    let freelanceDetails: FreelanceDetails | undefined = undefined;

    if (categoryHasProjectTracking) {
        if (isNewClient && values.clientName) {
            try {
                const newClient = await addClientMutation.mutateAsync({
                    name: values.clientName,
                    number: values.clientNumber,
                    address: values.clientAddress,
                });
                clientId = newClient.id;
            } catch (error) {
                return; 
            }
        }

        let finalClientName = values.clientName;
        if (clientId && !isNewClient) {
            const existingClient = clients.find(c => c.id === clientId);
            finalClientName = existingClient?.name || values.clientName;
        }

        if (values.projectCost && finalClientName) {
            freelanceDetails = {
                clientName: finalClientName,
                clientNumber: values.clientNumber,
                clientAddress: values.clientAddress,
                projectCost: values.projectCost,
                numberOfWorkers: values.numberOfWorkers,
                duesClearedAt: editingIncome?.freelanceDetails?.duesClearedAt
                  ? new Date(editingIncome.freelanceDetails.duesClearedAt)
                  : undefined
            };
        } else {
            toast({ title: "Missing Project Info", description: "Project cost and client name are required for project-based income.", variant: "destructive"});
            return;
        }
    }

    const incomePayload: Omit<Income, 'id' | 'userId'> = {
        description: values.description,
        amount: values.amount,
        date: values.date,
        categoryId: values.categoryId,
        ...(categoryHasProjectTracking && freelanceDetails && { freelanceDetails }),
        ...(categoryHasProjectTracking && clientId && { clientId }),
    };
    
    if (!categoryHasProjectTracking) {
        incomePayload.freelanceDetails = undefined;
        incomePayload.clientId = undefined;
    }

    if (editingIncome) {
      updateIncomeMutation.mutate({ ...editingIncome, ...incomePayload });
    } else {
      addIncomeMutation.mutate(incomePayload);
    }
  };

  const handleQuickAddSubmit = (values: { amount: number }) => {
    if (!singleDailyFixedCategory || !user?.uid) {
        toast({ title: "Error", description: "Cannot quick add daily income.", variant: "destructive"});
        return;
    }
    addIncomeMutation.mutate({
        description: `Daily Income - ${singleDailyFixedCategory.name}`,
        amount: values.amount,
        date: new Date(), 
        categoryId: singleDailyFixedCategory.id,
    });
  };

  const handleEdit = (income: Income) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to edit incomes.", variant: "destructive"});
      return;
    }
    setEditingIncome({
        ...income,
        date: new Date(income.date),
        freelanceDetails: income.freelanceDetails ? {
            ...income.freelanceDetails,
            duesClearedAt: income.freelanceDetails.duesClearedAt ? new Date(income.freelanceDetails.duesClearedAt) : undefined,
        } : undefined
    });
    setIsAddIncomeDialogOpen(true);
  };

  const handleDelete = (incomeId: string) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to delete incomes.", variant: "destructive"});
      return;
    }
    deleteIncomeMutation.mutate(incomeId);
  };

  const handleClearDues = (income: Income) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to clear dues.", variant: "destructive"});
      return;
    }
    if (!income.freelanceDetails || !user?.uid) {
      toast({ title: "Error", description: "Cannot clear dues for this income.", variant: "destructive" });
      return;
    }
    const updatedIncome: Income = {
      ...income,
      amount: income.freelanceDetails.projectCost,
      freelanceDetails: {
        ...income.freelanceDetails,
        duesClearedAt: new Date(), 
      },
    };
    updateIncomeMutation.mutate(updatedIncome);
  };

  const isLoading = isLoadingCategories || isLoadingIncomes || isLoadingClients;

  const renderIncomeTable = (incomeList: Income[], title: string) => {
    if (incomeList.length === 0 && !isLoading) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <Wallet className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No {title.toLowerCase()} recorded yet.</p>
        </div>
      );
    }
    if (isLoading && incomeList.length === 0) {
        return (
             <div className="rounded-lg border shadow-sm bg-card p-4 space-y-2">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        )
    }
    if (incomeList.length === 0) return null; // Don't render empty tables after loading if truly empty

    return (
      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeList.map((income) => {
              const categoryDetails = categoryMap[income.categoryId];
              const isProjectBased = categoryDetails?.hasProjectTracking && income.freelanceDetails;
              const dueAmount = isProjectBased ? income.freelanceDetails!.projectCost - income.amount : 0;
              const duesCleared = isProjectBased && !!income.freelanceDetails!.duesClearedAt;

              return (
                <TableRow key={income.id}>
                  <TableCell className="font-medium">
                    <div className="break-words max-w-[100px] sm:max-w-xs">
                      {income.description}
                    </div>
                  </TableCell>
                  <TableCell>₹{income.amount.toLocaleString()}</TableCell>
                  <TableCell>{format(new Date(income.date), "PPP")}</TableCell>
                  <TableCell className="break-words max-w-[100px] sm:max-w-[150px]">{categoryDetails?.name || "N/A"}</TableCell>
                  <TableCell>
                    {isProjectBased ? (
                      <div className="text-xs space-y-0.5 max-w-[150px] sm:max-w-xs">
                        <div className="flex items-center">
                          <Briefcase className="w-3 h-3 mr-1.5 text-muted-foreground flex-shrink-0"/>
                          <span className="truncate" title={income.freelanceDetails!.clientName}>{income.freelanceDetails!.clientName}</span>
                        </div>
                          <div>Cost: ₹{income.freelanceDetails!.projectCost.toLocaleString()}</div>
                          {income.freelanceDetails!.numberOfWorkers && (
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1.5 text-muted-foreground flex-shrink-0"/>
                              <span>Workers: {income.freelanceDetails!.numberOfWorkers}</span>
                            </div>
                          )}
                          {duesCleared ? (
                            <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
                              Dues Cleared: {format(new Date(income.freelanceDetails!.duesClearedAt!), "PPp")}
                            </Badge>
                          ) : dueAmount > 0 ? (
                          <Badge variant="destructive" className="mt-1">Due: ₹{dueAmount.toLocaleString()}</Badge>
                          ) : (
                          <Badge variant="secondary" className="mt-1">Paid in Full</Badge>
                          )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {isProjectBased && dueAmount > 0 && !duesCleared && (
                      <Button variant="outline" size="sm" onClick={() => handleClearDues(income)} className="mr-2 text-xs" title="Clear Dues" disabled={!hasActiveSubscription}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Clear
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(income)} className="mr-2" title="Edit" disabled={!hasActiveSubscription}>
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(income.id)} title="Delete" disabled={!hasActiveSubscription}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading && incomes.length === 0) { // Show main skeleton only on initial full load
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-1/3" />
          <Skeleton className="h-10 w-full sm:w-2/5" />
        </div>
        <Skeleton className="h-10 w-full mb-2" /> 
        <div className="rounded-lg border shadow-sm bg-card p-4 space-y-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
        <Skeleton className="h-10 w-full mt-4 mb-2" /> 
        <div className="rounded-lg border shadow-sm bg-card p-4 space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (incomesError) {
    return <div className="text-destructive">Error loading incomes: {incomesError.message}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Incomes</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {singleDailyFixedCategory && hasActiveSubscription && (
            <Dialog open={isQuickAddDialogOpen} onOpenChange={setIsQuickAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" title="Quick Add Daily Income" className="w-full sm:w-auto">
                  <CalendarPlus className="mr-2 h-5 w-5" /> Quick Add Daily
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="w-[90vw] max-w-md sm:max-w-sm"
                aria-describedby={quickAddDialogDescriptionId}
              >
                <DialogHeader>
                  <DialogTitle>Quick Add Daily Income</DialogTitle>
                  <DialogDescription id={quickAddDialogDescriptionId}>
                    Log income for &quot;{singleDailyFixedCategory.name}&quot;. Date will be set to today.
                  </DialogDescription>
                </DialogHeader>
                <QuickAddDailyIncomeDialog
                  category={singleDailyFixedCategory}
                  onSubmit={handleQuickAddSubmit}
                  onCancel={() => setIsQuickAddDialogOpen(false)}
                  isLoading={addIncomeMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isAddIncomeDialogOpen} onOpenChange={(open) => {
            setIsAddIncomeDialogOpen(open);
            if (!open) setEditingIncome(null);
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { setEditingIncome(null); setIsAddIncomeDialogOpen(true); }}
                disabled={!hasActiveSubscription}
                title={!hasActiveSubscription ? "Activate subscription to add income" : "Add New Income"}
                className="w-full sm:w-auto"
              >
                {!hasActiveSubscription && <Lock className="mr-2 h-4 w-4" />}
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Income
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="w-[90vw] max-w-lg sm:max-w-md flex flex-col max-h-[85vh]"
              aria-describedby={addIncomeDialogDescriptionId}
            >
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>{editingIncome ? "Edit" : "Add"} Income Entry</DialogTitle>
                <DialogDescription id={addIncomeDialogDescriptionId}>
                  {editingIncome ? "Update the details of your income entry." : "Enter the details for your new income entry."}
                  {!hasActiveSubscription && " Please activate your subscription to proceed."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {hasActiveSubscription ? (
                  <AddIncomeForm
                    onSubmit={handleFormSubmit}
                    categories={incomeCategories}
                    clients={clients}
                    initialData={editingIncome ? {
                        ...editingIncome,
                        date: new Date(editingIncome.date)
                    } : undefined}
                    onCancel={() => { setIsAddIncomeDialogOpen(false); setEditingIncome(null); }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-6">
                      <Lock className="mx-auto h-10 w-10 mb-3" />
                      <p className="mb-3">Your trial or subscription has ended.</p>
                      <Button asChild><Link href="/subscription">Manage Subscription</Link></Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {!hasActiveSubscription && incomes.length > 0 && (
          <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md">
            <div className="flex items-center">
                <Lock className="h-5 w-5 mr-3" />
                <div>
                    <p className="font-bold">Action Required</p>
                    <p className="text-sm">Your trial or subscription has ended. Please <Link href="/subscription" className="underline font-medium hover:text-yellow-800">renew your subscription</Link> to add, edit, or delete income entries.</p>
                </div>
            </div>
        </div>
      )}

      {(isLoading && incomes.length === 0) ? null : incomes.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Wallet className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Income Entries Yet</h2>
          <p>Start tracking your earnings by adding your first income entry!</p>
        </div>
      )}

      {dailyFixedIncomes.length > 0 && (
        <>
          <h2 className="text-xl sm:text-2xl font-semibold font-headline mt-4">Daily Fixed Incomes</h2>
          {renderIncomeTable(dailyFixedIncomes, "Daily Fixed Incomes")}
          {otherIncomes.length > 0 && <Separator className="my-6 sm:my-8" />}
        </>
      )}
      
      {otherIncomes.length > 0 && (
        <>
          <h2 className="text-xl sm:text-2xl font-semibold font-headline mt-2">Other Incomes</h2>
          {renderIncomeTable(otherIncomes, "Other Incomes")}
        </>
      )}
    </div>
  );
}
