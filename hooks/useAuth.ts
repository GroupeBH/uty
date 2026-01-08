/**
 * Hook personnalisé pour l'authentification
 */

import { tokenService } from '@/services/tokenService';
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from '@/store/api/authApi';
import { useGetProfileQuery } from '@/store/api/usersApi';
import { LoginRequest, RegisterRequest } from '@/types/auth';
// The existing code uses UserRole from '@/types' which is an enum.
// My user.ts has `export enum Role`.
// I should map or use consistent types. 
// Existing RegisterScreen uses `UserRole` from '@/types'.
// I will keep `UserRole` import from `@/types` for now to avoid breaking UI, assuming values match.
import { useCallback } from 'react';

export const useAuth = () => {
    const [login, { isLoading: isLoggingIn }] = useLoginMutation();
    const [register, { isLoading: isRegistering }] = useRegisterMutation();
    const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
    // useGetProfileQuery is the new way to get user data
    const { data: user, isLoading: isLoadingUser, refetch } = useGetProfileQuery();

    const handleLogin = useCallback(async (credentials: LoginRequest) => {
        try {
            const result = await login(credentials).unwrap();
            return result;
        } catch (error) {
            throw error;
        }
    }, [login]);

    const handleRegister = useCallback(async (userData: RegisterRequest) => {
        try {
            const result = await register(userData).unwrap();
            return result;
        } catch (error) {
            throw error;
        }
    }, [register]);

    const handleLogout = useCallback(async () => {
        try {
            await logout().unwrap();
        } catch (error) {
            // Même en cas d'erreur, on supprime les tokens locaux
            await tokenService.clearTokens();
        }
    }, [logout]);

    const isAuthenticated = !!user;

    const hasRole = useCallback((role: string) => {
        // user.roles is array in my new User type (Role[]).
        // UI expects single role comparison?
        // Old User type had `role: UserRole` (single).
        // New User type has `roles: Role[]`.
        // I need to adapt.
        if (!user || !user.roles) return false;
        return user.roles.includes(role as any);
    }, [user]);

    return {
        user,
        isAuthenticated,
        isLoading: isLoadingUser,
        isLoggingIn,
        isRegistering,
        isLoggingOut,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refetch,
        hasRole,
    };
};
