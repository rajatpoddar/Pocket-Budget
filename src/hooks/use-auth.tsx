
"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast } from 'date-fns';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null; 
  loading: boolean;
  hasActiveSubscription: boolean; // New helper state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileDataFirebase = userDocSnap.data();
          const profile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            createdAt: profileDataFirebase.createdAt instanceof Timestamp ? profileDataFirebase.createdAt.toDate() : new Date(profileDataFirebase.createdAt),
            subscriptionStatus: profileDataFirebase.subscriptionStatus,
            planType: profileDataFirebase.planType,
            requestedPlanType: profileDataFirebase.requestedPlanType,
            trialEndDate: profileDataFirebase.trialEndDate instanceof Timestamp ? profileDataFirebase.trialEndDate.toDate() : (profileDataFirebase.trialEndDate ? new Date(profileDataFirebase.trialEndDate) : undefined),
            subscriptionEndDate: profileDataFirebase.subscriptionEndDate instanceof Timestamp ? profileDataFirebase.subscriptionEndDate.toDate() : (profileDataFirebase.subscriptionEndDate ? new Date(profileDataFirebase.subscriptionEndDate) : undefined),
            subscribedAt: profileDataFirebase.subscribedAt instanceof Timestamp ? profileDataFirebase.subscribedAt.toDate() : (profileDataFirebase.subscribedAt ? new Date(profileDataFirebase.subscribedAt) : undefined),
            isAdmin: profileDataFirebase.isAdmin || false,
          };
          setUserProfile(profile);

          // Calculate hasActiveSubscription
          let isActive = false;
          if (profile.subscriptionStatus === 'active' && profile.subscriptionEndDate && !isPast(profile.subscriptionEndDate)) {
            isActive = true;
          } else if (profile.subscriptionStatus === 'trial' && profile.trialEndDate && !isPast(profile.trialEndDate)) {
            isActive = true;
          }
          setHasActiveSubscription(isActive);

        } else {
          console.warn(`User profile document not found in Firestore for the currently logged-in user (UID: ${currentUser.uid}). This profile is usually created during signup.`);
          setUserProfile(null);
          setHasActiveSubscription(false);
        }
      } else {
        setUserProfile(null);
        setHasActiveSubscription(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-1/2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, hasActiveSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
