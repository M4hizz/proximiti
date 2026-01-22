import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart, MapPin, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const navigate = useNavigate();
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [cartCount] = useState(0);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="text-xl font-bold tracking-tight">Proximiti</h1>

          {/* Delivery/Pickup Toggle */}
          <div className="hidden md:flex items-center bg-muted rounded-full p-1">
            <button
              onClick={() => setDeliveryMode("delivery")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                deliveryMode === "delivery"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Delivery
            </button>
            <button
              onClick={() => setDeliveryMode("pickup")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                deliveryMode === "pickup"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Pickup
            </button>
          </div>

          {/* Location */}
          <button className="hidden lg:flex items-center gap-2 text-sm hover:bg-muted px-3 py-2 rounded-full transition-colors">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">New York, NY</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Uber Eats"
              className="w-full bg-muted rounded-full pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="relative rounded-full">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {cartCount}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex items-center gap-2 rounded-full"
            onClick={() => navigate("/login")}
          >
            <span>Log in</span>
          </Button>

          <Button
            size="sm"
            className="rounded-full"
            onClick={() => navigate("/login")}
          >
            Sign up
          </Button>
        </div>
      </div>
    </header>
  );
}
