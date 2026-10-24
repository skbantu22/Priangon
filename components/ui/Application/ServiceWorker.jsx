"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the site installable.
 *
 * Kept out of development: a worker caching the dev server's assets serves
 * yesterday's code back after a change, which looks like a bug that is not
 * there. It also unregisters any worker left over from a previous visit, so
 * a developer who installed the app once does not keep getting stale files.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((all) => all.forEach((one) => one.unregister()))
        .catch(() => {});
      return;
    }

    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});

    // wait for the page to settle, so the worker never competes with the
    // first screen for bandwidth
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
