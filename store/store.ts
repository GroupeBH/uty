/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore ces actions pour éviter les warnings avec RTK Query
                ignoredActions: [
                    'api/executeQuery/pending',
                    'api/executeQuery/fulfilled',
                    'api/executeQuery/rejected',
                    'api/executeMutation/pending',
                    'api/executeMutation/fulfilled',
                    'api/executeMutation/rejected',
                ],
            },
        }).concat(baseApi.middleware),
});

// Configuration des listeners pour RTK Query (refetchOnFocus, refetchOnReconnect)
setupListeners(store.dispatch);

// Types pour TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
