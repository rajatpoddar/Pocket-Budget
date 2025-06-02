
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
  refreshUserProfile: () => Promise<void>; 
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

        let finalCreatedAt: Date | undefined = undefined;
        const rawCreatedAt = profileDataFirebase.createdAt;
        if (rawCreatedAt) {
          if (rawCreatedAt instanceof Timestamp) { // Firestore Timestamp (most common case from Firestore)
            finalCreatedAt = rawCreatedAt.toDate();
          } else if (rawCreatedAt instanceof Date && !isNaN(rawCreatedAt.getTime())) { // Already a valid JS Date
            finalCreatedAt = rawCreatedAt;
          } else if (typeof rawCreatedAt === 'string' || typeof rawCreatedAt === 'number') { // String or number timestamp
            const d = new Date(rawCreatedAt);
            if (!isNaN(d.getTime())) finalCreatedAt = d;
            else console.warn(`User ${currentUser.uid} has invalid createdAt string/number in Firestore:`, rawCreatedAt);
          } else {
            console.warn(`User ${currentUser.uid} has an unexpected createdAt type in Firestore:`, typeof rawCreatedAt, rawCreatedAt);
          }
        }
        if (!finalCreatedAt) { // Fallback if createdAt is missing or unparseable
             console.warn(`User ${currentUser.uid} is missing a valid createdAt field in Firestore. Using auth creation time.`);
             finalCreatedAt = currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : new Date();
        }


        const profile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: profileDataFirebase.photoURL || currentUser.photoURL,
          phoneNumber: profileDataFirebase.phoneNumber,
          createdAt: finalCreatedAt,
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
        console.warn(`User profile document not found in Firestore for UID: ${currentUser.uid}. Using minimal profile from Auth.`);
        setUserProfile({ 
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
      setUser(currentUser); 
      await fetchAndSetUserProfile(currentUser); 
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndSetUserProfile]);
  
  const refreshUserProfile = useCallback(async () => {
    if (auth.currentUser) { 
      setUser(auth.currentUser); 
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
