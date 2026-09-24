"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { PRODUCT_UNITS } from "@/lib/productExtraFields";

/**
 * Brand and unit suggestions for the product form.
 *
 * Both fields stay free text, so nothing already saved is orphaned, but
 * the suggestions now come from the Brand and Unit modules. Whatever the
 * shop has defined is offered first; the names already sitting on
 * products, and the built-in unit list, follow as a fallback so an
 * unconfigured install still suggests something.
 */
export function useProductLookups({ fallbackBrands = [] } = {}) {
  const [brands, setBrands] = useState(fallbackBrands);
  const [units, setUnits] = useState(PRODUCT_UNITS);

  useEffect(() => {
    let cancelled = false;

    const merge = (managed, fallback) => {
      const seen = new Set();
      const out = [];

      for (const name of [...managed, ...fallback]) {
        const key = String(name || "").trim().toLowerCase();

        if (!key || seen.has(key)) continue;

        seen.add(key);
        out.push(String(name).trim());
      }

      return out;
    };

    const load = async () => {
      try {
        const [brandRes, unitRes] = await Promise.all([
          axios.get("/api/brand?active=true"),
          axios.get("/api/unit?active=true"),
        ]);

        if (cancelled) return;

        if (brandRes.data?.success) {
          setBrands(
            merge(
              brandRes.data.data.map((brand) => brand.name),
              fallbackBrands,
            ),
          );
        }

        if (unitRes.data?.success) {
          setUnits(
            merge(
              unitRes.data.data.map((unit) => unit.name),
              PRODUCT_UNITS,
            ),
          );
        }
      } catch {
        // Keep the fallbacks: a failed lookup must not empty the lists
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fallbackBrands]);

  return { brands, units };
}
