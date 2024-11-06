import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "pill";
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  block = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    block ? styles.block : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Required, not optional. An icon-only control has no accessible name
   * otherwise, and PLAN 4.7 asks for labels on every interactive element.
   */
  label: string;
  variant?: "circle" | "outline" | "labelled";
  children: ReactNode;
}

export function IconButton({
  label,
  variant = "circle",
  className,
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  const variantClass =
    variant === "outline"
      ? styles.iconOutline
      : variant === "labelled"
        ? styles.iconLabelled
        : styles.iconCircle;

  return (
    <button
      type={type}
      className={[styles.iconButton, variantClass, className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
