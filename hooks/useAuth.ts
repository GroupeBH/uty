import { useCallback } from 'react';
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
import { deleteFcmDeviceToken } from '@/services/notifications/pushNotifications';
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
            try {
                await deleteFcmDeviceToken();
            } catch (error) {
                console.error('Error deleting FCM device token:', error);
            }
            await tokenService.clearTokens();
            await storage.clearAuth();
            dispatch(logoutAction());
        }
    }, [dispatch, logoutMutation]);

    const requireAuth = useCallback(
        (message = 'Vous devez etre connecte pour effectuer cette action') => {
            if (!isAuthenticated) {
                router.push({
                    pathname: '/modal',
                    params: {
                        mode: 'login',
                        title: 'Connexion requise',
                        reason: message || 'Connectez-vous pour continuer.',
                        source: 'auth_guard',
                    },
                });
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
