import { API_BASE_URL } from '@/store/api/baseApi';
import type { User } from '@/store/api/authApi';
import { setCredentials } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';
import { storage } from '@/utils/storage';

import { tokenService } from './tokenService';

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type OAuthProvider = 'google' | 'apple';

export type OAuthRegistrationProfile<P extends OAuthProvider = OAuthProvider> = {
    provider: P;
    email?: string;
    image?: string;
    firstName: string;
    lastName: string;
};

export type OAuthAuthFlowResult<P extends OAuthProvider = OAuthProvider> =
    | {
          kind: 'authenticated';
          tokens: AuthTokens;
      }
    | {
          kind: 'registration_required';
          message: string;
          registrationToken: string;
          profile: OAuthRegistrationProfile<P>;
      };

export type GoogleRegistrationProfile = OAuthRegistrationProfile<'google'>;
export type AppleRegistrationProfile = OAuthRegistrationProfile<'apple'>;
export type GoogleAuthFlowResult = OAuthAuthFlowResult<'google'>;
export type AppleAuthFlowResult = OAuthAuthFlowResult<'apple'>;

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
    google: 'Google',
    apple: 'Apple',
};

const fallbackOAuthErrorMessage = (provider: OAuthProvider) =>
    `Impossible de se connecter avec ${PROVIDER_LABEL[provider]} pour le moment. Veuillez reessayer.`;

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

const mapRuntimeOAuthError = (provider: OAuthProvider, rawMessage: string | null): string => {
    const normalized = (rawMessage || '').toLowerCase();
    const label = PROVIDER_LABEL[provider];

    if (!normalized) {
        return fallbackOAuthErrorMessage(provider);
    }

    if (
        normalized.includes('network request failed') ||
        normalized.includes('failed to fetch') ||
        normalized.includes('timeout')
    ) {
        return 'Connexion internet indisponible. Verifiez votre reseau puis reessayez.';
    }

    if (normalized.includes('annule') || normalized.includes('cancel')) {
        return `Connexion ${label} annulee.`;
    }

    if (provider === 'google') {
        if (normalized.includes('developer_error') || normalized.includes('redirect_uri_mismatch')) {
            return 'Configuration Google invalide. Verifiez SHA-1/SHA-256, package Android et Web Client ID.';
        }

        if (normalized.includes('play services')) {
            return 'Google Play Services est indisponible ou non a jour.';
        }
    }

    if (
        provider === 'apple' &&
        (normalized.includes('not available') ||
            normalized.includes('unavailable') ||
            normalized.includes('indisponible'))
    ) {
        return 'Connexion Apple indisponible dans ce build. Generez une version iOS avec Sign in with Apple active.';
    }

    return rawMessage || fallbackOAuthErrorMessage(provider);
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

const mapServerOAuthError = (
    provider: OAuthProvider,
    status: number,
    rawMessage: string | null
): string => {
    const message = (rawMessage || '').toLowerCase();
    const label = PROVIDER_LABEL[provider];

    if (message.includes('annule') || message.includes('cancel')) {
        return `Connexion ${label} annulee.`;
    }

    if (
        message.includes(provider) ||
        message.includes('token') ||
        message.includes('audience') ||
        message.includes('invalide')
    ) {
        return `Votre compte ${label} n a pas pu etre verifie. Veuillez reessayer.`;
    }

    if (message.includes('compte') && message.includes('autre')) {
        return `Ce compte ${label} est deja associe a un autre compte.`;
    }

    if (status === 401 || status === 403) {
        return `Connexion ${label} refusee. Veuillez verifier votre compte ${label} puis reessayer.`;
    }

    if (status >= 500) {
        return 'Service temporairement indisponible. Veuillez reessayer dans quelques instants.';
    }

    if (rawMessage && rawMessage.trim()) {
        return rawMessage;
    }

    return fallbackOAuthErrorMessage(provider);
};

const readProfileProvider = (value: unknown, fallback: OAuthProvider): OAuthProvider => {
    if (value === 'apple' || value === 'google') {
        return value;
    }
    return fallback;
};

const exchangeOAuthToken = async <P extends OAuthProvider>(
    provider: P,
    path: string,
    body: Record<string, unknown>
): Promise<OAuthAuthFlowResult<P>> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(mapServerOAuthError(provider, response.status, readApiError(payload)));
    }

    const label = PROVIDER_LABEL[provider];

    if (payload?.requiresRegistration === true) {
        const registrationToken =
            typeof payload.registrationToken === 'string' ? payload.registrationToken.trim() : '';
        if (!registrationToken) {
            throw new Error(`Session ${label} incomplete. Recommencez la connexion ${label}.`);
        }

        const profilePayload = payload?.profile ?? {};
        const firstName =
            typeof profilePayload.firstName === 'string' && profilePayload.firstName.trim()
                ? profilePayload.firstName.trim()
                : 'Utilisateur';
        const lastName =
            typeof profilePayload.lastName === 'string' && profilePayload.lastName.trim()
                ? profilePayload.lastName.trim()
                : label;
        const email =
            typeof profilePayload.email === 'string' && profilePayload.email.trim()
                ? profilePayload.email.trim()
                : undefined;
        const image =
            typeof profilePayload.image === 'string' && profilePayload.image.trim()
                ? profilePayload.image.trim()
                : undefined;
        const profileProvider = readProfileProvider(profilePayload.provider, provider) as P;

        return {
            kind: 'registration_required',
            message:
                typeof payload?.message === 'string' && payload.message.trim()
                    ? payload.message
                    : `Aucun compte lie a ${label}. Completez votre inscription.`,
            registrationToken,
            profile: {
                provider: profileProvider,
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
        throw new Error(`Connexion ${label} inachevee. Veuillez reessayer.`);
    }

    return {
        kind: 'authenticated',
        tokens: {
            accessToken,
            refreshToken,
        },
    };
};

const exchangeGoogleIdToken = async (idToken: string): Promise<GoogleAuthFlowResult> =>
    exchangeOAuthToken('google', '/auth/google/mobile', { idToken });

const exchangeAppleIdentityToken = async (
    identityToken: string,
    authorizationCode?: string,
    fullName?: {
        givenName?: string | null;
        familyName?: string | null;
    }
): Promise<AppleAuthFlowResult> =>
    exchangeOAuthToken('apple', '/auth/apple/mobile', {
        identityToken,
        authorizationCode,
        fullName,
    });

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

const loadGoogleAuth = async () => import('./googleAuth');
const loadAppleAuth = async () => import('./appleAuth');

export const authFlowService = {
    async loginWithGoogle(): Promise<GoogleAuthFlowResult> {
        try {
            const { signInWithGoogle } = await loadGoogleAuth();
            const googleResult = await signInWithGoogle();
            return await exchangeGoogleIdToken(googleResult.idToken);
        } catch (error) {
            const message = mapRuntimeOAuthError('google', readUnknownErrorMessage(error));
            throw new Error(message);
        }
    },

    async loginWithApple(): Promise<AppleAuthFlowResult> {
        try {
            const { signInWithApple } = await loadAppleAuth();
            const appleResult = await signInWithApple();
            return await exchangeAppleIdentityToken(
                appleResult.identityToken,
                appleResult.authorizationCode,
                appleResult.fullName
            );
        } catch (error) {
            const message = mapRuntimeOAuthError('apple', readUnknownErrorMessage(error));
            throw new Error(message);
        }
    },

    async isAppleSignInAvailable(): Promise<boolean> {
        try {
            const { isAppleAuthAvailable } = await loadAppleAuth();
            return await isAppleAuthAvailable();
        } catch {
            return false;
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
