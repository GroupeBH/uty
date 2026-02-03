import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, logout, setLoading } from '@/store/slices/authSlice';
import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';

/**
 * Hook pour initialiser l'authentification au démarrage de l'app
 * Gère automatiquement le refresh des tokens si nécessaire
 */
export const useAuthInitialization = () => {
    const dispatch = useAppDispatch();
    const hasInitialized = useRef(false);

    useEffect(() => {
        const initializeAuth = async () => {
            if (hasInitialized.current) return;
            hasInitialized.current = true;

            try {
                dispatch(setLoading(true));
                console.log('🔐 Initializing authentication...');

                const accessToken = await tokenService.getAccessToken();
                const refreshToken = await tokenService.getRefreshToken();
                const savedUser = await storage.getUser();

                // Cas 1: Aucun token → User non connecté
                if (!accessToken && !refreshToken) {
                    console.log('❌ No tokens found - User not authenticated');
                    dispatch(setLoading(false));
                    return;
                }

                // Cas 2: AccessToken présent → Vérifier s'il est valide
                if (accessToken) {
                    console.log('🔑 Access token found, verifying...');
                    
                    // Essayer de récupérer le profil pour vérifier si le token est valide
                    try {
                        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200';
                        const response = await fetch(`${API_BASE_URL}/users/profile`, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                            },
                        });

                        if (response.ok) {
                            const user = await response.json();
                            console.log('✅ Access token valid - User authenticated');
                            
                            // Sauvegarder l'utilisateur
                            await storage.setUser(user);
                            
                            dispatch(
                                setCredentials({
                                    user,
                                    accessToken,
                                    refreshToken: refreshToken || '',
                                })
                            );
                            dispatch(setLoading(false));
                            return;
                        }

                        console.log('⚠️ Access token expired or invalid');
                    } catch (error) {
                        console.log('⚠️ Error verifying access token:', error);
                    }
                }

                // Cas 3: AccessToken invalide/expiré mais RefreshToken présent → Refresh
                if (refreshToken) {
                    console.log('🔄 Attempting to refresh tokens...');
                    
                    try {
                        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200';
                        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/accessToken`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${refreshToken}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (refreshResponse.ok) {
                            const { access_token, refresh_token } = await refreshResponse.json();
                            console.log('✅ Tokens refreshed successfully');

                            // Sauvegarder les nouveaux tokens
                            await tokenService.saveTokens(access_token, refresh_token);

                            // Récupérer le profil avec le nouveau token
                            const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200';
                            const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
                                headers: {
                                    'Authorization': `Bearer ${access_token}`,
                                },
                            });

                            if (profileResponse.ok) {
                                const user = await profileResponse.json();
                                await storage.setUser(user);

                                dispatch(
                                    setCredentials({
                                        user,
                                        accessToken: access_token,
                                        refreshToken: refresh_token,
                                    })
                                );
                                dispatch(setLoading(false));
                                return;
                            }
                        }

                        console.log('❌ Refresh token expired or invalid');
                    } catch (error) {
                        console.error('❌ Error refreshing tokens:', error);
                    }
                }

                // Cas 4: Tous les tokens sont invalides → Déconnexion
                console.log('❌ All tokens invalid - Logging out');
                await tokenService.clearTokens();
                await storage.clearAuth();
                dispatch(logout());
                
            } catch (error) {
                console.error('❌ Error initializing auth:', error);
                dispatch(logout());
            } finally {
                dispatch(setLoading(false));
            }
        };

        initializeAuth();
    }, [dispatch]);
};

