
"use client"; // Required for QueryClientProvider

// import type { Metadata } from 'next'; // Metadata export is for Server Components
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react'; // Ensure React is imported for QueryClientProvider

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = "https://pocketbdgt.fun";
  const siteName = "Pocket Budget";
  const title = "Pocket Budget: Smart Income & Expense Tracker | Manage Your Finances";
  const description = "Take control of your finances with Pocket Budget! Easily track daily income and expenses, manage freelance projects, set budget goals, and gain financial clarity. Start your free trial today.";
  const keywords = "personal finance tracker, expense manager, income tracker, budgeting app, freelance finance, daily expense tracker, budget goals, financial planning, pocket budget";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={siteUrl} />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="/og-image.png" data-ai-hint="app interface finance" />
        <meta property="og:image:alt" content={siteName} />
        <meta property="og:site_name" content={siteName} />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={siteUrl} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content="/og-image.png" data-ai-hint="app logo finance" />
        <meta name="twitter:image:alt" content={siteName} />
        {/* <meta name="twitter:site" content="@YourTwitterHandle" /> */}
        {/* <meta name="twitter:creator" content="@YourTwitterHandle" /> */}
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
