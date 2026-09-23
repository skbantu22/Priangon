"use client";

import React, { Suspense } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/store/store";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { persister } from "@/lib/reactQueryPersister";

const CACHE_MAX_AGE = 1000 * 60 * 30;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      // must be >= persist maxAge, else queries are dropped before they can be restored
      gcTime: CACHE_MAX_AGE,
    },
  },
});

export default function GlobalStoreProvider({ children }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        // change this when the data source changes, so browsers drop old cached lists
        buster: "mobizone-demo-1",
      }}
    >
      <Provider store={store}>
        <PersistGate persistor={persistor}>{children}</PersistGate>
      </Provider>

      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </PersistQueryClientProvider>
  );
}
