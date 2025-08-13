import { useState, useEffect, useMemo, useCallback } from "react";

/**
 * Custom hook for managing lazy-loaded options with search and infinite scroll
 * @param {Array} allOptions - All available options
 * @param {number} pageSize - Number of options to load per page
 * @param {string} searchTerm - Current search term
 * @returns {Object} - { visibleOptions, loadMore, hasMore, reset }
 */
export const useLazyOptions = (
  allOptions = [],
  pageSize = 10,
  searchTerm = ""
) => {
  const [loadedCount, setLoadedCount] = useState(pageSize);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allOptions;
    return allOptions.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allOptions, searchTerm]);

  // Get currently visible options
  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, loadedCount);
  }, [filteredOptions, loadedCount]);

  // Check if there are more options to load
  const hasMore = loadedCount < filteredOptions.length;

  // Load more options
  const loadMore = useCallback(() => {
    if (hasMore) {
      setLoadedCount((prev) =>
        Math.min(prev + pageSize, filteredOptions.length)
      );
    }
  }, [hasMore, pageSize, filteredOptions.length]);

  // Reset to initial state
  const reset = useCallback(() => {
    setLoadedCount(pageSize);
  }, [pageSize]);

  // Reset when search term changes
  useEffect(() => {
    setLoadedCount(pageSize);
  }, [searchTerm, pageSize]);

  // Reset when all options change
  useEffect(() => {
    setLoadedCount(pageSize);
  }, [allOptions, pageSize]);

  return {
    visibleOptions,
    filteredOptions,
    loadMore,
    hasMore,
    reset,
    loadedCount,
    totalCount: filteredOptions.length,
  };
};

export default useLazyOptions;
