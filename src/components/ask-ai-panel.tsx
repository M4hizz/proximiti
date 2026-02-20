import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  MapPin,
  Star,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
  Search,
  Clock,
  LocateOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number | null;
  address: string | null;
  category: string;
  cuisine: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  featureMatches: string[];
  matchReason: string;
  score: number;
  image?: string;
  reviewCount?: number;
};

type AIParsed = {
  category: string;
  keywords: string[];
  description?: string;
};

// Loading step messages shown sequentially while searching
const LOADING_STEPS = [
  "Asking AI to understand your query…",
  "Searching nearby businesses…",
  "AI is ranking results by relevance…",
  "Generating match explanations…",
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
  onSelectResult: (result: AIResult) => void;
};

// ─── Example queries shown as chips ──────────────────────────────────────────
const EXAMPLE_QUERIES = [
  "quiet coffee shop with wifi",
  "cheap breakfast spot nearby",
  "romantic dinner restaurant",
  "late night pizza place",
  "family friendly cafe",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AskAIPanel({
  isOpen,
  onClose,
  userLocation,
  onSelectResult,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState<AIResult[]>([]);
  const [parsed, setParsed] = useState<AIParsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSearch = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 3) return;

    setQuery(trimmed);
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setResults([]);
    setMessage(null);
    setHasSearched(true);

    // Advance loading step indicator every ~2.5s
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    let step = 0;
    loadingTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
      if (step >= LOADING_STEPS.length - 1 && loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    }, 2500);

    try {
      const apiBase =
        import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
      const resp = await fetch(`${apiBase}/ai-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: trimmed,
          lat: userLocation?.[0],
          lng: userLocation?.[1],
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error ?? "AI search failed");
      }

      setResults(data.results ?? []);
      setParsed(data.parsed ?? null);
      setMessage(data.message ?? null);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={handleBackdropClick}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] animate-slideDown"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 rounded-lg">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">
              Ask AI
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Describe what you're looking for in plain English
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. quiet coffee shop with wifi…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={loading || query.trim().length < 3}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 rounded-xl shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* No-location warning */}
          {!userLocation && (
            <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <LocateOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No location set — results will use a default area. Use{" "}
                <button onClick={onClose} className="underline font-medium">
                  Locate Me
                </button>{" "}
                in the search bar for nearby results.
              </p>
            </div>
          )}

          {/* Example query chips */}
          {!hasSearched && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {EXAMPLE_QUERIES.map((eq) => (
                <button
                  key={eq}
                  onClick={() => handleSearch(eq)}
                  className="px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {eq}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable results area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3 pt-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
                />
              ))}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    {LOADING_STEPS[loadingStep]}
                  </p>
                </div>
                <div className="flex gap-1">
                  {LOADING_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= loadingStep
                          ? "bg-violet-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Search failed
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message ?? "No businesses found for your query."}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Try a different description or broaden your search.
              </p>
            </div>
          )}

          {/* Parsed query summary */}
          {!loading && !error && results.length > 0 && parsed && (
            <div className="pt-1">
              {parsed.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 italic">
                  {parsed.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Found:
                </span>
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs rounded-full font-medium">
                  {parsed.category}
                </span>
                {parsed.keywords.slice(0, 5).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading &&
            !error &&
            results.map((result, idx) => (
              <AIResultCard
                key={result.id}
                result={result}
                rank={idx + 1}
                onSelect={() => {
                  onSelectResult(result);
                  onClose();
                }}
              />
            ))}
        </div>

        {/* Footer note */}
        {!loading && results.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Click a result to view it on the map
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Individual result card ───────────────────────────────────────────────────

function AIResultCard({
  result,
  rank,
  onSelect,
}: {
  result: AIResult;
  rank: number;
  onSelect: () => void;
}) {
  const categoryLabel = result.cuisine
    ? `${result.category} · ${result.cuisine}`
    : result.category;

  // Score colour: green ≥70, amber ≥45, gray otherwise
  const scoreColor =
    result.score >= 70
      ? "bg-green-500"
      : result.score >= 45
        ? "bg-amber-400"
        : "bg-gray-400";

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
            {rank}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + score bar + chevron */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {result.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Match score pill */}
              <span
                className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${scoreColor}`}
                title={`Match score: ${result.score}%`}
              >
                {result.score}%
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
            </div>
          </div>

          {/* Category + distance + rating */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {categoryLabel}
            </span>
            {result.distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="w-3 h-3" />
                {result.distanceKm} km
              </span>
            )}
            {result.rating !== null && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {result.rating}
              </span>
            )}
          </div>

          {/* AI match reason */}
          <p className="mt-1.5 text-xs text-violet-600 dark:text-violet-400 italic line-clamp-2">
            ✨ {result.matchReason}
          </p>

          {/* Confirmed feature matches */}
          {result.featureMatches?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.featureMatches.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] rounded-full border border-green-200 dark:border-green-800"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          {result.address && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {result.address}
            </p>
          )}

          {/* Opening hours */}
          {result.openingHours && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              {result.openingHours}
            </p>
          )}

          {/* Website link */}
          {result.website && (
            <a
              href={result.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1 text-xs text-blue-500 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Visit website
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
