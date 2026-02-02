/**
 * Configuration de base pour RTK Query
 * Inclut l'auto-refresh des tokens et la gestion des erreurs
 */

import { tokenService } from '@/services/tokenService';
import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

// URL de l'API - à configurer dans .env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200';

/**
 * BaseQuery avec gestion automatique des tokens
 */
const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
        const token = await tokenService.getAccessToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        // Ne pas forcer le Content-Type si c'est du FormData (le navigateur le gère)
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
        const refreshToken = await tokenService.getRefreshToken();

        if (refreshToken) {
            // Tentative de rafraîchissement du token
            const refreshResult = await baseQuery(
                {
                    url: '/auth/refresh',
                    method: 'POST',
                    body: { refreshToken },
                },
                api,
                extraOptions
            );

            if (refreshResult.data) {
                // Sauvegarde des nouveaux tokens
                const { accessToken, refreshToken: newRefreshToken } = refreshResult.data as {
                    accessToken: string;
                    refreshToken: string;
                };

                await tokenService.saveTokens(accessToken, newRefreshToken);

                // Réessayer la requête originale avec le nouveau token
                result = await baseQuery(args, api, extraOptions);
            } else {
                // Le refresh a échoué, on déconnecte l'utilisateur
                await tokenService.clearTokens();
                // TODO: Dispatch une action pour rediriger vers le login
            }
        } else {
            // Pas de refresh token, on déconnecte l'utilisateur
            await tokenService.clearTokens();
            // TODO: Dispatch une action pour rediriger vers le login
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
