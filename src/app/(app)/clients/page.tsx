
"use client";

import React, { useState, useMemo } from 'react';
import type { Client, Income, ClientFinancialSummary } from "@/types";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AddClientForm } from "@/components/client/add-client-form";
import { PlusCircle, Edit3, Trash2, Users, Phone, MapPin, BadgeIndianRupee, CheckCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const fetchClients = async (userId: string): Promise<Client[]> => {
  if (!userId) return [];
  const clientsRef = collection(db, "users", userId, "clients");
  const q = query(clientsRef, orderBy("name"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};

const fetchIncomesForClientAggregation = async (userId: string): Promise<Income[]> => {
    if (!userId) return [];
    const incomesRef = collection(db, "users", userId, "incomes");
    const q = query(incomesRef); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
            freelanceDetails: data.freelanceDetails ? {
                ...data.freelanceDetails,
                duesClearedAt: data.freelanceDetails.duesClearedAt ? (data.freelanceDetails.duesClearedAt as Timestamp).toDate() : undefined,
            } : undefined,
        } as Income;
    });
};


export default function ClientsPage() {
  const { user, hasActiveSubscription } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const formDialogDescriptionId = React.useId();
  const alertDialogDescriptionId = React.useId();

  const { data: clients = [], isLoading: isLoadingClients, error: clientsError } = useQuery<Client[], Error>({
    queryKey: ['clients', user?.uid],
    queryFn: () => fetchClients(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: incomes = [], isLoading: isLoadingIncomes, error: incomesError } = useQuery<Income[], Error>({
      queryKey: ['allIncomesForClientsPage', user?.uid], 
      queryFn: () => fetchIncomesForClientAggregation(user!.uid),
      enabled: !!user?.uid,
  });

  const clientFinancialSummaries: ClientFinancialSummary[] = useMemo(() => {
    if (isLoadingClients || isLoadingIncomes || !clients.length) return clients.map(c => ({...c, totalPaid: 0, totalDues: 0}));
    if (!incomes.length && clients.length > 0 && !isLoadingIncomes) return clients.map(c => ({...c, totalPaid: 0, totalDues: 0}));


    return clients.map(client => {
      let totalPaid = 0;
      let totalDues = 0;

      incomes.forEach(income => {
        if (income.clientId === client.id && income.freelanceDetails) {
          totalPaid += income.amount;
          const dueForThisIncome = income.freelanceDetails.projectCost - income.amount;
          if (!income.freelanceDetails.duesClearedAt && dueForThisIncome > 0) {
            totalDues += dueForThisIncome;
          }
        }
      });
      return { ...client, totalPaid, totalDues };
    });
  }, [clients, incomes, isLoadingClients, isLoadingIncomes]);


  const addClientMutation = useMutation({
    mutationFn: async (newClientData: Omit<Client, 'id' | 'userId'>) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("Action restricted by subscription.");
      return addDoc(collection(db, "users", user.uid, "clients"), {
        ...newClientData,
        userId: user.uid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', user?.uid] });
      toast({ title: "Client Added", description: "New client has been added." });
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to add client: ${error.message}`, variant: "destructive" });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Client) => {
      if (!user?.uid || !updatedClient.id) throw new Error("User or client ID missing");
      if (!hasActiveSubscription) throw new Error("Action restricted by subscription.");
      const clientRef = doc(db, "users", user.uid, "clients", updatedClient.id);
      const { id, userId, ...dataToUpdate } = updatedClient;
      return updateDoc(clientRef, dataToUpdate);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients', user?.uid] });
      toast({ title: "Client Updated", description: `Client "${variables.name}" has been updated.` });
      setIsFormDialogOpen(false);
      setEditingClient(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update client: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (!hasActiveSubscription) throw new Error("Action restricted by subscription.");
      const clientRef = doc(db, "users", user.uid, "clients", clientId);
      return deleteDoc(clientRef);
    },
    onSuccess: (data, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['clients', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['allIncomesForClientsPage', user?.uid] });
      const deletedClient = clients.find(c => c.id === clientId);
      toast({ title: "Client Deleted", description: `Client "${deletedClient?.name}" has been deleted.`, variant: "destructive" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete client: ${error.message}`, variant: "destructive" });
    }
  });

  const clearClientDuesMutation = useMutation({
    mutationFn: async (clientId: string) => {
      if (!user?.uid) throw new Error("User not authenticated.");
      if (!hasActiveSubscription) throw new Error("Action restricted by subscription.");

      const incomesToUpdate = incomes.filter(
        (income) =>
          income.clientId === clientId &&
          income.freelanceDetails &&
          !income.freelanceDetails.duesClearedAt &&
          income.freelanceDetails.projectCost > income.amount
      );

      if (incomesToUpdate.length === 0) {
        toast({ title: "No Dues", description: "This client has no outstanding project dues to clear.", variant: "default" });
        return { noDues: true };
      }

      const updatePromises = incomesToUpdate.map((incomeToClear) => {
        if (!incomeToClear.id || !incomeToClear.freelanceDetails) return Promise.resolve(); // Should not happen if filter is correct
        const incomeRef = doc(db, "users", user!.uid, "incomes", incomeToClear.id);
        const updatedIncomeData = { // Prepare only fields that need to change
          amount: incomeToClear.freelanceDetails.projectCost,
          freelanceDetails: {
            ...incomeToClear.freelanceDetails,
            duesClearedAt: Timestamp.fromDate(new Date()),
          },
        };
        return updateDoc(incomeRef, updatedIncomeData);
      });

      await Promise.all(updatePromises);
      return { clearedCount: incomesToUpdate.length };
    },
    onSuccess: (data, clientId) => {
      if (data && data.noDues) return;

      const client = clients.find(c => c.id === clientId);
      toast({ title: "Dues Cleared", description: `All outstanding project dues for ${client?.name || 'the client'} have been marked as cleared. (${data?.clearedCount} income entries updated).` });
      queryClient.invalidateQueries({ queryKey: ['clients', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['allIncomesForClientsPage', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics', user?.uid] });
    },
    onError: (error) => {
      toast({ title: "Error Clearing Dues", description: `Failed to clear dues: ${error.message}`, variant: "destructive" });
    }
  });


  const handleFormSubmit = (values: { name: string; number?: string; address?: string }) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to manage clients.", variant: "destructive"});
      return;
    }
    if (editingClient) {
      updateClientMutation.mutate({ ...editingClient, ...values });
    } else {
      addClientMutation.mutate(values);
    }
  };

  const handleEdit = (client: Client) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to manage clients.", variant: "destructive"});
      return;
    }
    setEditingClient(client);
    setIsFormDialogOpen(true);
  };
  
  const handleDelete = (clientId: string) => {
    if (!hasActiveSubscription) {
      toast({ title: "Action Restricted", description: "Please activate your subscription to manage clients.", variant: "destructive"});
      return;
    }
    deleteClientMutation.mutate(clientId);
  };

  const isLoading = isLoadingClients || isLoadingIncomes;

  if (isLoading) {
     return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-1/3" />
          <Skeleton className="h-10 w-full sm:w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }
  
  if (clientsError || incomesError) {
    return <div className="text-destructive">Error loading data: {clientsError?.message || incomesError?.message}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Manage Clients</h1>
        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) setEditingClient(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {setEditingClient(null); setIsFormDialogOpen(true);}} 
              className="w-full sm:w-auto"
              disabled={!hasActiveSubscription}
              title={!hasActiveSubscription ? "Activate subscription to add clients" : "Add New Client"}
            >
              {!hasActiveSubscription && <Lock className="mr-2 h-4 w-4" />}
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="w-[90vw] max-w-lg sm:max-w-[425px] max-h-[80vh] overflow-y-auto"
            aria-describedby={formDialogDescriptionId}
          >
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit" : "Add"} Client</DialogTitle>
              <DialogDescription id={formDialogDescriptionId}>
                {editingClient ? "Update the details of your client." : "Enter the details for your new client."}
              </DialogDescription>
            </DialogHeader>
            <AddClientForm
              onSubmit={handleFormSubmit} 
              initialData={editingClient || undefined}
              onCancel={() => {setIsFormDialogOpen(false); setEditingClient(null);}}
              isLoading={addClientMutation.isPending || updateClientMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {clientFinancialSummaries.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Clients Yet</h2>
          <p>Add your first client to start managing them here.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clientFinancialSummaries.map((client) => (
          <Card key={client.id} className="shadow-lg flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ease-out">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold break-words max-w-full">{client.name}</CardTitle>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 -mt-2 -mr-2 flex-shrink-0"
                      disabled={!hasActiveSubscription}
                      title={!hasActiveSubscription ? "Activate subscription to delete" : "Delete Client"}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Client</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent aria-describedby={alertDialogDescriptionId}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription id={alertDialogDescriptionId}>
                        This action cannot be undone. This will permanently delete the client "{client.name}".
                        Associated income records will remain but will no longer be linked to this client profile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(client.id)} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete client
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {client.number && (
                <div className="flex items-center text-sm text-muted-foreground pt-1">
                  <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                  <span className="break-words">{client.number}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start text-sm text-muted-foreground pt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{client.address}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-medium text-green-600">₹{client.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Dues:</span>
                <span className={`font-medium ${client.totalDues > 0 ? 'text-red-600' : 'text-foreground'}`}>
                  ₹{client.totalDues.toLocaleString()}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => handleEdit(client)}
                disabled={!hasActiveSubscription}
                title={!hasActiveSubscription ? "Activate subscription to edit" : "Edit Client"}
              >
                <Edit3 className="h-4 w-4 mr-2" /> Edit Client
              </Button>
              {client.totalDues > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                  onClick={() => clearClientDuesMutation.mutate(client.id)}
                  disabled={!hasActiveSubscription || clearClientDuesMutation.isPending && clearClientDuesMutation.variables === client.id}
                  title={!hasActiveSubscription ? "Activate subscription to clear dues" : "Mark all outstanding project dues for this client as cleared"}
                >
                  {clearClientDuesMutation.isPending && clearClientDuesMutation.variables === client.id ? (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Clear All Dues
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
