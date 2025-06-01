
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Target, Landmark, CreditCard, Shapes, Settings, Users, ShieldCheck, Crown, BellRing, UserCircle } from "lucide-react"; // Added UserCircle
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth"; 
import { SUPER_ADMIN_UID } from '@/config'; 
import { useSidebar } from "@/components/ui/sidebar"; 

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incomes", label: "Incomes", icon: Landmark },
  { href: "/income-categories", label: "Income Categories", icon: ListChecks },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/expense-categories", label: "Expense Categories", icon: Shapes },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/budget-goals", label: "Budget Goals", icon: Target },
  { href: "/profile", label: "Profile", icon: UserCircle }, // Added Profile
  { href: "/subscription", label: "Subscription", icon: Crown },
  // { href: "/settings", label: "Settings", icon: Settings }, 
];

const adminNavItems = [
  { href: "/admin/manage-users", label: "Manage Users", icon: ShieldCheck },
  { href: "/admin/manage-subscriptions", label: "Manage Subscriptions", icon: BellRing },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth(); 
  const { isMobile, setOpenMobile } = useSidebar(); 

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  const allNavItems = isSuperAdmin ? [...navItems, ...adminNavItems] : navItems;
  // Sort admin items to appear after regular items if desired, or maintain current order
  // For example, to ensure admin items are last:
  const finalNavItems = isSuperAdmin 
    ? [...navItems.filter(item => !adminNavItems.some(adminItem => adminItem.href === item.href)), ...adminNavItems]
    : navItems;


  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false); 
    }
  };

  return (
    <SidebarMenu>
      {finalNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              variant="default"
              className={cn(
                pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && item.href !== "/") 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "justify-start"
              )}
              isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && item.href !== "/")}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              onClick={handleLinkClick} 
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.label}
                </span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
