"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { showToast } from "@/lib/showToast";

/** Warehouse plus the showrooms this login may work with */
export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await axios.get("/api/inventory/locations");

        if (!cancelled && data.success) setLocations(data.data);
      } catch (error) {
        if (!cancelled) {
          showToast(
            "error",
            error.response?.data?.message || "Could not load locations",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { locations, loading };
}

/**
 * The rows on a transfer or adjustment form.
 *
 * Adding a product that is already on the form bumps its quantity rather
 * than repeating the row, which is what happens when a barcode is
 * scanned twice.
 */
export function useItemRows() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product) => {
    setItems((current) => {
      const index = current.findIndex(
        (row) => row.variantId === product.variantId,
      );

      if (index === -1) {
        return [...current, { ...product, quantity: 1, type: "subtract" }];
      }

      const next = [...current];

      next[index] = { ...next[index], quantity: next[index].quantity + 1 };

      return next;
    });
  }, []);

  const updateItem = useCallback((variantId, patch) => {
    setItems((current) =>
      current.map((row) =>
        row.variantId === variantId ? { ...row, ...patch } : row,
      ),
    );
  }, []);

  const removeItem = useCallback((variantId) => {
    setItems((current) => current.filter((row) => row.variantId !== variantId));
  }, []);

  const clearItems = useCallback(() => setItems([]), []);

  return { items, setItems, addItem, updateItem, removeItem, clearItems };
}

export const REASON_OPTIONS = [
  { value: "correction", label: "Count correction" },
  { value: "damage", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "theft", label: "Theft" },
  { value: "expired", label: "Expired" },
  { value: "found", label: "Found / extra" },
  { value: "other", label: "Other" },
];

export const reasonLabel = (value) =>
  REASON_OPTIONS.find((option) => option.value === value)?.label || value;

export const statusVariant = {
  pending: "secondary",
  received: "default",
  rejected: "destructive",
};

export const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
