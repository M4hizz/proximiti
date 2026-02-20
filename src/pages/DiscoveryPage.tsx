import { useState } from "react";
import {
  Search,
  Mic,
  Bell,
  SlidersHorizontal,
  Locate,
  TrendingUp,
  Bookmark,
  ThumbsUp,
  Flame,
  Sparkles,
} from "lucide-react";

export function DiscoveryPage() {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="h-[calc(100vh-65px)] w-full overflow-hidden flex flex-col bg-[#102216]">
      {/* TOP SECTION: MAP (60%) */}
      <div className="relative h-[62%] w-full flex-shrink-0 group/map">
        {/* Map Background Layer */}
        <div
          className="absolute inset-0 w-full h-full bg-[#0c120e]"
          style={{
            backgroundImage: `radial-gradient(#1e3626 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.03) 2px, transparent 2px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 2px, transparent 2px)`,
            backgroundSize: "20px 20px, 100px 100px, 100px 100px",
            backgroundPosition: "0 0, -20px -20px, -20px -20px",
          }}
        >
          {/* Simulated Streets/Blocks */}
          <div className="absolute top-[20%] left-0 w-full h-[8px] bg-[#1a2e22]/50 transform -rotate-6"></div>
          <div className="absolute top-[60%] left-0 w-full h-[12px] bg-[#1a2e22]/50 transform rotate-3"></div>
          <div className="absolute top-0 right-[30%] h-full w-[8px] bg-[#1a2e22]/50 transform rotate-12"></div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0c120e] to-transparent pointer-events-none z-0"></div>

        {/* Search Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pb-4">
          <div className="flex w-full items-center gap-3">
            <div className="flex flex-1 h-12 shadow-lg shadow-black/20 rounded-xl bg-[#1c271f]/90 backdrop-blur-md border border-white/5">
              <div className="flex w-full items-stretch rounded-xl h-full">
                <div className="text-[#9db9a6] flex items-center justify-center pl-4 pr-2">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  className="flex w-full min-w-0 flex-1 bg-transparent border-none text-white placeholder:text-[#9db9a6] focus:ring-0 text-base font-medium px-0 outline-none"
                  placeholder="Search nearby spots..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                <button className="flex items-center justify-center px-4 text-[#9db9a6]">
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            </div>
            <button className="flex size-12 items-center justify-center rounded-xl bg-[#1c271f]/90 backdrop-blur-md border border-white/5 shadow-lg shadow-black/20 active:scale-95 transition-transform">
              <Bell className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Map Pins */}
        {/* Pin 1: Primary Glowing Pin (Active) */}
        <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer">
          <div className="relative flex items-center justify-center">
            {/* Pulse Effect */}
            <div className="absolute w-24 h-24 bg-[#13ec5b]/20 rounded-full animate-ping opacity-75"></div>
            {/* Outer Glow Ring */}
            <div className="absolute w-12 h-12 bg-[#13ec5b]/30 rounded-full blur-sm"></div>
            {/* Core Pin */}
            <div className="relative w-4 h-4 bg-[#13ec5b] rounded-full shadow-[0_0_10px_#13ec5b] border-2 border-white"></div>
          </div>
          {/* Label */}
          <div className="bg-[#102216]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-[#13ec5b]/30 shadow-lg transform transition-all hover:scale-105">
            <span className="text-xs font-bold text-white whitespace-nowrap">
              Neon Cat Jazz
            </span>
          </div>
        </div>

        {/* Pin 2: Secondary Pin */}
        <div className="absolute top-[30%] right-[15%] z-0 flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-3 h-3 bg-white rounded-full shadow-lg border border-[#102216]"></div>
        </div>

        {/* Pin 3: Secondary Pin */}
        <div className="absolute bottom-[35%] left-[20%] z-0 flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-3 h-3 bg-white rounded-full shadow-lg border border-[#102216]"></div>
        </div>

        {/* Pin 4: Cafe Pin */}
        <div className="absolute top-[55%] left-[15%] z-0 flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#1e3626] border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-[#13ec5b] group-hover:text-[#102216] transition-colors">
            <span className="text-sm">☕</span>
          </div>
        </div>

        {/* User Location */}
        <div className="absolute bottom-[20%] left-[50%] translate-y-12 translate-x-12 z-0">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
          </div>
        </div>

        {/* FAB (Filter) */}
        <div className="absolute bottom-10 right-5 z-20">
          <button className="flex items-center justify-center size-14 rounded-full bg-[#1e3626] text-white shadow-lg border border-white/10 hover:bg-[#16291d] transition-colors active:scale-95">
            <SlidersHorizontal className="w-6 h-6" />
          </button>
        </div>

        {/* FAB (Location) */}
        <div className="absolute bottom-28 right-5 z-20">
          <button className="flex items-center justify-center size-14 rounded-full bg-white text-[#102216] shadow-lg hover:bg-gray-100 transition-colors active:scale-95">
            <Locate className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* BOTTOM SECTION: DRAWER (40%) */}
      <div className="relative flex-1 -mt-6 w-full bg-[#102216]/95 backdrop-blur-xl rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] z-30 flex flex-col border-t border-white/5">
        {/* Drag Handle */}
        <div className="flex flex-col items-center pt-3 pb-1 w-full cursor-grab active:cursor-grabbing">
          <div className="h-1.5 w-12 rounded-full bg-white/20"></div>
        </div>

        {/* Drawer Content Container */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-4 pb-2 flex-shrink-0">
            <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">
              Recommended for you
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Sparkles className="text-[#13ec5b] w-4 h-4" />
              <p className="text-[#9db9a6] text-sm font-medium">
                Based on your Friday night habits
              </p>
            </div>
          </div>

          {/* Scrollable Cards */}
          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2 scrollbar-hide">
            <div className="flex flex-col gap-4">
              {/* Card 1: Primary Recommendation */}
              <div className="group relative flex flex-col bg-[#16291d] rounded-[24px] p-3 border border-white/5 shadow-lg active:scale-[0.98] transition-transform duration-200">
                {/* Image Area */}
                <div className="relative h-40 w-full rounded-[18px] overflow-hidden bg-gray-800">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD7rN585hMC9StIDxHXdfgAXx0XRhZg2LVwdsFCfBUVGPhe86wqqQtyHVj3YABqwKgP-Jvx5m_ZIJLraa2QLTEJMb8Sdc1SF-3kiytNdM7-hU713RzrcdyLC3HtKIpqZpi1Zh1B5QkihVTYDPr8JpWgQ7TPuF3KGbBc4wNjaOxRmHph72SDbsWTiT7efaDyA1KzlmAjQKL4S7wQ1tXaLl1kr0jY7pTNLwnAZmTbuo6E6fbp_Cd0z61UAq_MV6QGrwohnn09fNLRVu_t')",
                    }}
                  ></div>
                  <div className="absolute top-3 left-3 bg-[#13ec5b] text-[#102216] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                    <TrendingUp className="w-3.5 h-3.5" />
                    98% Match
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-lg border border-white/10">
                    0.2 mi
                  </div>
                </div>

                {/* Content */}
                <div className="pt-3 pb-1 px-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white text-lg font-bold leading-tight">
                        The Neon Cat Jazz Bar
                      </h3>
                      <p className="text-[#9db9a6] text-sm mt-0.5">
                        Live Music • Open until 3 AM
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e3626] border border-white/5 text-[#13ec5b]">
                      <Bookmark className="w-5 h-5 fill-current" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-md bg-white/5 text-[#9db9a6] text-xs font-medium border border-white/5">
                      Cozy
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white/5 text-[#9db9a6] text-xs font-medium border border-white/5">
                      Cocktails
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#13ec5b]/10 text-[#13ec5b] text-xs font-medium border border-[#13ec5b]/10">
                      Popular Now
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="flex bg-[#16291d] rounded-[24px] p-3 border border-white/5 shadow-lg items-center gap-4 active:scale-[0.98] transition-transform duration-200">
                <div
                  className="relative h-24 w-24 flex-shrink-0 rounded-[18px] overflow-hidden bg-gray-800 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB70_l-sSTmOUeVfNZIV6K7TqTdyG0hf6nSjbASBDjeESqNbGkQqxh6komeBv4WteZzdJNogy-fNj2BcYsNLJqs3cV4F20UTMuNcAy25ryJiCuBFbkBFQ55_NG7ondLb017fXt1XP-S-tszT2w39U-hFeN-1iD5OZOknxZQcJPWVH_TOLOtVBSYk4ISV8NPE9kLk-CfKFbiT_L6yzWUGXl_ZwL6SmiOGqcJdi7ewRquX7Mw6ZxbWKHFNSSC8mkn0GyqVwIL1swXmLpD')",
                  }}
                ></div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white text-base font-bold truncate">
                      Night Shift Ramen
                    </h3>
                    <span className="text-[#9db9a6] text-xs whitespace-nowrap">
                      0.8 mi
                    </span>
                  </div>
                  <p className="text-[#9db9a6] text-xs mb-2 truncate">
                    Japanese • Late Night Eats
                  </p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3b5443]/30 text-[#9db9a6] text-[10px] font-medium border border-[#3b5443]">
                    <ThumbsUp className="w-3 h-3" />
                    Similar to Tokyo Den
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="flex bg-[#16291d] rounded-[24px] p-3 border border-white/5 shadow-lg items-center gap-4 active:scale-[0.98] transition-transform duration-200">
                <div
                  className="relative h-24 w-24 flex-shrink-0 rounded-[18px] overflow-hidden bg-gray-800 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC2FSI9FYWJa6TYZ2RpBlFeXyX_MDiWSwpBXtNC-VgvZ-3ZlZBiEWxXjRj89bukIMbwd9hP7HtRjbxWGwvko_bfOj5d1URG6oEgTLe5ovls6UuZ-cFdDOJJB3v6nZaVUnpPI7rBIQ9yBNt-PNmUpI53eQoRUlh2ZRKLFdEtV9JmZF231kIUaT8Mi9oskL7CcmHdVxC3n8weDTM4ePQZgwsXQjwAuXb4NZz7cRlCmjIFEID3hfDgnK4pAzOMaEoBbnnNka9TL2b1i8ZV')",
                  }}
                ></div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white text-base font-bold truncate">
                      Echo Lounge
                    </h3>
                    <span className="text-[#9db9a6] text-xs whitespace-nowrap">
                      1.2 mi
                    </span>
                  </div>
                  <p className="text-[#9db9a6] text-xs mb-2 truncate">
                    Speakeasy • Craft Drinks
                  </p>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#13ec5b]/10 text-[#13ec5b] text-[10px] font-medium border border-[#13ec5b]/20">
                    <Flame className="w-3 h-3" />
                    Hot Spot
                  </div>
                </div>
              </div>

              {/* Spacer for bottom safe area */}
              <div className="h-6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiscoveryPage;
