"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The order a dealer / retailer is putting together in the portal.
// Kept in localStorage so a refresh or closed tab doesn't lose it.
const KEY = "partner-cart";
const CartContext = createContext(null);

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export function PartnerCartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  // load after mount so server and client render the same HTML
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setItems(read());
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // storage blocked: the cart still works until the tab closes
    }
  }, [items, ready]);

  const value = useMemo(() => {
    // qty is kept between 1 and the stock shown when the item was added
    const clamp = (qty, stock) => Math.max(1, Math.min(Math.floor(Number(qty) || 1), stock || 1));

    return {
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.price, 0),
      add: (line, qty = 1) =>
        setItems((list) => {
          const found = list.find((i) => i.variantId === line.variantId);
          if (found) {
            return list.map((i) =>
              i.variantId === line.variantId
                ? { ...i, ...line, qty: clamp(i.qty + qty, line.stock) }
                : i,
            );
          }
          return [...list, { ...line, qty: clamp(qty, line.stock) }];
        }),
      setQty: (variantId, qty) =>
        setItems((list) =>
          list.map((i) => (i.variantId === variantId ? { ...i, qty: clamp(qty, i.stock) } : i)),
        ),
      remove: (variantId) => setItems((list) => list.filter((i) => i.variantId !== variantId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const usePartnerCart = () => useContext(CartContext);
