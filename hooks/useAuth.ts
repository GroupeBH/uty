import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectIsAuthenticated,
    selectCurrentUser,
    selectIsLoading,
    logout as logoutAction,
} from '@/store/slices/authSlice';
import { useDeleteAccountMutation, useLogoutMutation } from '@/store/api/authApi';
import { tokenService } from '@/services/tokenService';
import { deleteFcmDeviceToken } from '@/services/notifications/pushNotifications';
import { storage } from '@/utils/storage';

const readApiErrorMessage = (error: any): string => {
    if (typeof error?.data?.message === 'string' && error.data.message.trim()) {
        return error.data.message.trim();
    }
    if (Array.isArray(error?.data?.message) && error.data.message.length > 0) {
        const first = error.data.message[0];
        if (typeof first === 'string' && first.trim()) {
            return first.trim();
        }
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
        return error.message.trim();
    }
    return '';
};

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectCurrentUser);
    const isLoading = useAppSelector(selectIsLoading);

    const [logoutMutation] = useLogoutMutation();
    const [deleteAccountMutation] = useDeleteAccountMutation();

    const clearLocalAuthSession = useCallback(async () => {
        try {
            await deleteFcmDeviceToken();
        } catch (error) {
            console.error('Error deleting FCM device token:', error);
        }
        await tokenService.clearTokens();
        await storage.clearAuth();
        dispatch(logoutAction());
    }, [dispatch]);

    const logout = useCallback(async () => {
        try {
            await logoutMutation().unwrap();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            await clearLocalAuthSession();
        }
    }, [clearLocalAuthSession, logoutMutation]);

    const deleteAccount = useCallback(async () => {
        try {
            await deleteAccountMutation().unwrap();
        } catch (error) {
            console.error('Delete account API error:', error);
            throw new Error(
                readApiErrorMessage(error) ||
                    'Impossible de supprimer votre compte pour le moment. Veuillez reessayer.'
            );
        }

        await clearLocalAuthSession();
    }, [clearLocalAuthSession, deleteAccountMutation]);

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
        deleteAccount,
        requireAuth,
    };
};
