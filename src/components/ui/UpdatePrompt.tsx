/**
 * "A new version is available."
 *
 * A service worker that took over silently would reload the page under the
 * user's thumb — losing a map position, a scroll depth, an open search. So the
 * new worker waits and this asks. See `service-worker.js` for the other half.
 */

import { useEffect, useState } from "react";
import styles from "./ErrorState.module.css";
import { Button, IconButton } from "./Button";
import { CloseIcon, RefreshIcon } from "../ui/icons";
import {
  isServiceWorkerSupported,
  registerServiceWorker,
} from "../../serviceWorkerRegistration";

export function UpdatePrompt() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isServiceWorkerSupported()) return;
    registerServiceWorker((apply) => setApplyUpdate(() => apply));
  }, []);

  if (!applyUpdate || dismissed) return null;

  return (
    <div className={styles.banner} role="status">
      <RefreshIcon className={styles.bannerIcon} size={18} />
      <span>A new version is available.</span>
      <span className={styles.bannerActions}>
        <Button variant="tertiary" onClick={applyUpdate}>
          Refresh
        </Button>
        <IconButton
          variant="circle"
          label="Dismiss update notice"
          onClick={() => setDismissed(true)}
        >
          <CloseIcon size={15} />
        </IconButton>
      </span>
    </div>
  );
}
