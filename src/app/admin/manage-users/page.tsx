
"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, Timestamp, deleteField, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addMonths, addYears, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Users, PlayCircle, CalendarPlus, CalendarCheck, MoreHorizontal, XCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

async function fetchUsers(): Promise<UserProfile[]> {
  const usersCollectionRef = collection(db, "users");
  const q = query(usersCollectionRef, orderBy("createdAt", "desc")); 
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email,
      displayName: data.displayName,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      subscriptionStatus: data.subscriptionStatus,
      planType: data.planType,
      requestedPlanType: data.requestedPlanType,
      trialEndDate: data.trialEndDate?.toDate ? data.trialEndDate.toDate() : undefined,
      subscriptionEndDate: data.subscriptionEndDate?.toDate ? data.subscriptionEndDate.toDate() : undefined,
      subscribedAt: data.subscribedAt?.toDate ? data.subscribedAt.toDate() : undefined,
      isAdmin: data.isAdmin || false,
    } as UserProfile;
  });
  return users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserProfile | null>(null);
  const [isEndPlanDialogOpen, setIsEndPlanDialogOpen] = useState(false);
  const [isRemoveUserProfileDialogOpen, setIsRemoveUserProfileDialogOpen] = useState(false);

  const alertDialogEndPlanDescId = React.useId();
  const alertDialogRemoveUserDescId = React.useId();

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAdminAction = async (userId: string, action: 'start_trial' | 'activate_monthly' | 'activate_yearly') => {
    const userToUpdate = users.find(u => u.uid === userId);
    if (!userToUpdate) return;

    setIsLoading(true);
    let updateData: Partial<UserProfile> = {};
    const now = new Date();
    let toastMessage = "";

    switch (action) {
      case 'start_trial':
        updateData = {
          subscriptionStatus: 'trial',
          planType: 'none', 
          trialEndDate: addDays(now, 15),
          subscriptionEndDate: undefined, 
          subscribedAt: undefined,
          requestedPlanType: undefined, 
        };
        toastMessage = `15-day trial started for ${userToUpdate.displayName || userToUpdate.email}.`;
        break;
      case 'activate_monthly':
        updateData = {
          subscriptionStatus: 'active',
          planType: 'monthly',
          subscribedAt: now,
          subscriptionEndDate: addMonths(now, 1),
          trialEndDate: undefined,
          requestedPlanType: undefined,
        };
        toastMessage = `Monthly subscription activated for ${userToUpdate.displayName || userToUpdate.email}.`;
        break;
      case 'activate_yearly':
        updateData = {
          subscriptionStatus: 'active',
          planType: 'yearly',
          subscribedAt: now,
          subscriptionEndDate: addYears(now, 1),
          trialEndDate: undefined,
          requestedPlanType: undefined,
        };
        toastMessage = `Yearly subscription activated for ${userToUpdate.displayName || userToUpdate.email}.`;
        break;
    }

    const firestoreUpdateData: any = { ...updateData };
    firestoreUpdateData.trialEndDate = updateData.trialEndDate ? Timestamp.fromDate(updateData.trialEndDate) : deleteField();
    firestoreUpdateData.subscribedAt = updateData.subscribedAt ? Timestamp.fromDate(updateData.subscribedAt) : deleteField();
    firestoreUpdateData.subscriptionEndDate = updateData.subscriptionEndDate ? Timestamp.fromDate(updateData.subscriptionEndDate) : deleteField();
    firestoreUpdateData.requestedPlanType = updateData.requestedPlanType === undefined ? deleteField() : updateData.requestedPlanType;
    if(action === 'start_trial') firestoreUpdateData.planType = 'none';


    try {
      await updateDoc(doc(db, "users", userId), firestoreUpdateData);
      toast({ title: "Success", description: toastMessage });
      await loadUsers(); 
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to update user: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openEndPlanDialog = (user: UserProfile) => {
    setSelectedUserForAction(user);
    setIsEndPlanDialogOpen(true);
  };

  const handleEndPlan = async () => {
    if (!selectedUserForAction) return;
    setIsLoading(true);
    const firestoreUpdateData: any = {
      subscriptionStatus: 'expired',
      planType: 'none',
      trialEndDate: deleteField(),
      subscriptionEndDate: deleteField(),
      subscribedAt: deleteField(),
      requestedPlanType: deleteField(),
    };
    try {
      await updateDoc(doc(db, "users", selectedUserForAction.uid), firestoreUpdateData);
      toast({ title: "Plan Ended", description: `Plan for ${selectedUserForAction.displayName || selectedUserForAction.email} has been ended.` });
      await loadUsers();
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to end plan: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsEndPlanDialogOpen(false);
      setSelectedUserForAction(null);
    }
  };

  const openRemoveUserProfileDialog = (user: UserProfile) => {
    setSelectedUserForAction(user);
    setIsRemoveUserProfileDialogOpen(true);
  };

  const handleRemoveUserProfile = async () => {
    if (!selectedUserForAction) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", selectedUserForAction.uid));
      toast({ title: "User Profile Removed", description: `Profile data for ${selectedUserForAction.displayName || selectedUserForAction.email} has been removed from Firestore.`, variant: "destructive" });
      await loadUsers();
    } catch (err: any) {
      toast({ title: "Error Removing Profile", description: `Failed to remove user profile: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRemoveUserProfileDialogOpen(false);
      setSelectedUserForAction(null);
    }
  };

  const getPlanDisplay = (user: UserProfile) => {
    if (user.subscriptionStatus === 'trial') return "Trial";
    if (user.planType && user.planType !== 'none') return user.planType;
    return <span className="text-muted-foreground italic">N/A</span>;
  };


  if (isLoading && users.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl sm:text-2xl"><Users className="mr-2 h-6 w-6 text-primary"/> Manage Users</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1"> <Skeleton className="h-4 w-3/4" /> <Skeleton className="h-4 w-1/2" /> </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive shadow-lg">
        <CardHeader><CardTitle className="text-destructive flex items-center text-xl sm:text-2xl"><AlertTriangle className="mr-2 h-6 w-6"/> Error</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-headline flex items-center"><Users className="mr-3 h-7 w-7 text-primary"/>Manage Users</CardTitle>
          <CardDescription>View and manage user profiles and their subscription status.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 && !isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold">No Users Found</h2>
              <p>Once users sign up, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead><TableHead>Requested</TableHead><TableHead>Trial Ends</TableHead>
                    <TableHead>Sub Ends</TableHead><TableHead>Created At</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid} className={isLoading && selectedUserForAction?.uid === user.uid ? "opacity-50" : ""}>
                      <TableCell className="font-medium break-words max-w-[100px] sm:max-w-[120px]">{user.displayName || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell className="break-words max-w-[120px] sm:max-w-xs">{user.email || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell>
                        {user.subscriptionStatus ? (
                          <Badge variant={
                            user.subscriptionStatus === 'active' ? 'default' :
                            user.subscriptionStatus === 'trial' ? 'secondary' :
                            user.subscriptionStatus === 'pending_confirmation' ? 'outline' :
                            (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') ? 'destructive' :
                            'outline'
                          } className="capitalize">
                            {user.subscriptionStatus.replace('_', ' ')}
                          </Badge>
                        ) : <Badge variant="outline">None</Badge>}
                      </TableCell>
                      <TableCell className="capitalize">{getPlanDisplay(user)}</TableCell>
                      <TableCell className="capitalize">{user.requestedPlanType || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.trialEndDate && !isPast(user.trialEndDate) ? format(new Date(user.trialEndDate), "dd MMM yy") : <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.subscriptionEndDate && !isPast(user.subscriptionEndDate) ? format(new Date(user.subscriptionEndDate), "dd MMM yy") : <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.createdAt ? format(new Date(user.createdAt), "dd MMM yy, HH:mm") : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading && selectedUserForAction?.uid === user.uid}>
                              <span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage Subscription</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAdminAction(user.uid, 'start_trial')} disabled={isLoading && selectedUserForAction?.uid === user.uid}>
                              <PlayCircle className="mr-2 h-4 w-4" />Start 15-Day Trial
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdminAction(user.uid, 'activate_monthly')} disabled={isLoading && selectedUserForAction?.uid === user.uid}>
                              <CalendarPlus className="mr-2 h-4 w-4" />Activate Monthly
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdminAction(user.uid, 'activate_yearly')} disabled={isLoading && selectedUserForAction?.uid === user.uid}>
                              <CalendarCheck className="mr-2 h-4 w-4" />Activate Yearly
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEndPlanDialog(user)} disabled={isLoading && selectedUserForAction?.uid === user.uid || !(user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial')}>
                              <XCircle className="mr-2 h-4 w-4" />End Current Plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>User Management</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => openRemoveUserProfileDialog(user)} 
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              disabled={isLoading && selectedUserForAction?.uid === user.uid}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />Remove User (Profile Only)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isEndPlanDialogOpen} onOpenChange={setIsEndPlanDialogOpen}>
        <AlertDialogContent aria-describedby={alertDialogEndPlanDescId}>
          <AlertDialogHeader>
            <AlertDialogTitle>End Plan for {selectedUserForAction?.displayName || selectedUserForAction?.email}?</AlertDialogTitle>
            <AlertDialogDescription id={alertDialogEndPlanDescId}>
              This will set the user's subscription status to 'expired' and remove any active plan or trial details. They will lose access to features requiring a subscription. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUserForAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndPlan} className="bg-destructive hover:bg-destructive/90">Yes, End Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRemoveUserProfileDialogOpen} onOpenChange={setIsRemoveUserProfileDialogOpen}>
        <AlertDialogContent aria-describedby={alertDialogRemoveUserDescId}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile for {selectedUserForAction?.displayName || selectedUserForAction?.email}?</AlertDialogTitle>
            <AlertDialogDescription id={alertDialogRemoveUserDescId}>
              This action will permanently delete the user's profile data (incomes, expenses, etc.) from Firestore.
              <strong className="block mt-2">It will NOT delete the user from Firebase Authentication.</strong>
              The user will still be able to log in but will appear as a new user without data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUserForAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUserProfile} className="bg-destructive hover:bg-destructive/90">Yes, Remove Profile Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
