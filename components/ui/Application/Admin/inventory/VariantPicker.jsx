"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiSearch } from "react-icons/fi";

import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/showToast";

/**
 * Finds a product to put on a transfer or adjustment.
 *
 * A scanner types the whole barcode and presses Enter, so an exact
 * single match is added straight away and the box clears itself ready
 * for the next scan; a typed name shows the list to pick from.
 */
export default function VariantPicker({
  location,
  onAdd,
  disabled = false,
  placeholder = "Scan a barcode or search by name, SKU",
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const boxRef = useRef(null);

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const { data } = await axios.get("/api/inventory/variant-search", {
          params: { q: query, location },
        });

        if (cancelled) return;

        if (data.success) {
          setResults(data.data);
          setOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            "error",
            error.response?.data?.message || "Could not search products",
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, location]);

  // Clicking away closes the list without picking anything
  useEffect(() => {
    const onClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);

    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (row) => {
    onAdd(row);
    setTerm("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        value={term}
        disabled={disabled}
        onChange={(event) => setTerm(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;

          event.preventDefault();

          // A scanner has already typed the whole code by now
          if (results.length === 1) pick(results[0]);
        }}
        placeholder={placeholder}
        className="pl-9"
      />

      {open && term.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {searching && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          )}

          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nothing found for “{term.trim()}”
            </p>
          )}

          {results.map((row) => (
            <button
              key={row.variantId}
              type="button"
              onClick={() => pick(row)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {row.productName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.variantLabel}
                  {row.sku ? ` · ${row.sku}` : ""}
                </span>
              </span>

              <span
                className={`shrink-0 text-xs font-semibold ${
                  row.stock > 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {row.stock} in stock
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
