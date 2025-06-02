
"use client";

import React from "react";
import Link from "next/link"; // Added Link
import { useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, Wallet, UserCircle } from "lucide-react"; // Added UserCircle (though not directly used here, good to have if needed)
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const LIGHT_THEME_STATUS_BAR_COLOR = "#7EAFB3"; // hsl(185 26% 60%)
const DARK_THEME_STATUS_BAR_COLOR = "#0A0A0A";   // hsl(240 10% 3.9%)

const ThemeToggle = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [hasMounted, setHasMounted] = React.useState(false);

  const updateThemeColorMeta = (isDark: boolean) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? DARK_THEME_STATUS_BAR_COLOR : LIGHT_THEME_STATUS_BAR_COLOR);
    }
  };

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  React.useEffect(() => {
    if (hasMounted) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
        updateThemeColorMeta(true); 
      } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
        updateThemeColorMeta(false);
      }
    }
  }, [hasMounted]);

  const toggleTheme = () => {
    if (!hasMounted) return;

    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if (isCurrentlyDark) { // Switching to light
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
      updateThemeColorMeta(false);
    } else { // Switching to dark
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
      updateThemeColorMeta(true);
    }
  };

  if (!hasMounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled={true}>
        <div className="h-5 w-5" data-testid="theme-icon-placeholder" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log you out. Please try again.", variant: "destructive" });
    }
  };
  
  const getAvatarFallback = (name?: string | null) => {
    if (!name) return "PB"; 
    const parts = name.split(" ");
    if (parts.length > 1 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Wallet className="w-6 h-6 text-sidebar-foreground flex-shrink-0" />
            <h1 className="text-xl font-semibold text-sidebar-foreground font-headline truncate">
              {user?.displayName ? `${user.displayName}'s Budget` : "Pocket Budget"}
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <Link href="/profile" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden flex-grow min-w-0 hover:bg-sidebar-accent/50 p-1 rounded-md transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || `https://placehold.co/40x40.png?text=${getAvatarFallback(user?.displayName)}`} alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>{getAvatarFallback(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="text-sm truncate">
              <p className="font-medium text-sidebar-foreground truncate">{user?.displayName || "User"}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
            </div>
          </Link>
          {/* Icon-only view for profile link when sidebar is collapsed */}
          <Link href="/profile" className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full p-1 hover:bg-sidebar-accent/50 rounded-md transition-colors" title="Profile">
             <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || `https://placehold.co/40x40.png?text=${getAvatarFallback(user?.displayName)}`} alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>{getAvatarFallback(user?.displayName)}</AvatarFallback>
            </Avatar>
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mt-2" onClick={handleLogout} title="Log out">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-2 ml-auto">
                 <ThemeToggle />
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto min-h-0">
            {children}
        </main>
        <footer className="p-6 text-center text-xs text-muted-foreground border-t">
          <p className="mb-2">
            © 2025 Pocket Budget - Made with ❤️ by Rajat Poddar.
          </p>
          <div className="flex justify-center items-center gap-x-4">
            <a 
              href="https://github.com/rajatpoddar/poddarsbudget" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              GitHub
            </a>
            <a 
              href="https://pocketbdgt.fun/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              pocketbdgt.fun
            </a>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
