
"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { format, addMonths, addYears } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, BellRing, Users } from 'lucide-react';

async function fetchPendingUsers(): Promise<UserProfile[]> {
  const usersCollectionRef = collection(db, "users");
  const q = query(
    usersCollectionRef, 
    where("subscriptionStatus", "==", "pending_confirmation"),
    orderBy("createdAt", "desc") 
  ); 
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email,
      displayName: data.displayName,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      subscriptionStatus: data.subscriptionStatus,
      requestedPlanType: data.requestedPlanType,
    } as UserProfile;
  });
}

export default function ManageSubscriptionsPage() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPendingUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await fetchPendingUsers();
      setPendingUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching pending users:", err);
      setError(err.message || "Failed to load pending subscription requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const handleApproveSubscription = async (userId: string, requestedPlan?: 'monthly' | 'yearly') => {
    if (!requestedPlan) {
      toast({ title: "Error", description: "Requested plan type is missing.", variant: "destructive" });
      return;
    }
    setIsLoading(true); 
    
    const now = new Date();
    let subscriptionEndDate: Date;
    if (requestedPlan === 'monthly') {
      subscriptionEndDate = addMonths(now, 1);
    } else {
      subscriptionEndDate = addYears(now, 1);
    }

    const updateData: Partial<UserProfile> = {
      subscriptionStatus: 'active',
      planType: requestedPlan,
      subscribedAt: now,
      subscriptionEndDate: subscriptionEndDate,
      trialEndDate: undefined, 
      requestedPlanType: undefined, 
    };

    const firestoreUpdateData: any = {
        subscriptionStatus: 'active',
        planType: requestedPlan,
        subscribedAt: Timestamp.fromDate(now),
        subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),
        trialEndDate: deleteField(),
        requestedPlanType: deleteField(),
    };

    try {
      await updateDoc(doc(db, "users", userId), firestoreUpdateData);
      toast({ title: "Subscription Approved", description: `User's ${requestedPlan} plan has been activated.` });
      await loadPendingUsers(); 
    } catch (err: any) {
      toast({ title: "Approval Failed", description: `Could not approve subscription: ${err.message}`, variant: "destructive" });
      setError(`Failed to approve subscription: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading && pendingUsers.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl sm:text-2xl"><BellRing className="mr-2 h-6 w-6 text-primary"/>Manage Subscription Requests</CardTitle>
          <CardDescription>Loading pending requests...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
               <Skeleton className="h-8 w-1/2" />
               <Skeleton className="h-8 w-1/4" />
               <Skeleton className="h-8 w-1/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive shadow-lg">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center text-xl sm:text-2xl"><AlertTriangle className="mr-2 h-6 w-6"/> Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl md:text-3xl font-headline flex items-center"><BellRing className="mr-3 h-7 w-7 text-primary"/>Manage Subscription Requests</CardTitle>
        <CardDescription>Review and approve user subscription plan requests.</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 && !isLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold">No Pending Requests</h2>
            <p>When users request a subscription plan, they will appear here for approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Plan</TableHead>
                  <TableHead>Request Date (User Creation)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.uid} className={isLoading ? "opacity-50" : ""}>
                    <TableCell className="font-medium break-words max-w-[100px] sm:max-w-[120px]">{user.displayName || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                    <TableCell className="break-words max-w-[120px] sm:max-w-xs">{user.email || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {user.requestedPlanType || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy, HH:mm") : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveSubscription(user.uid, user.requestedPlanType)}
                        disabled={isLoading || !user.requestedPlanType}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve {user.requestedPlanType}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
