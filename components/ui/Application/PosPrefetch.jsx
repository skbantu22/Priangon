"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";

import {
  POS_ROLES,
  getPosCurrentUser,
  posCategoriesQueryOptions,
  posProductsQueryOptions,
  posShowroomsQueryOptions,
} from "@/lib/posProducts";

// Warms the POS cache as soon as a POS user is known (right after login, or on
// any page load), so /admin/pos opens with its data already there.
// Nothing is fetched when the cache already has data, so repeat visits cost nothing.
export default function PosPrefetch() {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const auth = useSelector((state) => state.authStore.auth);
  const currentUser = getPosCurrentUser(auth);

  useEffect(() => {
    // wait for the persisted cache, otherwise we'd refetch what it already holds
    if (isRestoring || !POS_ROLES.includes(currentUser?.role)) return;

    // Only fills a cold cache, and only the first page: the POS page joins this
    // in-flight request, so a bigger prefetch would make it wait longer. If data
    // exists (even stale) the POS page refreshes it on open and loads the rest.
    const productsOptions = posProductsQueryOptions({ currentUser });

    if (!queryClient.getQueryData(productsOptions.queryKey)) {
      queryClient.prefetchInfiniteQuery(productsOptions);
    }

    queryClient.prefetchQuery(posCategoriesQueryOptions());

    if (currentUser.role === "admin") {
      queryClient.prefetchQuery(posShowroomsQueryOptions());
    }
  }, [isRestoring, currentUser, queryClient]);

  return null;
}
