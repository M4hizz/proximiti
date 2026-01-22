import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Store,
  Wine,
  Heart,
  ShoppingBag,
  Dog,
  Flower2,
  Baby,
  Sparkles,
  Cpu,
  Tag,
  UserPlus,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ShoppingCart, label: "Map", href: "/discovery" },
  { icon: Store, label: "Convenience", href: "/convenience" },
  { icon: Wine, label: "Alcohol", href: "/alcohol" },
  { icon: Heart, label: "Health", href: "/health" },
  { icon: ShoppingBag, label: "Retail", href: "/retail" },
  { icon: Dog, label: "Pet", href: "/pet" },
  { icon: Flower2, label: "Flowers", href: "/flowers" },
  { icon: Baby, label: "Baby", href: "/baby" },
  { icon: Sparkles, label: "Personal Care", href: "/personal-care" },
  { icon: Cpu, label: "Electronics", href: "/electronics" },
];

const bottomNavItems = [
  { icon: Tag, label: "Offers", href: "/offers" },
  { icon: UserPlus, label: "Sign up", href: "/signup" },
  { icon: User, label: "Log in", href: "/login" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (href: string, label: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-background border-r border-border h-[calc(100vh-65px)] sticky top-[65px] shrink-0">
      <nav className="flex flex-col py-2">
        {/* Main navigation items */}
        <div className="flex flex-col">
          {mainNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.href, item.label)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="my-3 mx-4 border-t border-border" />

        {/* Bottom navigation items */}
        <div className="flex flex-col">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.href, item.label)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </aside>
  );
}
