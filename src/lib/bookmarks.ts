/**
 * Bookmark management utilities
 * Handles localStorage persistence of bookmarked businesses
 */

const BOOKMARKS_KEY = "proximiti_bookmarks";

/**
 * Get all bookmarked business IDs from localStorage
 */
export function getBookmarkedIds(): string[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a business is bookmarked
 */
export function isBookmarked(businessId: string): boolean {
  return getBookmarkedIds().includes(businessId);
}

/**
 * Add a business to bookmarks
 */
export function addBookmark(businessId: string): void {
  const bookmarks = getBookmarkedIds();
  if (!bookmarks.includes(businessId)) {
    bookmarks.push(businessId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

/**
 * Remove a business from bookmarks
 */
export function removeBookmark(businessId: string): void {
  const bookmarks = getBookmarkedIds();
  const filtered = bookmarks.filter((id) => id !== businessId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

/**
 * Toggle bookmark for a business
 */
export function toggleBookmark(businessId: string): boolean {
  if (isBookmarked(businessId)) {
    removeBookmark(businessId);
    return false;
  } else {
    addBookmark(businessId);
    return true;
  }
}
