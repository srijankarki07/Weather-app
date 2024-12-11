import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

/*
 * Both components forward their ref. Callers need the underlying node to move
 * focus — closing a popover should return focus to the control that opened it,
 * and without a ref the only way to do that is a DOM query, which breaks the
 * moment the tree changes.
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "pill";
  block?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", block = false, className, type = "button", children, ...rest },
  ref
) {
  const classes = [
    styles.button,
    styles[variant],
    block ? styles.block : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Required, not optional. An icon-only control has no accessible name
   * otherwise, and PLAN 4.7 asks for labels on every interactive element.
   */
  label: string;
  variant?: "circle" | "outline" | "labelled";
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = "circle", className, type = "button", children, ...rest },
    ref
  ) {
    const variantClass =
      variant === "outline"
        ? styles.iconOutline
        : variant === "labelled"
          ? styles.iconLabelled
          : styles.iconCircle;

    return (
      <button
        ref={ref}
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
);
