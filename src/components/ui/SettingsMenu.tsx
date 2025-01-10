/**
 * Preferences popover: units, theme, contrast, motion and notifications.
 *
 * PLAN 4.7 asks for a high-contrast toggle and reduced-motion support as user
 * controls, and PLAN 4.6 for dark mode. They live together because they are the
 * same kind of decision — how the app presents itself — and splitting them
 * across separate controls would make each harder to find.
 */

import { useEffect, useId, useRef, useState } from "react";
import styles from "./SettingsMenu.module.css";
import { IconButton, Button } from "./Button";
import { SlidersIcon } from "../ui/icons";
import { THEME_OPTIONS } from "../../lib/theme";
import type { UnitSystem, UserPreferences } from "../../types/weather";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export interface SettingsMenuProps {
  preferences: UserPreferences;
  onChange: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  notificationPermission: NotificationPermissionState;
  onEnableNotifications: () => void;
}

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "°C" },
  { value: "imperial", label: "°F" },
];

export function SettingsMenu({
  preferences,
  onChange,
  notificationPermission,
  onEnableNotifications,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside interaction and on Escape, returning focus to the trigger
  // so a keyboard user is not dropped at the top of the document.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <IconButton
        ref={triggerRef}
        variant="outline"
        label="Settings"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
      >
        <SlidersIcon size={20} />
      </IconButton>

      {open && (
        <div
          className={styles.panel}
          id={panelId}
          role="dialog"
          aria-label="Settings"
        >
          {/* --- Units ------------------------------------------------ */}
          <div className={styles.section}>
            <span className={styles.legend} id={`${panelId}-units`}>
              Units
            </span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-labelledby={`${panelId}-units`}
            >
              {UNIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={preferences.units === option.value}
                  className={[
                    styles.segment,
                    preferences.units === option.value
                      ? styles.segmentActive
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onChange("units", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* --- Theme ------------------------------------------------- */}
          <div className={styles.section}>
            <span className={styles.legend} id={`${panelId}-theme`}>
              Appearance
            </span>
            <div
              className={styles.optionList}
              role="radiogroup"
              aria-labelledby={`${panelId}-theme`}
            >
              {THEME_OPTIONS.map((option) => {
                const active = preferences.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={[
                      styles.option,
                      active ? styles.optionActive : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onChange("theme", option.value)}
                  >
                    <span className={styles.radio} aria-hidden="true" />
                    <span className={styles.optionText}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      <span className={styles.optionDescription}>
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Accessibility ---------------------------------------- */}
          <div className={styles.section}>
            <span className={styles.legend}>Accessibility</span>

            <button
              type="button"
              className={styles.toggle}
              role="switch"
              aria-checked={preferences.highContrast}
              onClick={() =>
                onChange("highContrast", !preferences.highContrast)
              }
            >
              <span className={styles.toggleText}>
                <span className={styles.optionLabel}>High contrast</span>
                <span className={styles.optionDescription}>
                  Stronger text and borders, flat backgrounds
                </span>
              </span>
              <span
                className={[
                  styles.switch,
                  preferences.highContrast ? styles.switchOn : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                <span className={styles.switchKnob} />
              </span>
            </button>

            <button
              type="button"
              className={styles.toggle}
              role="switch"
              aria-checked={preferences.reduceMotion}
              onClick={() => onChange("reduceMotion", !preferences.reduceMotion)}
            >
              <span className={styles.toggleText}>
                <span className={styles.optionLabel}>Reduce motion</span>
                <span className={styles.optionDescription}>
                  Turn off transitions and animated loading states
                </span>
              </span>
              <span
                className={[
                  styles.switch,
                  preferences.reduceMotion ? styles.switchOn : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                <span className={styles.switchKnob} />
              </span>
            </button>
          </div>

          {/* --- Notifications ---------------------------------------- */}
          <div className={styles.section}>
            <span className={styles.legend}>Alerts</span>
            {notificationPermission === "unsupported" ? (
              <p className={styles.note}>
                This browser does not support notifications. Severe weather
                alerts still appear in the app.
              </p>
            ) : notificationPermission === "granted" ? (
              <p className={styles.note}>
                Notifications are on for severe weather at your current
                location. This app has no server, so alerts only arrive while it
                is open.
              </p>
            ) : notificationPermission === "denied" ? (
              <p className={styles.note}>
                Notifications are blocked for this site. Enable them in your
                browser settings to receive severe weather alerts.
              </p>
            ) : (
              <div className={styles.notifyRow}>
                <Button variant="secondary" onClick={onEnableNotifications}>
                  Enable alerts
                </Button>
                <span className={styles.note}>
                  Severe weather only.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
