import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  /** Any CSS length; percentages are useful for text lines. */
  width?: string;
  height?: string;
  radius?: "xs" | "sm" | "md" | "lg" | "full";
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "16px",
  radius = "sm",
  className,
}: SkeletonProps) {
  const classes = [styles.skeleton, className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      style={{ width, height, borderRadius: `var(--rounded-${radius})` }}
      /* Decorative: the surrounding live region announces the loading state. */
      aria-hidden="true"
    />
  );
}

/** A block of shimmering lines standing in for a paragraph. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["100%", "92%", "78%", "86%", "64%"];
  return (
    <span className={[styles.stack, className].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={styles.text}
          width={widths[index % widths.length]}
          height="12px"
        />
      ))}
    </span>
  );
}
