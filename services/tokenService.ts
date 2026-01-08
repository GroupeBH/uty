/**
 * Service de gestion des tokens avec expo-secure-store
 */

import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenService = {
    /**
     * Sauvegarde les tokens de manière sécurisée
     */
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    },

    /**
     * Récupère le token d'accès
     */
    async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },

    /**
     * Récupère le token de rafraîchissement
     */
    async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    },

    /**
     * Supprime tous les tokens
     */
    async clearTokens(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Error clearing tokens:', error);
            throw error;
        }
    },
};
