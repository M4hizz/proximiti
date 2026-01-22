import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { CategoryBar } from "@/components/category-bar";
import { FilterRow } from "@/components/filter-row";
import { RestaurantSection } from "@/components/restaurant-section";
import { StoreGrid } from "@/components/store-grid";
import { PromoBanner } from "@/components/promo-banner";
import { LoginPage } from "@/pages/LoginPage";
import { DiscoveryPage } from "@/pages/DiscoveryPage";
import { speedyRestaurants, bogoRestaurants, stores } from "@/lib/data";

function HomePage() {
  return (
    <>
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
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex">
                <HomePage />
              </div>
            }
          />
          <Route
            path="/login"
            element={
              <div className="flex">
                <Sidebar />
                <div className="flex-1 min-w-0">
                  <LoginPage />
                </div>
              </div>
            }
          />
          <Route
            path="/discovery"
            element={
              <div className="flex">
                <Sidebar />
                <div className="flex-1 min-w-0">
                  <DiscoveryPage />
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
