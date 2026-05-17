"use client";

import axios from "axios";
import { useInfiniteQuery } from "@tanstack/react-query";

const fetchProducts = async ({ pageParam = 1, queryKey }) => {
  const [, search, showroomId] = queryKey;

  const res = await axios.get("/api/product/select-products", {
    params: {
      page: pageParam,
      search,
      showroomId,
    },
  });

  return res.data.data;
};

export function useProducts(search, showroomId) {
  return useInfiniteQuery({
    queryKey: ["products", search, showroomId],
    queryFn: fetchProducts,

    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      return allPages.length + 1;
    },

    staleTime: 1000 * 60 * 5,
  });
}
