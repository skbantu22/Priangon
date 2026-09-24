"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { sizes as fallbackSizes } from "@/lib/utils";

/**
 * Values for the variant Size dropdown.
 *
 * The list shipped in lib/utils holds clothing sizes, left over from the
 * template this project started from. Once the shop defines a "size" slot
 * attribute — RAM/Storage for a phone shop — those values take over. The
 * old list stays as the fallback so an unconfigured install still works
 * and no existing variant is orphaned.
 */
export function useVariantSizeOptions() {
  const [options, setOptions] = useState(fallbackSizes);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await axios.get(
          "/api/attribute?slot=size&active=true&format=options",
        );

        if (cancelled) return;

        if (data.success && data.data.length > 0) {
          setOptions(data.data);
          setIsConfigured(true);
        }
      } catch {
        // Keep the fallback: a failed lookup must not empty the dropdown
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, isConfigured };
}
