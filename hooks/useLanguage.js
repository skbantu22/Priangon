"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import axios from "axios";

import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/labels";

const STORAGE_KEY = "app-language";

/**
 * The language this browser reads the panel in.
 *
 * It is a per-person choice kept in the browser, not a shop-wide one:
 * the cashier who reads Bangla and the owner who reads English share one
 * install, and only an admin may write shop settings anyway. The shop's
 * App language setting is the starting point for someone who has not
 * chosen here yet.
 *
 * The value lives in a module-level store that every component reads
 * through useSyncExternalStore, so the sidebar and the panel change
 * together and the server's first render is never out of step.
 */

let current = DEFAULT_LANGUAGE;
let readStorage = false;
let askedSettings = false;

const listeners = new Set();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => {
  // The first read happens on the client, where localStorage exists
  if (!readStorage) {
    readStorage = true;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguage(stored)) current = stored;
    } catch {
      // A private window cannot read it; the default stands
    }
  }

  return current;
};

// The server has no browser storage, so it renders the default
const getServerSnapshot = () => DEFAULT_LANGUAGE;

export const setAppLanguage = (next) => {
  if (!isLanguage(next) || next === current) return;

  current = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not storable here, but the choice still applies for this visit
  }

  emit();
};

export function useLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    // Only when nobody has chosen in this browser: follow the shop
    if (askedSettings) return;

    let stored = null;

    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignored — treated as "not chosen yet"
    }

    if (isLanguage(stored)) return;

    askedSettings = true;

    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data?.success || !isLanguage(data.data?.language)) return;

        current = data.data.language;
        emit();
      })
      .catch(() => {
        // The default stands; a language lookup must not break a page
      });
  }, []);

  const setLanguage = useCallback((next) => setAppLanguage(next), []);

  return { language, setLanguage };
}
