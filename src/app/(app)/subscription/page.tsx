
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
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); 
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
      let firestoreUpdateData: any;
      let toastDescription: string;

      const isActiveTrial = currentProfile.subscriptionStatus === 'trial' && currentProfile.trialEndDate && !isPast(currentProfile.trialEndDate);

      if (isActiveTrial) {
        // User is on an active trial, just update requestedPlanType
        firestoreUpdateData = {
          requestedPlanType: plan,
        };
        toastDescription = `Your request for the ${plan} plan has been noted. Your trial continues until ${format(currentProfile.trialEndDate!, "PPP")}.`;
        
      } else {
        // User is not on an active trial (or trial expired), set to pending_confirmation
        firestoreUpdateData = {
          subscriptionStatus: 'pending_confirmation',
          requestedPlanType: plan,
          planType: 'none', 
          subscribedAt: null, 
          subscriptionEndDate: null,
        };
        toastDescription = `Your request for the ${plan} plan is pending admin approval.`;
      }

      await updateDoc(doc(db, "users", user.uid), firestoreUpdateData);
      
      // After updating Firestore, refresh the profile from AuthProvider
      // This will trigger the useEffect to update local currentProfile
      await refreshUserProfile(); 

      toast({ title: "Subscription Request Sent!", description: toastDescription });

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
      let trialText = `You are on a trial`;
      if (trialEndDate) {
        if (isPast(trialEndDate)) {
          trialText = `Your trial ended on ${format(trialEndDate, "PPP")}.`;
          if (requestedPlanType) {
            trialText += ` Your request for the ${requestedPlanType} plan is pending.`;
            return { text: trialText, badgeVariant: "secondary" as const, icon: Hourglass }; 
          }
          return { text: trialText + " Please subscribe.", badgeVariant: "destructive" as const, icon: AlertCircle };
        }
        trialText += `, ending on ${format(trialEndDate, "PPP")}`;
      }
      if (requestedPlanType) {
        trialText += `. Your request for the ${requestedPlanType} plan is pending.`;
      }
      return { text: trialText + ".", badgeVariant: "secondary" as const, icon: Sparkles };
    }
    if (subscriptionStatus === 'active' && planType && subscriptionEndDate) {
      if (isPast(subscriptionEndDate)) {
         let expiredText = `Your ${planType} subscription expired on ${format(subscriptionEndDate, "PPP")}.`;
         if (requestedPlanType) {
            expiredText += ` Your request for the ${requestedPlanType} plan is pending.`;
            return { text: expiredText, badgeVariant: "secondary" as const, icon: Hourglass };
         }
        return { text: expiredText + " Please renew.", badgeVariant: "destructive" as const, icon: CalendarDays };
      }
       let activeText = `Active ${planType} plan. Renews on ${format(subscriptionEndDate, "PPP")}.`;
       if (requestedPlanType && requestedPlanType !== planType) { // Show pending request only if different from current active plan
        activeText += ` A request to change to the ${requestedPlanType} plan is pending.`;
       }
      return { text: activeText, badgeVariant: "default" as const, icon: CheckCircle2 };
    }
    if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
         let statusText = `Your subscription is ${subscriptionStatus}.`;
          if (requestedPlanType) {
            statusText += ` Your request for the ${requestedPlanType} plan is pending.`;
             return { text: statusText, badgeVariant: "secondary" as const, icon: Hourglass };
          }
         return { text: statusText, badgeVariant: "destructive" as const, icon: CalendarDays };
    }

    let defaultText = "No active subscription.";
    if (requestedPlanType) {
        defaultText = `Your request for the ${requestedPlanType} plan is pending admin approval.`;
         return { text: defaultText, badgeVariant: "secondary" as const, icon: Hourglass };
    }
    return { text: defaultText, badgeVariant: "outline" as const, icon: Crown };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  if (authLoading && !currentProfile) { // Display skeleton if auth is loading and currentProfile isn't set yet
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
  
  if (!user) { // Should ideally be handled by parent layout, but good to have a check
    return <p>Please log in to manage your subscription.</p>;
  }


  const plans = [
    { type: 'monthly' as PlanType, name: "Monthly Plan", price: "₹199", duration: "per month", features: ["Full access to all features", "Standard support"] },
    { type: 'yearly' as PlanType, name: "Yearly Plan", price: "₹1999", duration: "per year", features: ["Full access to all features", "Priority support", "Save over 15%"] },
  ];

  const isCurrentlyActiveNonExpired = currentProfile?.subscriptionStatus === 'active' && currentProfile.subscriptionEndDate && !isPast(currentProfile.subscriptionEndDate);
  const isActiveTrialNonExpired = currentProfile?.subscriptionStatus === 'trial' && currentProfile.trialEndDate && !isPast(currentProfile.trialEndDate);
  
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-3">Subscription Plans</h1>
        <p className="text-muted-foreground text-lg">Choose the plan that works best for you. Admin approval required.</p>
      </div>

      {currentProfile && (
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
      )}


      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isThisPlanActive = currentProfile?.planType === plan.type && isCurrentlyActiveNonExpired;
          const isThisPlanRequested = currentProfile?.requestedPlanType === plan.type && 
                                     (currentProfile?.subscriptionStatus === 'pending_confirmation' || 
                                      isActiveTrialNonExpired || // If on trial and requested this plan
                                      (isCurrentlyActiveNonExpired && currentProfile?.planType !== plan.type)); // If active on another plan but requested this one

          let buttonText = "Request Plan";
          let buttonDisabled = isProcessing;

          if (isThisPlanActive && !isThisPlanRequested) { 
            buttonText = "Currently Active";
          } else if (isThisPlanRequested) {
             buttonText = "Request Pending";
             buttonDisabled = true;
          }


          return (
            <Card key={plan.type} className={`shadow-xl flex flex-col ${isThisPlanActive ? 'border-2 border-green-500' : ''}`}>
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
                  disabled={buttonDisabled || (isThisPlanActive && !isThisPlanRequested)} // Disable if this plan is already active and no different plan is requested
                >
                  {isProcessing && currentProfile?.requestedPlanType === plan.type ? "Processing..." : buttonText}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
       {(isCurrentlyActiveNonExpired && currentProfile?.requestedPlanType && currentProfile.planType !== currentProfile.requestedPlanType) && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          You have an active '{currentProfile.planType}' subscription. Your request to change to the '{currentProfile.requestedPlanType}' plan is pending. If approved, it will overwrite your current plan.
        </p>
      )}
       {(isActiveTrialNonExpired && currentProfile?.requestedPlanType) && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Your trial is active. Your request for the '{currentProfile.requestedPlanType}' plan is pending. If approved, your chosen plan will start after admin confirmation or when your trial ends, based on admin's action.
        </p>
      )}
    </div>
  );
}
