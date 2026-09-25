"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import authReducer from "./reducer/authReducer";
import cartReducer from "./reducer/cartReducer";
import posCartReducer from "./reducer/posCartSlice";

import wishlistSlice from "./reducer/favReducer";
import notificationReducer from "./reducer/notificationSlice";
const rootReducer = combineReducers({
  authStore: authReducer,
  cartStore: cartReducer,
  wishlistStore: wishlistSlice,
  posCart: posCartReducer,
  notification: notificationReducer,
});

// "use client" modules still render once on the server, where there is no
// localStorage; hand redux-persist a no-op storage there instead of letting it warn.
const createNoopStorage = () => ({
  getItem: () => Promise.resolve(null),
  setItem: (_key, value) => Promise.resolve(value),
  removeItem: () => Promise.resolve(),
});

const storage =
  typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
