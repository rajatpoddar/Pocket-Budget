
"use client"; // Required for QueryClientProvider

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react'; // Ensure React is imported for QueryClientProvider

// export const metadata: Metadata = { // Metadata should be in server component or moved
//   title: "Pocket Budget",
//   description: 'Daily Income & Expenses Tracker',
// };

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Metadata can be managed per-page or in a root server component layout if needed */}
        <title>Pocket Budget - Daily Income & Expenses Tracker</title>
        <meta name='description' content='Daily Income & Expenses Tracker' />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7EAFB3" />
      </head>
      <body className="font-body antialiased">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
