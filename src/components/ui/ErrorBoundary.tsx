/**
 * Render error containment.
 *
 * PLAN 4.6 wants resilience, and PLAN 9 wants no console errors in production.
 * A thrown render error in a chart or a map currently unmounts the whole app
 * and leaves a blank page — the exact failure the plan's "never show a blank
 * screen" is written against, and one that has nothing to do with the network.
 *
 * Boundaries are mounted per card rather than once at the root so a broken
 * visualisation costs its own section and nothing else. The forecast the user
 * came for keeps working.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./ErrorState.module.css";
import { AlertIcon, RefreshIcon } from "./icons";

interface Props {
  children: ReactNode;
  /** Shown in the fallback, e.g. "the chart". */
  label: string;
  /** Remounts the subtree; wired to the retry button. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
     * Logged rather than swallowed. In a project with error reporting this is
     * where it would be sent; there is no backend here, so the console is the
     * only destination that exists.
     */
    console.error(`The ${this.props.label} failed to render:`, error, info);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.state} role="alert">
        <AlertIcon className={styles.icon} size={26} />
        <div>
          <h2 className={styles.title}>
            The {this.props.label} could not be displayed
          </h2>
          <p className={styles.message}>
            The rest of the forecast is unaffected. Reloading this section often
            clears it.
          </p>
        </div>
        <button type="button" className={styles.retryButton} onClick={this.reset}>
          <RefreshIcon size={16} />
          Reload this section
        </button>
      </div>
    );
  }
}
