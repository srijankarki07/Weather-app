import type { ReactNode } from "react";
import styles from "./AppShell.module.css";
import { conditionFamily, dayPeriod } from "../../lib/conditions";
import type { ConditionCode } from "../../types/weather";

export interface AppShellProps {
  children: ReactNode;
  /**
   * Rendered outside the max-width container. The sticky header needs to span
   * the full viewport so its blur covers content scrolling beneath it, while
   * the content column stays centred.
   */
  header?: ReactNode;
  /** Drives the background gradient; omitted while loading. */
  condition?: ConditionCode;
  isNight?: boolean;
  className?: string;
}

/**
 * Page frame. Publishes the current condition and day-period as data attributes
 * so the background gradient is resolved in CSS (see AppShell.module.css) and
 * stays overridable by the dark and high-contrast themes.
 */
export function AppShell({
  children,
  header,
  condition,
  isNight = false,
  className,
}: AppShellProps) {
  return (
    <div
      className={[styles.shell, className].filter(Boolean).join(" ")}
      data-condition={condition ? conditionFamily(condition) : "cloudy"}
      data-period={dayPeriod(isNight)}
    >
      {header}
      <div className={styles.container}>{children}</div>
    </div>
  );
}

/** Vertical rhythm wrapper for the scroll layout. */
export function AppStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

/**
 * Marks a child of `AppStack` as spanning both desktop columns. Used by the
 * hourly chart, which needs the full width.
 */
export function AppStackFull({ children }: { children: ReactNode }) {
  return <div className={styles.full}>{children}</div>;
}
