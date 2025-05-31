
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
import { PlusCircle, Edit3, Trash2, Users, Phone, MapPin, BadgeIndianRupee } from "lucide-react";
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
  const { user } = useAuth();
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
    if (isLoadingClients || isLoadingIncomes || !clients.length || !incomes.length) return clients.map(c => ({...c, totalPaid: 0, totalDues: 0}));

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

  const handleFormSubmit = (values: { name: string; number?: string; address?: string }) => {
    if (editingClient) {
      updateClientMutation.mutate({ ...editingClient, ...values });
    } else {
      addClientMutation.mutate(values);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormDialogOpen(true);
  };
  
  const handleDelete = (clientId: string) => {
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
            <Button onClick={() => {setEditingClient(null); setIsFormDialogOpen(true);}} className="w-full sm:w-auto">
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
          <Card key={client.id} className="shadow-lg flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold break-words max-w-full">{client.name}</CardTitle>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 -mt-2 -mr-2 flex-shrink-0">
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
            <CardFooter className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(client)}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit Client
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
