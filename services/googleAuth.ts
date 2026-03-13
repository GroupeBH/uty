import Constants from 'expo-constants';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

export type GoogleAuthResult = {
    idToken: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
};

const GOOGLE_CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

let isConfigured = false;
let cachedGoogleSigninModule: GoogleSigninModule | null = null;

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

const getGoogleSigninModule = (): GoogleSigninModule => {
    if (cachedGoogleSigninModule) {
        return cachedGoogleSigninModule;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedGoogleSigninModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
        return cachedGoogleSigninModule;
    } catch {
        throw createUserFriendlyError(
            'Connexion Google indisponible dans cette version de l application. Mettez l application a jour puis reessayez.'
        );
    }
};

const resolveGoogleConfig = () => {
    const extra =
        ((Constants.expoConfig?.extra ?? Constants.manifest2?.extra) as
            | Record<string, string | undefined>
            | undefined) ?? {};

    const webClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    const iosClientId =
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    return {
        webClientId,
        iosClientId,
    };
};

export const configureGoogleSignIn = () => {
    if (isConfigured) {
        return;
    }

    const { webClientId, iosClientId } = resolveGoogleConfig();
    if (!webClientId) {
        throw createUserFriendlyError(
            'Connexion Google indisponible pour le moment. Veuillez reessayer plus tard.'
        );
    }

    if (!GOOGLE_CLIENT_ID_PATTERN.test(webClientId)) {
        throw createUserFriendlyError(
            'Web Client ID Google invalide. Utilisez le client OAuth se terminant par .apps.googleusercontent.com.'
        );
    }

    const { GoogleSignin } = getGoogleSigninModule();
    GoogleSignin.configure({
        webClientId,
        iosClientId,
        offlineAccess: false,
        scopes: ['profile', 'email'],
    });

    isConfigured = true;
};

export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
    const googleSignin = getGoogleSigninModule();
    try {
        configureGoogleSignIn();
        await googleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        const response = await googleSignin.GoogleSignin.signIn();
        if (!googleSignin.isSuccessResponse(response)) {
            throw createUserFriendlyError('Connexion Google annulee.');
        }

        const { data } = response;
        if (!data.idToken) {
            throw createUserFriendlyError(
                'Impossible de finaliser la connexion Google. Veuillez reessayer.'
            );
        }

        return {
            idToken: data.idToken,
            email: data.user.email,
            name: data.user.name ?? undefined,
            givenName: data.user.givenName ?? undefined,
            familyName: data.user.familyName ?? undefined,
            picture: data.user.photo ?? undefined,
        };
    } catch (error) {
        const nativeCode = readUnknownErrorCode(error);
        const nativeMessage = readUnknownErrorMessage(error);
        const normalizedMessage = (nativeMessage || '').toLowerCase();

        const cancelledCode = googleSignin.statusCodes.SIGN_IN_CANCELLED;
        const inProgressCode = googleSignin.statusCodes.IN_PROGRESS;
        const playServicesCode = googleSignin.statusCodes.PLAY_SERVICES_NOT_AVAILABLE;

        if (nativeCode === cancelledCode || nativeCode === 'SIGN_IN_CANCELLED') {
            throw createUserFriendlyError('Connexion Google annulee.');
        }

        if (nativeCode === inProgressCode || nativeCode === 'IN_PROGRESS') {
            throw createUserFriendlyError(
                'Une tentative de connexion Google est deja en cours. Patientez quelques secondes.'
            );
        }

        if (
            nativeCode === playServicesCode ||
            nativeCode === 'PLAY_SERVICES_NOT_AVAILABLE'
        ) {
            throw createUserFriendlyError(
                'Google Play Services est indisponible ou non a jour. Mettez-le a jour puis reessayez.'
            );
        }

        if (
            nativeCode === 'DEVELOPER_ERROR' ||
            normalizedMessage.includes('developer_error') ||
            normalizedMessage.includes('redirect_uri_mismatch')
        ) {
            throw createUserFriendlyError(
                'Configuration Google invalide. Verifiez le nom du package Android, les empreintes SHA-1/SHA-256 dans Firebase et le Web Client ID.'
            );
        }

        if (normalizedMessage.includes('rngooglesignin') || normalizedMessage.includes('turbomodule')) {
            throw createUserFriendlyError(
                'Connexion Google indisponible dans ce build. Generez une version native de developpement puis reessayez.'
            );
        }

        if (nativeMessage) {
            throw createUserFriendlyError(nativeMessage);
        }

        throw createUserFriendlyError(
            'Impossible de se connecter avec Google pour le moment. Veuillez reessayer.'
        );
    }
};
