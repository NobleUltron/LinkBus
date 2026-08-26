import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls window to top whenever the route (pathname or search params) changes.
 * Ensures users are never left looking at the footer after clicking links.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Reset standard window/document scroll
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });

    // 2. Also reset any active main scrollable viewports if present
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [pathname, search]);

  return null;
}
