/**
 * Shared fetch wrapper.
 *
 * PLAN 5.2 asks for "error normalization" in the service layer, so every
 * provider client goes through here and components only ever have to reason
 * about `ApiError`. The wrapper also enforces a timeout — without one a stalled
 * request leaves the UI on a skeleton forever, which reads as a broken app.
 */

export class ApiError extends Error {
  readonly status: number | null;
  readonly url: string;
  readonly isTimeout: boolean;
  readonly isNetwork: boolean;

  constructor(
    message: string,
    options: {
      status?: number | null;
      url: string;
      isTimeout?: boolean;
      isNetwork?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.url = options.url;
    this.isTimeout = options.isTimeout ?? false;
    this.isNetwork = options.isNetwork ?? false;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** True when retrying later has a realistic chance of succeeding. */
  get isRetryable(): boolean {
    if (this.isTimeout || this.isNetwork) return true;
    if (this.status === null) return true;
    return this.status >= 500 || this.status === 429;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function getJson<T>(
  url: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Fold the caller's cancellation into ours so an unmounted component can
  // abort a request that we would otherwise keep alive until the timeout.
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    // An abort the caller asked for is not an error worth surfacing; rethrow it
    // as-is so React Query treats it as a cancellation rather than a failure.
    if (aborted && signal?.aborted) throw error;
    if (aborted) {
      throw new ApiError("The request timed out.", {
        url,
        isTimeout: true,
        cause: error,
      });
    }
    throw new ApiError("Could not reach the weather service.", {
      url,
      isNetwork: true,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }

  if (!response.ok) {
    throw new ApiError(describeStatus(response.status), {
      status: response.status,
      url,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiError("The weather service returned an unreadable response.", {
      status: response.status,
      url,
      cause: error,
    });
  }
}

function describeStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "The weather API key was rejected.";
  }
  if (status === 404) {
    return "That location could not be found.";
  }
  if (status === 429) {
    return "Too many requests — the weather service is rate limiting us.";
  }
  if (status >= 500) {
    return "The weather service is having problems.";
  }
  return `The weather service responded with ${status}.`;
}

/** Builds a query string, dropping keys whose value is null or undefined. */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  return search.toString();
}
