/**
 * Configuration de base pour RTK Query
 * Inclut l'auto-refresh des tokens et la gestion des erreurs
 */

import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';
import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

// URL de l'API - à configurer dans .env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200';

/**
 * BaseQuery avec gestion automatique des tokens
 */
const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers, { extra, endpoint, type, getState, body }: any) => {
        const token = await tokenService.getAccessToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        
        // Ne pas définir Content-Type pour FormData
        // React Native/fetch le définira automatiquement avec le boundary
        // Si c'est un FormData, on laisse le système gérer le Content-Type
        if (body instanceof FormData) {
            // Ne pas définir Content-Type, laisser fetch le faire automatiquement
            return headers;
        }
        
        // Pour les autres requêtes, définir application/json
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        
        return headers;
    },
});

/**
 * BaseQuery avec auto-refresh des tokens
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    let result = await baseQuery(args, api, extraOptions);

    // Si le token est expiré (401), on tente de le rafraîchir
    if (result.error && result.error.status === 401) {
        console.log('🔄 Access token expired, attempting to refresh...');
        const refreshToken = await tokenService.getRefreshToken();

        if (refreshToken) {
            try {
                // Tentative de rafraîchissement du token
                const refreshResult = await fetch(`${API_BASE_URL}/auth/refresh/accessToken`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (refreshResult.ok) {
                    const { access_token, refresh_token } = await refreshResult.json();
                    console.log('✅ Tokens refreshed successfully');

                    // Sauvegarde des nouveaux tokens
                    await tokenService.saveTokens(access_token, refresh_token);

                    // Mettre à jour Redux (optionnel, sera fait par le hook d'initialisation)
                    api.dispatch({
                        type: 'auth/setTokens',
                        payload: {
                            accessToken: access_token,
                            refreshToken: refresh_token,
                        },
                    });

                    // Réessayer la requête originale avec le nouveau token
                    result = await baseQuery(args, api, extraOptions);
                } else {
                    console.log('❌ Refresh token expired or invalid');
                    // Le refresh a échoué, on déconnecte l'utilisateur
                    await tokenService.clearTokens();
                    await storage.clearAuth();
                    api.dispatch({ type: 'auth/logout' });
                }
            } catch (error) {
                console.error('❌ Error refreshing tokens:', error);
                await tokenService.clearTokens();
                await storage.clearAuth();
                api.dispatch({ type: 'auth/logout' });
            }
        } else {
            console.log('❌ No refresh token available');
            // Pas de refresh token, on déconnecte l'utilisateur
            await tokenService.clearTokens();
            await storage.clearAuth();
            api.dispatch({ type: 'auth/logout' });
        }
    }

    return result;
};

/**
 * API de base pour RTK Query
 * Tous les autres endpoints héritent de cette configuration
 */
export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'User', 'Product', 'Order', 'Delivery', 'Shop', 'KYC', 'Cart', 'Announcement','Announcements', 'Category', 'Categories', 'Subcategories', 'Subcategory', 'Currency', 'Currencies'
    ],
    endpoints: () => ({}),
});
