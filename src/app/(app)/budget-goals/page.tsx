
"use client";

import React, { useState } from 'react';
import type { BudgetGoal } from "@/types";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/budget/goal-card";
import { AddGoalForm } from "@/components/budget/add-goal-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Target, PiggyBank, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { isPast } from 'date-fns';
import Link from 'next/link';

const fetchBudgetGoals = async (userId: string): Promise<BudgetGoal[]> => {
  if (!userId) return [];
  const goalsRef = collection(db, "users", userId, "budgetGoals");
  const q = query(goalsRef, orderBy("name"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetGoal));
};

const TRIAL_ITEM_LIMIT = 3;

export default function BudgetGoalsPage() {
  const { user, userProfile, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<BudgetGoal | null>(null);
  const dialogDescriptionId = React.useId();

  const { data: goals = [], isLoading, error } = useQuery<BudgetGoal[], Error>({
    queryKey: ['budgetGoals', user?.uid],
    queryFn: () => fetchBudgetGoals(user!.uid),
    enabled: !!user?.uid,
  });

  const isTrialActive = userProfile?.subscriptionStatus === 'trial' && userProfile.trialEndDate && !isPast(userProfile.trialEndDate);
  const trialLimitReached = isTrialActive && goals.length >= TRIAL_ITEM_LIMIT;
  const canAddOrEdit = hasActiveSubscription && (!isTrialActive || !trialLimitReached);


  const addGoalMutation = useMutation({
    mutationFn: async (newGoalData: Omit<BudgetGoal, 'id' | 'userId'>) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      return addDoc(collection(db, "users", user.uid, "budgetGoals"), {
        ...newGoalData,
        userId: user.uid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetGoals', user?.uid] });
      toast({ title: "Goal Added", description: "New budget goal has been added." });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to add goal: ${error.message}`, variant: "destructive" });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (updatedGoal: BudgetGoal) => {
      if (!user?.uid || !updatedGoal.id) throw new Error("User or goal ID missing");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      const goalRef = doc(db, "users", user.uid, "budgetGoals", updatedGoal.id);
      const { id, userId, ...dataToUpdate } = updatedGoal;
      return updateDoc(goalRef, dataToUpdate);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgetGoals', user?.uid] });
      toast({ title: "Goal Updated", description: `Budget goal "${variables.name}" has been updated.` });
      setIsDialogOpen(false);
      setEditingGoal(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update goal: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!canAddOrEdit) throw new Error("Action restricted by subscription or trial limits.");
      const goalRef = doc(db, "users", user.uid, "budgetGoals", goalId);
      return deleteDoc(goalRef);
    },
    onSuccess: (data, goalId) => {
      queryClient.invalidateQueries({ queryKey: ['budgetGoals', user?.uid] });
      const deletedGoal = goals.find(g => g.id === goalId);
      toast({ title: "Goal Deleted", description: `Budget goal "${deletedGoal?.name}" has been deleted.`, variant: "destructive" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete goal: ${error.message}`, variant: "destructive" });
    }
  });

  const handleFormSubmit = (values: { name: string; targetAmount: number; currentAmount?: number; description?: string }) => {
    const goalData = {
        name: values.name,
        targetAmount: values.targetAmount,
        currentAmount: values.currentAmount || 0,
        description: values.description || "",
    };
    if (editingGoal) {
      updateGoalMutation.mutate({ ...editingGoal, ...goalData });
    } else {
      addGoalMutation.mutate(goalData);
    }
  };

  const handleEdit = (goal: BudgetGoal) => {
    if (!canAddOrEdit) {
         toast({ title: "Action Restricted", description: "Subscription ended or trial limit reached.", variant: "destructive" });
         return;
    }
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleDelete = (goalId: string) => {
    if (!canAddOrEdit) {
         toast({ title: "Action Restricted", description: "Subscription ended or trial limit reached.", variant: "destructive" });
         return;
    }
    deleteGoalMutation.mutate(goalId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-1/3" />
          <Skeleton className="h-10 w-full sm:w-1/4" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error loading budget goals: {error.message}</div>;
  }

  const addButtonDisabled = !hasActiveSubscription || trialLimitReached;
  let addButtonTitle = "Set New Goal";
  if (!hasActiveSubscription) addButtonTitle = "Activate subscription to set goals";
  else if (trialLimitReached) addButtonTitle = `Trial limit of ${TRIAL_ITEM_LIMIT} goals reached`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Budget Goals</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingGoal(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {setEditingGoal(null); setIsDialogOpen(true);}}
              disabled={addButtonDisabled}
              title={addButtonTitle}
              className="w-full sm:w-auto"
            >
              {addButtonDisabled && !trialLimitReached && <Lock className="mr-2 h-4 w-4" />}
              {trialLimitReached && <AlertTriangle className="mr-2 h-4 w-4" />}
              <PlusCircle className="mr-2 h-5 w-5" /> Set New Goal
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="w-[90vw] max-w-lg sm:max-w-[425px] max-h-[80vh] overflow-y-auto"
            aria-describedby={dialogDescriptionId}
          >
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit" : "Set New"} Budget Goal</DialogTitle>
              <DialogDescription id={dialogDescriptionId}>
                {editingGoal ? "Update the details of your budget goal." : "Define your new financial goal and track your progress."}
                {!canAddOrEdit && " Subscription or trial limits may apply."}
              </DialogDescription>
            </DialogHeader>
            {canAddOrEdit ? (
                <AddGoalForm 
                  onSubmit={handleFormSubmit} 
                  initialData={editingGoal ? {
                    name: editingGoal.name,
                    targetAmount: editingGoal.targetAmount,
                    currentAmount: editingGoal.currentAmount,
                    description: editingGoal.description,
                  } : undefined}
                  onCancel={() => {setIsDialogOpen(false); setEditingGoal(null);}}
                />
              ) : (
               <div className="text-center text-muted-foreground py-6">
                  {trialLimitReached ? <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-orange-500" /> : <Lock className="mx-auto h-10 w-10 mb-3" />}
                  <p className="mb-3">
                    {trialLimitReached ? `You have reached the trial limit of ${TRIAL_ITEM_LIMIT} budget goals.` : "Your trial or subscription has ended."}
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
                    <p className="text-sm">You've reached the trial limit of {TRIAL_ITEM_LIMIT} budget goals. <Link href="/subscription" className="underline font-medium hover:text-blue-800">Upgrade your plan</Link> to add more.</p>
                </div>
            </div>
        </div>
      )}
      {!hasActiveSubscription && goals.length > 0 && (
         <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md">
            <div className="flex items-center">
                <Lock className="h-5 w-5 mr-3" />
                <div>
                    <p className="font-bold">Action Required</p>
                    <p className="text-sm">Your trial or subscription has ended. Please <Link href="/subscription" className="underline font-medium hover:text-yellow-800">renew your subscription</Link> to manage goals.</p>
                </div>
            </div>
        </div>
      )}

      {goals.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Target className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Budget Goals Yet</h2>
          <p>Start planning your financial future by setting some goals!</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard 
            key={goal.id} 
            goal={goal} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            defaultIcon={PiggyBank} 
            disabled={!canAddOrEdit}
          />
        ))}
      </div>
    </div>
  );
}
