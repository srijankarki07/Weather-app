import type { ReactNode } from "react";
import styles from "./ErrorState.module.css";
import { Button } from "./Button";
import { AlertIcon, RefreshIcon } from "./icons";

export interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  /** Extra controls, e.g. "search for a city instead". */
  children?: ReactNode;
}

/**
 * The last resort: no data, no cache, nothing to show. Copy is written to say
 * what the user can do next rather than to describe the failure.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  children,
}: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <AlertIcon className={styles.icon} size={28} />
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
      </div>
      <div className={styles.actions}>
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            <RefreshIcon size={18} />
            Try again
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}

export interface StaleBannerProps {
  /** Pre-formatted, e.g. "23 minutes ago". */
  lastUpdated: string;
  offline?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * Shown when the app is displaying cached data — offline, or a refetch that
 * failed. PLAN 4.8 asks for exactly this: a subtle indicator plus the timestamp
 * of the last successful fetch, so stale numbers are never mistaken for live
 * ones.
 */
export function StaleBanner({
  lastUpdated,
  offline = false,
  onRefresh,
  refreshing = false,
}: StaleBannerProps) {
  return (
    <div className={styles.banner} role="status">
      <AlertIcon className={styles.bannerIcon} size={18} />
      <span>
        {offline ? "You are offline. " : "Could not refresh. "}
        Showing the forecast from {lastUpdated}.
      </span>
      {onRefresh && (
        <span className={styles.bannerActions}>
          <Button
            variant="tertiary"
            onClick={onRefresh}
            disabled={refreshing || offline}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </span>
      )}
    </div>
  );
}

/**
 * Off-screen live region. PLAN 4.7 asks for screen-reader announcements when
 * the weather changes; mounting one of these near the top of the tree and
 * pushing text into it is the least intrusive way to do that.
 */
export function Announcer({ message }: { message: string }) {
  /*
   * Deliberately a bare live region rather than `role="status"`. The loading
   * skeleton already carries `role="status"`, and two of them on the page at
   * once makes screen readers interleave the two announcements — and makes
   * `getByRole("status")` ambiguous for anyone testing this tree.
   */
  return (
    <div className={styles.announcer} aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
