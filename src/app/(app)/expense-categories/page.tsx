
"use client";

import React, { useState } from 'react';
import type { ExpenseCategory } from "@/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddExpenseCategoryForm } from "@/components/expense/add-expense-category-form";
import { PlusCircle, Edit3, Trash2, Tag, Lock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast } from 'date-fns';
import Link from 'next/link';

const fetchExpenseCategories = async (userId: string): Promise<ExpenseCategory[]> => {
  if (!userId) return [];
  const categoriesRef = collection(db, "users", userId, "expenseCategories");
  const q = query(categoriesRef, orderBy("name"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseCategory));
};

const TRIAL_ITEM_LIMIT = 3;

export default function ExpenseCategoriesPage() {
  const { user, userProfile, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const dialogDescriptionId = React.useId();

  const { data: categories = [], isLoading, error } = useQuery<ExpenseCategory[], Error>({
    queryKey: ['expenseCategories', user?.uid],
    queryFn: () => fetchExpenseCategories(user!.uid),
    enabled: !!user?.uid,
  });

  const isTrialActive = userProfile?.subscriptionStatus === 'trial' && userProfile.trialEndDate && !isPast(userProfile.trialEndDate);
  const trialLimitReached = isTrialActive && categories.length >= TRIAL_ITEM_LIMIT;
  const canAddOrEdit = hasActiveSubscription && (!isTrialActive || !trialLimitReached);

  const addCategoryMutation = useMutation({
    mutationFn: async (newCategoryData: { name: string; description?: string }) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      return addDoc(collection(db, "users", user.uid, "expenseCategories"), {
        ...newCategoryData,
        userId: user.uid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories', user?.uid] });
      toast({ title: "Category Added", description: "New expense category has been added." });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to add category: ${error.message}`, variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (updatedCategory: ExpenseCategory) => {
      if (!user?.uid || !updatedCategory.id) throw new Error("User or category ID missing");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      const categoryRef = doc(db, "users", user.uid, "expenseCategories", updatedCategory.id);
      const { id, userId, ...dataToUpdate } = updatedCategory; 
      return updateDoc(categoryRef, dataToUpdate);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories', user?.uid] });
      toast({ title: "Category Updated", description: `Category "${variables.name}" has been updated.` });
      setIsDialogOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update category: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      const categoryRef = doc(db, "users", user.uid, "expenseCategories", categoryId);
      return deleteDoc(categoryRef);
    },
    onSuccess: (data, categoryId) => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories', user?.uid] });
      const deletedCategory = categories.find(cat => cat.id === categoryId);
      toast({ title: "Category Deleted", description: `Category "${deletedCategory?.name}" has been deleted.`, variant: "destructive" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete category: ${error.message}`, variant: "destructive" });
    }
  });

  const handleFormSubmit = (values: { name: string; description?: string }) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ ...editingCategory, ...values });
    } else {
      addCategoryMutation.mutate(values);
    }
  };

  const handleEdit = (category: ExpenseCategory) => {
    if (!canAddOrEdit) {
         toast({ title: "Action Restricted", description: "Subscription ended or trial limit reached.", variant: "destructive" });
         return;
    }
    setEditingCategory(category);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (categoryId: string) => {
    if (!canAddOrEdit) {
         toast({ title: "Action Restricted", description: "Subscription ended or trial limit reached.", variant: "destructive" });
         return;
    }
    deleteCategoryMutation.mutate(categoryId);
  };

  if (isLoading) {
     return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-1/3" />
          <Skeleton className="h-10 w-full sm:w-1/4" />
        </div>
        <div className="rounded-lg border shadow-sm bg-card p-4 space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-destructive">Error loading categories: {error.message}</div>;
  }

  const addButtonDisabled = !hasActiveSubscription || trialLimitReached;
  let addButtonTitle = "Add New Category";
  if (!hasActiveSubscription) addButtonTitle = "Activate subscription to add categories";
  else if (trialLimitReached) addButtonTitle = `Trial limit of ${TRIAL_ITEM_LIMIT} categories reached`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Expense Categories</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {setEditingCategory(null); setIsDialogOpen(true);}}
              disabled={addButtonDisabled}
              title={addButtonTitle}
              className="w-full sm:w-auto"
            >
              {addButtonDisabled && !trialLimitReached && <Lock className="mr-2 h-4 w-4" />}
              {trialLimitReached && <AlertTriangle className="mr-2 h-4 w-4" />}
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="w-[90vw] max-w-lg sm:max-w-[425px] max-h-[80vh] overflow-y-auto"
            aria-describedby={dialogDescriptionId}
          >
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit" : "Add"} Expense Category</DialogTitle>
              <DialogDescription id={dialogDescriptionId}>
                {editingCategory ? "Update the details of your expense category." : "Enter the details for your new expense category."}
                {!canAddOrEdit && " Subscription or trial limits may apply."}
              </DialogDescription>
            </DialogHeader>
             {canAddOrEdit ? (
                <AddExpenseCategoryForm
                  onSubmit={handleFormSubmit} 
                  initialData={editingCategory || undefined}
                  onCancel={() => {setIsDialogOpen(false); setEditingCategory(null);}}
                />
              ) : (
               <div className="text-center text-muted-foreground py-6">
                  {trialLimitReached ? <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-orange-500" /> : <Lock className="mx-auto h-10 w-10 mb-3" />}
                  <p className="mb-3">
                    {trialLimitReached ? `You have reached the trial limit of ${TRIAL_ITEM_LIMIT} expense categories.` : "Your trial or subscription has ended."}
                  </p>
                  <Button asChild><Link href="/subscription">Manage Subscription</Link></Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {trialLimitReached && (
         <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 rounded-md shadow-md">
            <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-3" />
                <div>
                    <p className="font-bold">Trial Limit Reached</p>
                    <p className="text-sm">You've reached the trial limit of ${TRIAL_ITEM_LIMIT} expense categories. <Link href="/subscription" className="underline font-medium hover:text-blue-800">Upgrade your plan</Link> to add more.</p>
                </div>
            </div>
        </div>
      )}
      {!hasActiveSubscription && categories.length > 0 && (
         <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md">
            <div className="flex items-center">
                <Lock className="h-5 w-5 mr-3" />
                <div>
                    <p className="font-bold">Action Required</p>
                    <p className="text-sm">Your trial or subscription has ended. Please <Link href="/subscription" className="underline font-medium hover:text-yellow-800">renew your subscription</Link> to manage categories.</p>
                </div>
            </div>
        </div>
      )}

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] table-cell sm:w-auto">Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No expense categories yet. Add your first one!
                </TableCell>
              </TableRow>
            )}
            {categories.map((category) => {
              const IconComponent = Tag; 
              const editActionDisabled = !canAddOrEdit;
              const deleteActionDisabled = !canAddOrEdit;
              const actionTitle = !canAddOrEdit ? "Subscription/trial limits apply" : undefined;

              return (
                <TableRow key={category.id}>
                  <TableCell className="table-cell sm:w-auto">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium break-words max-w-[100px] sm:max-w-xs">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground break-words max-w-[150px] sm:max-w-md truncate hidden sm:table-cell">{category.description || "N/A"}</TableCell>
                  <TableCell className="text-right">
                     {/* Desktop Actions */}
                    <div className="hidden md:flex md:items-center md:justify-end md:gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} disabled={editActionDisabled} title={actionTitle || "Edit"}>
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} disabled={deleteActionDisabled} title={actionTitle || "Delete"}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                    {/* Mobile Actions */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={editActionDisabled && deleteActionDisabled} title="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(category)} disabled={editActionDisabled}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(category.id)} disabled={deleteActionDisabled} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

