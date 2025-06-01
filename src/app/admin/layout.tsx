
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Not using AppLayout here for a distinct admin feel, but could be added if desired.
// import AppLayout from '@/components/layout/app-layout'; 
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from "@/components/ui/skeleton";
import { SUPER_ADMIN_UID } from '@/config';
import { useToast } from '@/hooks/use-toast';

export default function AdminAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast: showToast } = useToast(); // Aliased to avoid potential local scope conflicts

  useEffect(() => {
    if (!loading) {
      if (!user) {
        showToast({ title: "Access Denied", description: "You must be logged in to access this area.", variant: "destructive" });
        router.push('/login');
      } else if (user.uid !== SUPER_ADMIN_UID) {
        // The userProfile?.isAdmin check can be re-added if you implement role-based admin access via Firestore field
        // else if (user.uid !== SUPER_ADMIN_UID && userProfile?.isAdmin !== true) {
        showToast({ title: "Access Denied", description: "You do not have permission to access the admin area.", variant: "destructive" });
        router.push('/dashboard'); // Redirect non-admins to dashboard
      }
    }
  }, [user, userProfile, loading, router, showToast]);

  if (loading || !user || (user.uid !== SUPER_ADMIN_UID /* && userProfile?.isAdmin !== true */)) {
    // Show loading skeleton or a simple loading message until auth state is resolved or if access is denied
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8 bg-card shadow-xl rounded-lg">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <p className="text-center text-muted-foreground pt-2">Verifying access to admin area...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and is SUPER_ADMIN, render the admin content
  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-semibold font-headline">Pocket Budget - Admin Panel</h1>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-sm hover:underline"
            title="Back to Main App"
          >
            Back to App
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 container mx-auto">
        {children}
      </main>
      <footer className="text-center p-4 text-xs text-muted-foreground border-t">
        Pocket Budget Admin Area
      </footer>
    </div>
  );
}
