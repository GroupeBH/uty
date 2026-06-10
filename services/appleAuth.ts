import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export type AppleAuthResult = {
    identityToken: string;
    authorizationCode?: string;
    fullName?: {
        givenName?: string | null;
        familyName?: string | null;
    };
};

const createUserFriendlyError = (message: string): Error => new Error(message);

const readUnknownErrorCode = (error: unknown): string | null => {
    if (!error || typeof error !== 'object') {
        return null;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'string' && maybeCode.trim()) {
        return maybeCode.trim();
    }
    if (typeof maybeCode === 'number') {
        return String(maybeCode);
    }

    return null;
};

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

    return null;
};

export const isAppleAuthAvailable = async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
        return false;
    }

    try {
        return await AppleAuthentication.isAvailableAsync();
    } catch {
        return false;
    }
};

export const signInWithApple = async (): Promise<AppleAuthResult> => {
    if (Platform.OS !== 'ios') {
        throw createUserFriendlyError('Connexion Apple disponible uniquement sur iPhone.');
    }

    const isAvailable = await isAppleAuthAvailable();
    if (!isAvailable) {
        throw createUserFriendlyError(
            'Connexion Apple indisponible sur cet appareil. Verifiez votre version iOS.'
        );
    }

    try {
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
        });

        if (!credential.identityToken) {
            throw createUserFriendlyError(
                'Impossible de finaliser la connexion Apple. Veuillez reessayer.'
            );
        }

        return {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode ?? undefined,
            fullName: credential.fullName
                ? {
                      givenName: credential.fullName.givenName ?? undefined,
                      familyName: credential.fullName.familyName ?? undefined,
                  }
                : undefined,
        };
    } catch (error) {
        const nativeCode = readUnknownErrorCode(error);
        const nativeMessage = readUnknownErrorMessage(error);
        const normalizedMessage = (nativeMessage || '').toLowerCase();

        if (
            nativeCode === 'ERR_REQUEST_CANCELED' ||
            nativeCode === 'ERR_CANCELED' ||
            normalizedMessage.includes('cancel') ||
            normalizedMessage.includes('annule')
        ) {
            throw createUserFriendlyError('Connexion Apple annulee.');
        }

        if (
            normalizedMessage.includes('not available') ||
            normalizedMessage.includes('unavailable')
        ) {
            throw createUserFriendlyError(
                'Connexion Apple indisponible dans ce build. Generez une version iOS avec Sign in with Apple active.'
            );
        }

        if (nativeMessage) {
            throw createUserFriendlyError(nativeMessage);
        }

        throw createUserFriendlyError(
            'Impossible de se connecter avec Apple pour le moment. Veuillez reessayer.'
        );
    }
};
