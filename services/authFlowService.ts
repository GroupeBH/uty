import { API_BASE_URL } from '@/store/api/baseApi';
import type { User } from '@/store/api/authApi';
import { setCredentials } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';
import { storage } from '@/utils/storage';

import { signInWithGoogle } from './googleAuth';
import { tokenService } from './tokenService';

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type GoogleRegistrationProfile = {
    provider: 'google';
    email?: string;
    image?: string;
    firstName: string;
    lastName: string;
};

export type GoogleAuthFlowResult =
    | {
          kind: 'authenticated';
          tokens: AuthTokens;
      }
    | {
          kind: 'registration_required';
          message: string;
          registrationToken: string;
          profile: GoogleRegistrationProfile;
      };

const FALLBACK_GOOGLE_ERROR_MESSAGE =
    'Impossible de se connecter avec Google pour le moment. Veuillez reessayer.';

const readUnknownErrorMessage = (error: unknown): string | null => {
    if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
    }

    if (!error || typeof error !== 'object') {
        return null;
    }

    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        return maybeMessage.trim();
    }

    const maybeDescription = (error as { error_description?: unknown }).error_description;
    if (typeof maybeDescription === 'string' && maybeDescription.trim()) {
        return maybeDescription.trim();
    }

    return null;
};

const mapRuntimeGoogleError = (rawMessage: string | null): string => {
    const normalized = (rawMessage || '').toLowerCase();

    if (!normalized) {
        return FALLBACK_GOOGLE_ERROR_MESSAGE;
    }

    if (
        normalized.includes('network request failed') ||
        normalized.includes('failed to fetch') ||
        normalized.includes('timeout')
    ) {
        return 'Connexion internet indisponible. Verifiez votre reseau puis reessayez.';
    }

    if (normalized.includes('developer_error') || normalized.includes('redirect_uri_mismatch')) {
        return 'Configuration Google invalide. Verifiez SHA-1/SHA-256, package Android et Web Client ID.';
    }

    if (normalized.includes('annule')) {
        return 'Connexion Google annulee.';
    }

    if (normalized.includes('play services')) {
        return 'Google Play Services est indisponible ou non a jour.';
    }

    return rawMessage || FALLBACK_GOOGLE_ERROR_MESSAGE;
};

const readApiError = (payload: any): string | null => {
    if (!payload) {
        return null;
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
    }

    if (Array.isArray(payload.message) && payload.message.length > 0) {
        const first = payload.message[0];
        return typeof first === 'string' ? first : null;
    }

    return null;
};

const mapServerGoogleError = (status: number, rawMessage: string | null): string => {
    const message = (rawMessage || '').toLowerCase();

    if (message.includes('annule')) {
        return 'Connexion Google annulee.';
    }

    if (
        message.includes('token google') ||
        message.includes('audience') ||
        message.includes('invalide')
    ) {
        return 'Votre compte Google n a pas pu etre verifie. Veuillez reessayer.';
    }

    if (message.includes('compte') && message.includes('autre')) {
        return 'Ce compte Google est deja associe a un autre compte.';
    }

    if (status === 401 || status === 403) {
        return 'Connexion Google refusee. Veuillez verifier votre compte Google puis reessayer.';
    }

    if (status >= 500) {
        return 'Service temporairement indisponible. Veuillez reessayer dans quelques instants.';
    }

    if (rawMessage && rawMessage.trim()) {
        return rawMessage;
    }

    return FALLBACK_GOOGLE_ERROR_MESSAGE;
};

const exchangeGoogleIdToken = async (idToken: string): Promise<GoogleAuthFlowResult> => {
    const response = await fetch(`${API_BASE_URL}/auth/google/mobile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(mapServerGoogleError(response.status, readApiError(payload)));
    }

    if (payload?.requiresRegistration === true) {
        const registrationToken =
            typeof payload.registrationToken === 'string' ? payload.registrationToken.trim() : '';
        if (!registrationToken) {
            throw new Error('Session Google incomplete. Recommencez la connexion Google.');
        }

        const profilePayload = payload?.profile ?? {};
        const firstName =
            typeof profilePayload.firstName === 'string' && profilePayload.firstName.trim()
                ? profilePayload.firstName.trim()
                : 'Utilisateur';
        const lastName =
            typeof profilePayload.lastName === 'string' && profilePayload.lastName.trim()
                ? profilePayload.lastName.trim()
                : 'Google';
        const email =
            typeof profilePayload.email === 'string' && profilePayload.email.trim()
                ? profilePayload.email.trim()
                : undefined;
        const image =
            typeof profilePayload.image === 'string' && profilePayload.image.trim()
                ? profilePayload.image.trim()
                : undefined;

        return {
            kind: 'registration_required',
            message:
                typeof payload?.message === 'string' && payload.message.trim()
                    ? payload.message
                    : 'Aucun compte lie a Google. Completez votre inscription.',
            registrationToken,
            profile: {
                provider: 'google',
                firstName,
                lastName,
                email,
                image,
            },
        };
    }

    const accessToken = payload?.access_token;
    const refreshToken = payload?.refresh_token;

    if (!accessToken || !refreshToken) {
        throw new Error('Connexion Google inachevee. Veuillez reessayer.');
    }

    return {
        kind: 'authenticated',
        tokens: {
            accessToken,
            refreshToken,
        },
    };
};

const fetchProfile = async (accessToken: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            typeof payload?.message === 'string'
                ? payload.message
                : 'Impossible de recuperer le profil utilisateur.';
        throw new Error(message);
    }

    return payload as User;
};

export const authFlowService = {
    async loginWithGoogle(): Promise<GoogleAuthFlowResult> {
        try {
            const googleResult = await signInWithGoogle();
            return await exchangeGoogleIdToken(googleResult.idToken);
        } catch (error) {
            const message = mapRuntimeGoogleError(readUnknownErrorMessage(error));
            throw new Error(message);
        }
    },

    async completeSession(tokens: AuthTokens, dispatch: AppDispatch): Promise<User> {
        await tokenService.saveTokens(tokens.accessToken, tokens.refreshToken);
        const user = await fetchProfile(tokens.accessToken);
        await storage.setUser(user);

        dispatch(
            setCredentials({
                user,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            })
        );

        return user;
    },
};
