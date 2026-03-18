'use client'

import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistReducer, persistStore } from 'redux-persist'
import storage from 'redux-persist/lib/storage' 
import authReducer from './reducer/authReducer'
import cartReducer from './reducer/cartReducer'
import wishlistSlice from './reducer/favReducer'

const rootReducer = combineReducers({
  authStore: authReducer,
  cartStore: cartReducer,
  wishlistStore: wishlistSlice

})

const persistConfig = {
  key: 'root',
  storage, 
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export const persistor = persistStore(store)
