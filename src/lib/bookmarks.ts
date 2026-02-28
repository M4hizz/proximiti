const BOOKMARKS_KEY = "proximiti_bookmarks";

export function getBookmarkedIds(): string[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(businessId: string): boolean {
  return getBookmarkedIds().includes(businessId);
}

export function addBookmark(businessId: string): void {
  const bookmarks = getBookmarkedIds();
  if (!bookmarks.includes(businessId)) {
    bookmarks.push(businessId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(businessId: string): void {
  const bookmarks = getBookmarkedIds();
  const filtered = bookmarks.filter((id) => id !== businessId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export function toggleBookmark(businessId: string): boolean {
  if (isBookmarked(businessId)) {
    removeBookmark(businessId);
    return false;
  } else {
    addBookmark(businessId);
    return true;
  }
}
