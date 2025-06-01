
"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast } from 'date-fns';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null; 
  loading: boolean;
  hasActiveSubscription: boolean; 
  refreshUserProfile: () => Promise<void>; // Function to manually refresh profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const fetchAndSetUserProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileDataFirebase = userDocSnap.data();
        const profile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: profileDataFirebase.photoURL || currentUser.photoURL, // Prioritize Firestore, fallback to Auth
          phoneNumber: profileDataFirebase.phoneNumber,
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

        let isActive = false;
        if (profile.subscriptionStatus === 'active' && profile.subscriptionEndDate && !isPast(profile.subscriptionEndDate)) {
          isActive = true;
        } else if (profile.subscriptionStatus === 'trial' && profile.trialEndDate && !isPast(profile.trialEndDate)) {
          isActive = true;
        }
        setHasActiveSubscription(isActive);

      } else {
        console.warn(`User profile document not found in Firestore for UID: ${currentUser.uid}. A new one might be created on next relevant action or if signup logic handles it.`);
        setUserProfile({ // Create a minimal profile from auth if Firestore doc doesn't exist
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          createdAt: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
        });
        setHasActiveSubscription(false);
      }
    } else {
      setUserProfile(null);
      setHasActiveSubscription(false);
    }
  }, []);


  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); // Set Firebase Auth user object
      // It's important that fetchAndSetUserProfile also uses the currentUser from onAuthStateChanged
      // or the user state which is just set.
      await fetchAndSetUserProfile(currentUser); 
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndSetUserProfile]);
  
  const refreshUserProfile = useCallback(async () => {
    if (auth.currentUser) { // Use auth.currentUser for refresh to get the latest from Firebase Auth
      setUser(auth.currentUser); // Update user state with latest from Auth
      await fetchAndSetUserProfile(auth.currentUser);
    }
  }, [fetchAndSetUserProfile]);


  if (loading && !userProfile && !user) {
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
    <AuthContext.Provider value={{ user, userProfile, loading, hasActiveSubscription, refreshUserProfile }}>
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
