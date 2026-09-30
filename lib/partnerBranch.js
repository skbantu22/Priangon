"use client";

import { useSyncExternalStore } from "react";

// The branch a dealer, sub dealer, or wholesaler is browsing. Separate from
// the admin POS till, so a partner switch does not move the shop counter.
const KEY = "partner-branch";
const listeners = new Set();

export const readPartnerBranch = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const writePartnerBranch = (id) => {
  try {
    if (id) localStorage.setItem(KEY, String(id));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the pick still works for this session
  }
  listeners.forEach((listener) => listener());
};

export const subscribePartnerBranch = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePartnerBranchId = () =>
  useSyncExternalStore(subscribePartnerBranch, readPartnerBranch, () => "");
