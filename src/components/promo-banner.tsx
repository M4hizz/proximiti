import { Gift } from "lucide-react";

export function PromoBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="bg-muted rounded-2xl p-6 flex items-center gap-4">
        <div className="bg-accent text-accent-foreground p-3 rounded-full">
          <Gift className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground">Get $0 Delivery Fee</h3>
          <p className="text-sm text-muted-foreground">
            Join Uber One for free delivery and more benefits
          </p>
        </div>
        <button className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium hover:bg-foreground/90 transition-colors">
          Try free for 1 month
        </button>
      </div>
    </div>
  );
}
