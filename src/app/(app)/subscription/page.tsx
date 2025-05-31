
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addMonths, addYears, format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, CalendarDays, Sparkles, CheckCircle2, Hourglass, AlertCircle } from 'lucide-react';
import type { UserProfile } from '@/types';

type PlanType = 'monthly' | 'yearly';

export default function SubscriptionPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // Renamed from isLoading to avoid conflict
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (userProfile) {
      setCurrentProfile(userProfile);
    }
  }, [userProfile]);

  const handleRequestSubscription = async (plan: PlanType) => {
    if (!user || !currentProfile) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const updatedProfileData: Partial<UserProfile> = {
        subscriptionStatus: 'pending_confirmation',
        requestedPlanType: plan,
        planType: 'none', // Plan type will be set upon admin approval
        subscribedAt: undefined, // Will be set upon admin approval
        subscriptionEndDate: undefined, // Will be set upon admin approval
        trialEndDate: currentProfile.trialEndDate, // Preserve trial end date if it exists
      };

      // Convert dates to Timestamps or null for Firestore
      const firestoreUpdateData: any = {
        subscriptionStatus: 'pending_confirmation',
        requestedPlanType: plan,
        planType: 'none',
        subscribedAt: null,
        subscriptionEndDate: null,
        // trialEndDate: currentProfile.trialEndDate ? Timestamp.fromDate(currentProfile.trialEndDate) : null, // Don't overwrite trial end unnecessarily
      };


      await updateDoc(doc(db, "users", user.uid), firestoreUpdateData);
      
      setCurrentProfile(prev => ({ ...prev!, ...updatedProfileData, uid: prev!.uid, email: prev!.email, displayName: prev!.displayName, createdAt: prev!.createdAt  }));

      toast({ title: "Subscription Request Sent!", description: `Your request for the ${plan} plan is pending admin approval.` });
    } catch (error: any) {
      console.error("Subscription request error:", error);
      toast({ title: "Request Failed", description: error.message || "Could not send subscription request.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusDisplay = () => {
    if (!currentProfile) return { text: "Loading status...", badgeVariant: "outline" as const, icon: Sparkles };
    
    const { subscriptionStatus, trialEndDate, planType, subscriptionEndDate, requestedPlanType } = currentProfile;

    if (subscriptionStatus === 'pending_confirmation' && requestedPlanType) {
      return { text: `Your ${requestedPlanType} plan request is pending admin approval.`, badgeVariant: "secondary" as const, icon: Hourglass };
    }
    if (subscriptionStatus === 'trial') {
      if (trialEndDate && isPast(trialEndDate)) {
        return { text: `Your trial ended on ${format(trialEndDate, "PPP")}. Please subscribe.`, badgeVariant: "destructive" as const, icon: AlertCircle };
      }
      return { text: `You are on a trial, ending on ${trialEndDate ? format(trialEndDate, "PPP") : 'N/A'}.`, badgeVariant: "secondary" as const, icon: Sparkles };
    }
    if (subscriptionStatus === 'active' && planType && subscriptionEndDate) {
      if (isPast(subscriptionEndDate)) {
        return { text: `Your ${planType} subscription expired on ${format(subscriptionEndDate, "PPP")}. Please renew.`, badgeVariant: "destructive" as const, icon: CalendarDays };
      }
      return { text: `Active ${planType} plan. Renews on ${format(subscriptionEndDate, "PPP")}.`, badgeVariant: "default" as const, icon: CheckCircle2 };
    }
    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
         return { text: `Your subscription is ${subscriptionStatus}.`, badgeVariant: "destructive" as const, icon: CalendarDays };
    }
    return { text: "No active subscription or pending request.", badgeVariant: "outline" as const, icon: Crown };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  if (authLoading || !currentProfile) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const plans = [
    { type: 'monthly' as PlanType, name: "Monthly Plan", price: "₹199", duration: "per month", features: ["Full access to all features", "Standard support"] },
    { type: 'yearly' as PlanType, name: "Yearly Plan", price: "₹1999", duration: "per year", features: ["Full access to all features", "Priority support", "Save over 15%"] },
  ];

  const isCurrentlyActiveNonExpired = currentProfile.subscriptionStatus === 'active' && currentProfile.subscriptionEndDate && !isPast(currentProfile.subscriptionEndDate);
  const isPendingConfirmation = currentProfile.subscriptionStatus === 'pending_confirmation';

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-3">Subscription Plans</h1>
        <p className="text-muted-foreground text-lg">Choose the plan that works best for you. Admin approval required.</p>
      </div>

      <Card className="shadow-lg border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center">
             <StatusIcon className={`mr-2 h-6 w-6 text-${statusDisplay.badgeVariant === 'destructive' ? 'destructive' : 'primary'}`} />
            Your Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant={statusDisplay.badgeVariant} className="text-md px-4 py-1.5">
            {statusDisplay.text}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.type} className={`shadow-xl flex flex-col ${currentProfile.planType === plan.type && isCurrentlyActiveNonExpired ? 'border-2 border-green-500' : ''}`}>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
              <CardDescription className="text-3xl font-bold text-primary pt-2">{plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.duration}</span></CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-grow">
              <ul className="space-y-2 text-muted-foreground">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full text-lg py-6" 
                onClick={() => handleRequestSubscription(plan.type)} 
                disabled={isProcessing || isCurrentlyActiveNonExpired || (isPendingConfirmation && currentProfile.requestedPlanType === plan.type)}
              >
                {isProcessing && "Processing..."}
                {!isProcessing && currentProfile.planType === plan.type && isCurrentlyActiveNonExpired && "Currently Active"}
                {!isProcessing && isPendingConfirmation && currentProfile.requestedPlanType === plan.type && "Request Pending"}
                {!isProcessing && !((currentProfile.planType === plan.type && isCurrentlyActiveNonExpired) || (isPendingConfirmation && currentProfile.requestedPlanType === plan.type)) && "Request Plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       {(isCurrentlyActiveNonExpired || isPendingConfirmation) && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isCurrentlyActiveNonExpired && "To change your plan, your current subscription will be overwritten upon new request and admin approval."}
          {isPendingConfirmation && "You already have a pending subscription request."}
        </p>
      )}
       {currentProfile.subscriptionStatus === 'trial' && currentProfile.trialEndDate && !isPast(currentProfile.trialEndDate) && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          You are currently on a trial. Requesting a plan will replace your trial upon admin approval.
        </p>
       )}
    </div>
  );
}
