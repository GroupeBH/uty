import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectIsAuthenticated,
    selectCurrentUser,
    selectIsLoading,
    logout as logoutAction,
} from '@/store/slices/authSlice';
import { useLogoutMutation } from '@/store/api/authApi';
import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectCurrentUser);
    const isLoading = useAppSelector(selectIsLoading);

    const [logoutMutation] = useLogoutMutation();

    const logout = useCallback(async () => {
        try {
            await logoutMutation().unwrap();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            await tokenService.clearTokens();
            await storage.clearAuth();
            dispatch(logoutAction());
        }
    }, [dispatch, logoutMutation]);

    const requireAuth = useCallback(
        (message = 'Vous devez être connecté pour effectuer cette action') => {
            if (!isAuthenticated) {
                // Afficher le message si fourni
                if (message) {
                    Alert.alert('Connexion requise', message);
                }
                // Ouvrir le modal d'authentification
                router.push('/modal');
                return false;
            }
            return true;
        },
        [isAuthenticated, router]
    );

    return {
        user,
        isAuthenticated,
        isLoading,
        logout,
        requireAuth,
    };
};
