/**
 * TanStack Query configuration.
 *
 * PLAN 5.2 wants aggressive caching with intelligent invalidation, and PLAN 4.6
 * wants the app to never show a blank screen. Those two combine into a client
 * that keeps serving the last good payload while a refetch is in flight or
 * failing, and only surfaces an error when there is genuinely nothing cached to
 * fall back on.
 */

import { QueryClient } from "@tanstack/react-query";
import { MAX_CACHE_AGE } from "../config";
import type { ApiError } from "../api/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Per-query staleTime is set by the hooks from the table in config.ts.
      staleTime: 10 * 60 * 1000,
      gcTime: MAX_CACHE_AGE,
      // Serving stale data beats a spinner, so keep the previous payload on
      // screen for the whole refetch rather than dropping to a skeleton.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      placeholderData: (previous: unknown) => previous,
      retry: (failureCount, error) => {
        // ApiError knows whether a retry could plausibly help; a 404 never will.
        const retryable = (error as Partial<ApiError>).isRetryable;
        if (retryable === false) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});
