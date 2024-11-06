import type { ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  children: ReactNode;
  /** Section heading rendered in the card's header row. */
  title?: ReactNode;
  /** Secondary text shown opposite the title. */
  subtitle?: ReactNode;
  /** Rendered top-right of the header, e.g. a trend arrow. */
  action?: ReactNode;
  glass?: boolean;
  elevated?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  /** Ties the card to a heading id for `aria-labelledby`. */
  titleId?: string;
  as?: "section" | "div" | "article" | "aside";
}

/**
 * Generic surface. Sections use `<section>` with a labelled heading by default
 * so screen readers can navigate the scroll layout by landmark and heading
 * rather than by reading every card linearly (PLAN 4.7).
 */
export function Card({
  children,
  title,
  subtitle,
  action,
  glass = true,
  elevated = false,
  padding = "md",
  className,
  titleId,
  as: Element = "section",
}: CardProps) {
  const classes = [
    styles.card,
    glass ? styles.glass : null,
    elevated ? styles.elevated : null,
    padding === "none"
      ? styles["padding-none"]
      : padding === "sm"
        ? styles["padding-sm"]
        : padding === "lg"
          ? styles["padding-lg"]
          : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = Boolean(title || action);

  return (
    <Element
      className={classes}
      {...(titleId ? { "aria-labelledby": titleId } : {})}
    >
      {hasHeader && (
        <div className={styles.header}>
          <div>
            {title && (
              <h2 className={styles.title} id={titleId}>
                {title}
              </h2>
            )}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </Element>
  );
}
