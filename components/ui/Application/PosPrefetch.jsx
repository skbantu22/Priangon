"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";

import {
  POS_ROLES,
  getPosCurrentUser,
  posBrandsQueryOptions,
  posCategoriesQueryOptions,
  posProductsQueryOptions,
  posShowroomsQueryOptions,
  resolvePosShowroomId,
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
    // in-flight request and loads the rest itself. If data exists (even stale)
    // the POS page refreshes it on open. The key must be the exact one the POS
    // page asks for (same showroom), or the prefetch is wasted.
    const prefetchProducts = (showroomId) => {
      const productsOptions = posProductsQueryOptions({ showroomId, currentUser });
      if (!queryClient.getQueryData(productsOptions.queryKey)) {
        queryClient.prefetchInfiniteQuery(productsOptions);
      }
    };

    if (currentUser.role === "admin") {
      const showroomsOptions = posShowroomsQueryOptions();
      const cached = queryClient.getQueryData(showroomsOptions.queryKey);
      // remembered / cached showroom known: no need to wait for the showroom list
      const guess = resolvePosShowroomId({ currentUser, showrooms: cached || [] });
      if (guess) prefetchProducts(guess);

      queryClient
        .fetchQuery(showroomsOptions)
        .then((showrooms) => {
          const id = resolvePosShowroomId({ currentUser, showrooms });
          if (id && id !== guess) prefetchProducts(id);
        })
        .catch(() => {});
    } else {
      prefetchProducts("");
    }

    queryClient.prefetchQuery(posCategoriesQueryOptions());
    queryClient.prefetchQuery(posBrandsQueryOptions());
  }, [isRestoring, currentUser, queryClient]);

  return null;
}
