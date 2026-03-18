import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

// ✅ import reducers (MUST be slice.reducer)
// example: import productReducer from "./slices/productSlice";

const rootReducer = combineReducers({
  // product: productReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "cart"], // which slices to persist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // ✅ required for redux-persist
    }),
});

export const persistor = persistStore(store);
