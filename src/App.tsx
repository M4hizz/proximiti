import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { CategoryBar } from "@/components/category-bar";
import { FilterRow } from "@/components/filter-row";
import { RestaurantSection } from "@/components/restaurant-section";
import { StoreGrid } from "@/components/store-grid";
import { PromoBanner } from "@/components/promo-banner";
import { speedyRestaurants, bogoRestaurants, stores } from "@/lib/data";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <CategoryBar />
          <FilterRow />
          <main>
            <PromoBanner />
            <RestaurantSection
              title="Speedy Deliveries"
              restaurants={speedyRestaurants}
            />
            <RestaurantSection
              title="Buy 1, Get 1 Free"
              restaurants={bogoRestaurants}
            />
            <StoreGrid title="Stores Near You" stores={stores} />
            <RestaurantSection
              title="Popular Near You"
              restaurants={[...speedyRestaurants].reverse()}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
