/**
 * Modal d'authentification unifie - Login & Inscription.
 */

import { CategoryIcon } from '@/components/CategoryIcon';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { authFlowService } from '@/services/authFlowService';
import {
    useLoginMutation,
    useRegisterMutation,
} from '@/store/api/authApi';
import { useGetCategoriesQuery } from '@/store/api/categoriesApi';
import { useAppDispatch } from '@/store/hooks';
import { normalizePhoneNumberForApi } from '@/utils/phone';
import { normalizeTextInputValue } from '@/utils/textInput';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthMode = 'register' | 'login';
type LoginStep = 'phone' | 'pin';
type RegisterStep = 'phone' | 'identity' | 'security' | 'preferences';
type OAuthProvider = 'google' | 'apple';

const REGISTER_PROGRESS: { step: RegisterStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'identity', label: 'Profil' },
    { step: 'security', label: 'PIN' },
    { step: 'preferences', label: 'Preferences' },
];

const OAUTH_REGISTER_PROGRESS: { step: RegisterStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'preferences', label: 'Preferences' },
];

const LOGIN_PROGRESS: { step: LoginStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'pin', label: 'PIN' },
];

const isPinValid = (value: string) => /^\d{4}$/.test(value);
const generateFourDigitPin = () => String(Math.floor(1000 + Math.random() * 9000));
const OAUTH_REGISTRATION_INFO_MESSAGE =
    'Pour une utilisation optimale et fluide de l application, completez ces 2 etapes:\n' +
    '1. Ajoutez votre numero de telephone.\n' +
    '2. Choisissez vos preferences.';

const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
    google: 'Google',
    apple: 'Apple',
};

const toNormalizedMessage = (message: string) =>
    message
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

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

const isOAuthRegistrationSessionExpired = (
    provider: OAuthProvider,
    message: string
): boolean => {
    const normalized = toNormalizedMessage(message);
    const providerKey = provider.toLowerCase();
    return (
        (normalized.includes(`session ${providerKey}`) && normalized.includes('expire')) ||
        normalized.includes(`${providerKey}_registration`) ||
        normalized.includes(`${providerKey} registration`)
    );
};

const readParam = (value?: string | string[]) => {
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }
    return value ?? '';
};

export default function AuthModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        mode?: string | string[];
        source?: string | string[];
        returnUrl?: string | string[];
        phone?: string | string[];
        registerStep?: string | string[];
    }>();
    const dispatch = useAppDispatch();

    const initialMode: AuthMode = readParam(params.mode) === 'register' ? 'register' : 'login';
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [loginStep, setLoginStep] = useState<LoginStep>('phone');
    const [registerStep, setRegisterStep] = useState<RegisterStep>(() => {
        const step = readParam(params.registerStep);
        if (step === 'otp') {
            return 'identity';
        }
        if (step === 'identity' || step === 'security' || step === 'preferences') {
            return step;
        }
        return 'phone';
    });
    const [phone, setPhone] = useState(readParam(params.phone));
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [googleRegistrationToken, setGoogleRegistrationToken] = useState<string | undefined>(
        undefined
    );
    const [appleRegistrationToken, setAppleRegistrationToken] = useState<string | undefined>(
        undefined
    );
    const [googleProfileImage, setGoogleProfileImage] = useState<string | undefined>(undefined);
    const [googleAutoPin, setGoogleAutoPin] = useState<string | undefined>(undefined);
    const [appleAutoPin, setAppleAutoPin] = useState<string | undefined>(undefined);
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [isPinFocused, setIsPinFocused] = useState(false);
    const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
    const [isLastNameFocused, setIsLastNameFocused] = useState(false);
    const [isConfirmPinFocused, setIsConfirmPinFocused] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);

    // Alert state
    const [alert, setAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        onConfirm?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scrollRef = useRef<ScrollView | null>(null);

    const [register, { isLoading: isRegistering }] = useRegisterMutation();
    const [login, { isLoading: isLoggingIn }] = useLoginMutation();
    const { data: categories, isFetching: isFetchingCategories } = useGetCategoriesQuery();

    const rootCategories = useMemo(
        () => (categories ?? []).filter((category) => !category.parentId),
        [categories]
    );

    const isLoginMode = mode === 'login';
    const isLoginPhoneStep = isLoginMode && loginStep === 'phone';
    const isLoginPinStep = isLoginMode && loginStep === 'pin';
    const canShowAppleSignIn = Platform.OS === 'ios';
    const isRegisterPhoneStep = !isLoginMode && registerStep === 'phone';
    const isRegisterIdentityStep = !isLoginMode && registerStep === 'identity';
    const isRegisterSecurityStep = !isLoginMode && registerStep === 'security';
    const isRegisterPreferencesStep = !isLoginMode && registerStep === 'preferences';
    const oauthRegistrationProvider: OAuthProvider | null = googleRegistrationToken
        ? 'google'
        : appleRegistrationToken
          ? 'apple'
          : null;
    const isOAuthRegistrationFlow = !isLoginMode && Boolean(oauthRegistrationProvider);
    const isAppleRegistrationFlow = oauthRegistrationProvider === 'apple';
    const shouldSkipManualIdentityStep = isOAuthRegistrationFlow || isAppleRegistrationFlow;
    const oauthProviderLabel = oauthRegistrationProvider
        ? OAUTH_PROVIDER_LABEL[oauthRegistrationProvider]
        : 'Google';

    useEffect(() => {
        if (readParam(params.mode) === 'register') {
            setMode('register');
            return;
        }
        setMode('login');
    }, [params.mode]);

    useEffect(() => {
        if (!shouldSkipManualIdentityStep) {
            return;
        }

        if (registerStep === 'identity' || registerStep === 'security') {
            setRegisterStep('preferences');
        }
    }, [registerStep, shouldSkipManualIdentityStep]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const showAlert = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' = 'info',
        onConfirm?: () => void
    ) => {
        setAlert({ visible: true, title, message, type, onConfirm });
    };

    const hideAlert = () => {
        setAlert({ ...alert, visible: false });
    };

    const completeAuthSession = async (accessToken: string, refreshToken: string) => {
        return authFlowService.completeSession(
            {
                accessToken,
                refreshToken,
            },
            dispatch
        );
    };

    const resolveSuccessRoute = () => {
        const returnUrl = readParam(params.returnUrl).trim();
        if (returnUrl) return returnUrl;

        const source = readParam(params.source).trim();
        if (source === 'tab_messages') return '/(tabs)/messages';
        if (source === 'tab_orders') return '/(tabs)/orders';
        if (source === 'tab_profile') return '/(tabs)/profile';
        if (source === 'seller_space') return '/seller/(seller)';
        if (source === 'delivery_space') return '/delivery-persons/(delivery-persons)';

        return '/(tabs)';
    };

    const shouldGoHomeOnClose = () => {
        const source = readParam(params.source).trim();
        const returnUrl = readParam(params.returnUrl).trim();
        return source.length > 0 || returnUrl.length > 0;
    };

    const closeModal = () => {
        if (shouldGoHomeOnClose()) {
            router.replace('/(tabs)' as any);
            return;
        }
        router.back();
    };

    const redirectAfterSuccess = () => {
        router.replace(resolveSuccessRoute() as any);
    };

    const resetRegisterData = () => {
        setRegisterStep('phone');
        setFirstName('');
        setLastName('');
        setPin('');
        setConfirmPin('');
        setShowPin(false);
        setShowConfirmPin(false);
        setSelectedCategories([]);
        setGoogleRegistrationToken(undefined);
        setAppleRegistrationToken(undefined);
        setGoogleProfileImage(undefined);
        setGoogleAutoPin(undefined);
        setAppleAutoPin(undefined);
        setIsFirstNameFocused(false);
        setIsLastNameFocused(false);
        setIsPinFocused(false);
        setIsConfirmPinFocused(false);
    };

    const resolveNormalizedPhone = () => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) {
            showAlert('Erreur', 'Veuillez entrer votre numero de telephone', 'error');
            return null;
        }

        try {
            return normalizePhoneNumberForApi(trimmedPhone);
        } catch (error: any) {
            showAlert('Erreur', error?.message || 'Numero de telephone invalide', 'error');
            return null;
        }
    };

    const validateIdentityStep = () => {
        if (!firstName.trim() || !lastName.trim()) {
            showAlert('Erreur', 'Veuillez remplir votre prenom et votre nom', 'error');
            return false;
        }
        return true;
    };

    const validateSecurityStep = () => {
        if (!isPinValid(pin)) {
            showAlert('Erreur', 'Le code PIN doit contenir 4 chiffres', 'error');
            return false;
        }
        if (pin !== confirmPin) {
            showAlert('Erreur', 'Les codes PIN ne correspondent pas', 'error');
            return false;
        }
        return true;
    };

    const validatePreferencesStep = () => {
        if (selectedCategories.length === 0) {
            showAlert('Erreur', 'Selectionnez au moins une categorie', 'error');
            return false;
        }
        return true;
    };

    const handleContinueToRegisterStep = () => {
        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) return;

        setPhone(normalizedPhone);
        if (shouldSkipManualIdentityStep) {
            setRegisterStep('preferences');
            return;
        }

        setRegisterStep('identity');
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories((previous) =>
            previous.includes(categoryId)
                ? previous.filter((id) => id !== categoryId)
                : [...previous, categoryId]
        );
    };

    const resolveOAuthRegistrationPin = (provider: OAuthProvider) => {
        const cachedPin = provider === 'apple' ? appleAutoPin : googleAutoPin;
        if (cachedPin && isPinValid(cachedPin)) {
            return cachedPin;
        }

        const generatedPin = generateFourDigitPin();
        if (provider === 'apple') {
            setAppleAutoPin(generatedPin);
        } else {
            setGoogleAutoPin(generatedPin);
        }
        return generatedPin;
    };

    const handleRegister = async () => {
        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) {
            return;
        }

        const usingOAuthDraft = Boolean(oauthRegistrationProvider);

        if (shouldSkipManualIdentityStep) {
            if (!validatePreferencesStep()) {
                return;
            }
        } else if (!validateIdentityStep() || !validateSecurityStep() || !validatePreferencesStep()) {
            return;
        }

        const resolvedFirstName = usingOAuthDraft
            ? firstName.trim() || 'Utilisateur'
            : firstName.trim();
        const resolvedLastName = usingOAuthDraft
            ? lastName.trim() || oauthProviderLabel
            : lastName.trim();
        const resolvedPin = oauthRegistrationProvider
            ? resolveOAuthRegistrationPin(oauthRegistrationProvider)
            : pin;

        try {
            const response = await register({
                phone: normalizedPhone,
                firstName: resolvedFirstName,
                lastName: resolvedLastName,
                pin: resolvedPin,
                preferredCategoryIds: selectedCategories,
                image: googleProfileImage,
                googleRegistrationToken,
                appleRegistrationToken,
            }).unwrap();

            await completeAuthSession(response.access_token, response.refresh_token);
            showAlert('Succes', 'Votre compte a ete cree avec succes', 'success', () => {
                redirectAfterSuccess();
            });
        } catch (error: any) {
            console.error('Register error:', error);
            const errorMessage = readApiErrorMessage(error);

            if (
                oauthRegistrationProvider &&
                isOAuthRegistrationSessionExpired(oauthRegistrationProvider, errorMessage)
            ) {
                showAlert(
                    `Session ${oauthProviderLabel} expiree`,
                    `Votre session ${oauthProviderLabel} a expire. Appuyez sur OK pour vous reconnecter et continuer sans perdre vos informations.`,
                    'warning',
                    () => {
                        void refreshOAuthRegistrationSession(oauthRegistrationProvider);
                    }
                );
                return;
            }

            showAlert('Erreur', errorMessage || 'Erreur lors de l inscription', 'error');
        }
    };

    const handleContinueToPin = () => {
        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) return;
        setPhone(normalizedPhone);
        setLoginStep('pin');
    };

    const handleForgotPin = () => {
        if (isBusy) return;
        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) return;
        setPhone(normalizedPhone);
        router.push({
            pathname: '/forgot-pin',
            params: { phone: normalizedPhone },
        });
    };

    const handleLogin = async () => {
        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) return;
        if (!isPinValid(pin)) {
            showAlert('Erreur', 'Le code PIN doit contenir 4 chiffres', 'error');
            return;
        }

        try {
            const response = await login({ phone: normalizedPhone, pin }).unwrap();
            await completeAuthSession(response.access_token, response.refresh_token);
            showAlert('Succes', 'Connexion reussie', 'success', () => {
                redirectAfterSuccess();
            });
        } catch (error: any) {
            console.error('Login error:', error);
            showAlert(
                'Erreur',
                error?.data?.message || 'Numero de telephone ou code PIN incorrect',
                'error'
            );
        }
    };

    const setOAuthLoading = (provider: OAuthProvider, isLoading: boolean) => {
        if (provider === 'apple') {
            setIsAppleLoading(isLoading);
            return;
        }
        setIsGoogleLoading(isLoading);
    };

    const runOAuthLogin = (provider: OAuthProvider) =>
        provider === 'apple'
            ? authFlowService.loginWithApple()
            : authFlowService.loginWithGoogle();

    const applyOAuthRegistrationDraft = (
        provider: OAuthProvider,
        result: {
            registrationToken: string;
            profile: {
                firstName: string;
                lastName: string;
                image?: string;
            };
        },
        options?: {
            preserveNames?: boolean;
        }
    ) => {
        const generatedPin = generateFourDigitPin();

        if (provider === 'apple') {
            setAppleRegistrationToken(result.registrationToken);
            setAppleAutoPin(generatedPin);
            setGoogleRegistrationToken(undefined);
            setGoogleProfileImage(undefined);
            setGoogleAutoPin(undefined);
        } else {
            setGoogleRegistrationToken(result.registrationToken);
            setGoogleProfileImage(result.profile.image);
            setGoogleAutoPin(generatedPin);
            setAppleRegistrationToken(undefined);
            setAppleAutoPin(undefined);
        }

        if (options?.preserveNames) {
            if (!firstName.trim()) {
                setFirstName(result.profile.firstName || '');
            }
            if (!lastName.trim()) {
                setLastName(result.profile.lastName || '');
            }
            return;
        }

        setFirstName(result.profile.firstName || '');
        setLastName(result.profile.lastName || '');
    };

    const handleOAuthAuth = async (provider: OAuthProvider) => {
        const label = OAUTH_PROVIDER_LABEL[provider];
        setOAuthLoading(provider, true);
        try {
            const result = await runOAuthLogin(provider);

            if (result.kind === 'registration_required') {
                setMode('register');
                setLoginStep('phone');
                setRegisterStep('phone');
                setSelectedCategories([]);
                setPin('');
                setConfirmPin('');
                setShowPin(false);
                setShowConfirmPin(false);
                setIsPinFocused(false);
                setIsConfirmPinFocused(false);
                applyOAuthRegistrationDraft(provider, result);
                showAlert(
                    'Inscription requise',
                    OAUTH_REGISTRATION_INFO_MESSAGE,
                    'info'
                );
                return;
            }

            await completeAuthSession(result.tokens.accessToken, result.tokens.refreshToken);
            showAlert('Succes', `Connexion ${label} reussie`, 'success', () => {
                redirectAfterSuccess();
            });
        } catch (error: any) {
            console.error(`${label} auth error:`, error);
            showAlert(
                'Erreur',
                error?.message || `Impossible de se connecter avec ${label}.`,
                'error'
            );
        } finally {
            setOAuthLoading(provider, false);
        }
    };

    const handleGoogleAuth = async () => {
        await handleOAuthAuth('google');
    };

    const handleAppleAuth = async () => {
        await handleOAuthAuth('apple');
    };

    const refreshOAuthRegistrationSession = async (provider: OAuthProvider) => {
        const label = OAUTH_PROVIDER_LABEL[provider];
        setOAuthLoading(provider, true);
        try {
            const result = await runOAuthLogin(provider);

            if (result.kind === 'authenticated') {
                await completeAuthSession(result.tokens.accessToken, result.tokens.refreshToken);
                showAlert('Succes', `Connexion ${label} reussie`, 'success', () => {
                    redirectAfterSuccess();
                });
                return;
            }

            applyOAuthRegistrationDraft(provider, result, { preserveNames: true });

            showAlert(
                'Session actualisee',
                `Connexion ${label} actualisee. Vous pouvez continuer l inscription.`,
                'success'
            );
        } catch (error: any) {
            console.error(`${label} refresh error:`, error);
            showAlert(
                'Erreur',
                error?.message || `Impossible de reinitialiser la session ${label}.`,
                'error'
            );
        } finally {
            setOAuthLoading(provider, false);
        }
    };

    const handleModeChange = (nextMode: AuthMode) => {
        if (isBusy) return;

        setMode(nextMode);
        setLoginStep('phone');
        setRegisterStep('phone');
        setIsPhoneFocused(false);
        setPin('');
        setShowPin(false);
        setIsPinFocused(false);

        resetRegisterData();
    };

    const goToPreviousStep = () => {
        if (isBusy) return;

        if (isLoginMode) {
            if (loginStep === 'pin') {
                setLoginStep('phone');
                setPin('');
                setShowPin(false);
                setIsPinFocused(false);
                return;
            }
            closeModal();
            return;
        }

        if (shouldSkipManualIdentityStep) {
            if (registerStep === 'preferences') {
                setRegisterStep('phone');
                return;
            }
            closeModal();
            return;
        }

        if (registerStep === 'preferences') {
            setRegisterStep('security');
            return;
        }
        if (registerStep === 'security') {
            setRegisterStep('identity');
            return;
        }
        if (registerStep === 'identity') {
            setRegisterStep('phone');
            return;
        }
        closeModal();
    };

    const handlePrimaryAction = () => {
        if (isLoginMode) {
            if (isLoginPhoneStep) {
                handleContinueToPin();
                return;
            }
            void handleLogin();
            return;
        }

        if (shouldSkipManualIdentityStep) {
            if (isRegisterPhoneStep) {
                handleContinueToRegisterStep();
                return;
            }
            if (isRegisterPreferencesStep) {
                void handleRegister();
                return;
            }
        }

        if (isRegisterPhoneStep) {
            handleContinueToRegisterStep();
            return;
        }
        if (isRegisterIdentityStep) {
            if (!validateIdentityStep()) return;
            setRegisterStep('security');
            return;
        }
        if (isRegisterSecurityStep) {
            if (!validateSecurityStep()) return;
            setRegisterStep('preferences');
            return;
        }
        if (isRegisterPreferencesStep) {
            void handleRegister();
        }
    };

    const isSubmitting = isRegistering || isLoggingIn;
    const isBusy = isSubmitting || isGoogleLoading || isAppleLoading;

    const keyboardVerticalOffset = Platform.select({
        ios: 0,
        android: Math.max(insets.bottom, 10),
        default: 0,
    });

    const scrollToForm = () => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 120);
    };

    const modeTitle = isLoginMode
        ? isLoginPhoneStep
            ? 'Connexion'
            : 'Code PIN'
        : shouldSkipManualIdentityStep
          ? isRegisterPhoneStep
            ? 'Numero de telephone'
            : 'Preferences'
        : isRegisterPhoneStep
          ? 'Creer un compte'
          : isRegisterIdentityStep
              ? 'Vos informations'
              : isRegisterSecurityStep
                ? 'Code PIN'
                : 'Preferences';

    const modeSubtitle = isLoginMode
        ? isLoginPhoneStep
            ? 'Entrez votre numero pour continuer.'
            : `Saisissez votre PIN${phone.trim() ? ` pour ${phone.trim()}` : ''}.`
        : shouldSkipManualIdentityStep
          ? isRegisterPhoneStep
            ? `Ajoutez le numero lie a votre compte ${oauthProviderLabel}.`
            : 'Selectionnez vos categories preferees.'
        : isRegisterPhoneStep
          ? 'Un numero suffit pour demarrer.'
          : isRegisterIdentityStep
              ? 'Ces informations identifient votre compte.'
              : isRegisterSecurityStep
                ? 'Choisissez un code simple a retenir.'
                : 'Selectionnez vos categories preferees.';

    const helperMessage = isLoginMode
        ? isLoginPhoneStep
            ? canShowAppleSignIn
                ? 'Vous pouvez aussi utiliser Google ou Apple.'
                : 'Vous pouvez aussi utiliser Google.'
            : 'Le PIN contient exactement 4 chiffres.'
        : shouldSkipManualIdentityStep
          ? isRegisterPhoneStep
            ? `Numero requis pour lier votre compte ${oauthProviderLabel}.`
            : 'Au moins une categorie est requise.'
        : isRegisterPhoneStep
          ? canShowAppleSignIn
            ? 'Google et Apple remplissent deja une partie du compte.'
            : 'Google peut remplir une partie du compte.'
        : isRegisterIdentityStep
              ? 'Utilisez les informations du titulaire du compte.'
              : isRegisterSecurityStep
                ? 'Votre PIN doit contenir exactement 4 chiffres.'
                : 'Au moins une categorie est requise.';

    const currentProgress = isLoginMode
        ? LOGIN_PROGRESS
        : shouldSkipManualIdentityStep
          ? OAUTH_REGISTER_PROGRESS
          : REGISTER_PROGRESS;
    const currentProgressStep = isLoginMode ? loginStep : registerStep;
    const currentProgressIndexRaw = currentProgress.findIndex(
        (item) => item.step === currentProgressStep
    );
    const currentProgressIndex = currentProgressIndexRaw >= 0 ? currentProgressIndexRaw : 0;
    const modeIconName: keyof typeof Ionicons.glyphMap = isLoginMode
        ? isLoginPhoneStep
            ? 'call-outline'
            : 'lock-closed-outline'
        : isRegisterPhoneStep
          ? 'person-add-outline'
          : isRegisterIdentityStep
              ? 'person-outline'
              : isRegisterSecurityStep
                ? 'key-outline'
                : 'grid-outline';
    const modeStepHeader = isLoginMode
        ? `Connexion - Etape ${loginStep === 'phone' ? '1' : '2'}/2`
        : `Inscription - Etape ${currentProgressIndex + 1}/${currentProgress.length}`;
    const primaryActionText = isLoginMode
        ? isLoginPhoneStep
            ? 'Continuer'
            : isSubmitting
              ? 'Connexion...'
              : 'Se connecter'
        : shouldSkipManualIdentityStep
          ? isRegisterPhoneStep
            ? isSubmitting
              ? 'Traitement...'
              : 'Continuer'
            : isSubmitting
                ? 'Creation...'
                : 'Finaliser mon compte'
        : isRegisterPhoneStep
          ? isSubmitting
              ? 'Traitement...'
              : 'Continuer'
          : isRegisterIdentityStep || isRegisterSecurityStep
              ? 'Continuer'
              : isSubmitting
                ? 'Inscription...'
                : 'Creer mon compte';
    const showOAuthButtons = isLoginPhoneStep || (isRegisterPhoneStep && !shouldSkipManualIdentityStep);
    const showGoogleButton = showOAuthButtons;
    const showAppleButton = showOAuthButtons && canShowAppleSignIn;
    const activeAccentColor = isLoginMode ? Colors.primary : Colors.accentDark;
    const activeAccentSoftColor = isLoginMode ? Colors.primary + '12' : Colors.accent + '18';
    const activeProgressLabel = currentProgress[currentProgressIndex]?.label ?? '';

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.backdrop} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <Animated.View
                    style={[
                        styles.animatedContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <KeyboardAvoidingView
                        style={styles.container}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={keyboardVerticalOffset}
                    >
                        <ScrollView
                            ref={scrollRef}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            <View style={styles.handle} />

                            <View style={styles.header}>
                                <View style={styles.brandBadge}>
                                    <View
                                        style={[
                                            styles.brandDot,
                                            { backgroundColor: activeAccentSoftColor },
                                        ]}
                                    >
                                        <Ionicons
                                            name="shield-checkmark-outline"
                                            size={15}
                                            color={activeAccentColor}
                                        />
                                    </View>
                                    <Text style={styles.brandBadgeText}>Compte UTY</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={closeModal}
                                    disabled={isBusy}
                                >
                                    <Ionicons name="close" size={22} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modeCard}>
                                <View
                                    style={[
                                        styles.modeIconCircle,
                                        { backgroundColor: activeAccentSoftColor },
                                    ]}
                                >
                                    <Ionicons name={modeIconName} size={21} color={activeAccentColor} />
                                </View>
                                <View style={styles.modeTextWrap}>
                                    <Text style={styles.modeStep}>{modeStepHeader}</Text>
                                    <Text style={styles.heroTitle}>{modeTitle}</Text>
                                    <Text style={styles.heroSubtitle}>{modeSubtitle}</Text>
                                </View>
                            </View>

                            <View style={styles.tabsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        mode === 'register' && styles.tabActiveRegister,
                                    ]}
                                    onPress={() => handleModeChange('register')}
                                    disabled={isBusy}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            mode === 'register' && styles.tabTextActive,
                                        ]}
                                    >
                                        {"S'inscrire"}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        mode === 'login' && styles.tabActiveLogin,
                                    ]}
                                    onPress={() => handleModeChange('login')}
                                    disabled={isBusy}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            mode === 'login' && styles.tabTextActive,
                                        ]}
                                    >
                                        Se connecter
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.progressBlock}>
                                <View style={styles.progressTrack}>
                                    {currentProgress.map((item, index) => {
                                        const isReached = index <= currentProgressIndex;
                                        return (
                                            <View
                                                key={item.step}
                                                style={[
                                                    styles.progressSegment,
                                                    isReached && { backgroundColor: activeAccentColor },
                                                ]}
                                            />
                                        );
                                    })}
                                </View>
                                <View style={styles.progressMetaRow}>
                                    <Text style={[styles.progressMetaText, { color: activeAccentColor }]}>
                                        Etape {currentProgressIndex + 1}/{currentProgress.length}
                                    </Text>
                                    <Text style={styles.progressMetaHint}>{activeProgressLabel}</Text>
                                </View>
                            </View>

                            <View style={styles.form}>
                                {(isRegisterPhoneStep || isLoginPhoneStep) ? (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Numero de telephone</Text>
                                        <View
                                            style={[
                                                styles.inputContainer,
                                                isPhoneFocused &&
                                                    (isRegisterPhoneStep
                                                        ? styles.inputContainerFocusedWarm
                                                        : styles.inputContainerFocusedCool),
                                            ]}
                                        >
                                            <Ionicons name="call-outline" size={19} color={Colors.gray500} />
                                            <TextInput
                                                style={styles.input}
                                                value={phone}
                                                onChangeText={setPhone}
                                                onFocus={() => {
                                                    setIsPhoneFocused(true);
                                                    scrollToForm();
                                                }}
                                                onBlur={() => setIsPhoneFocused(false)}
                                                placeholder="Ex: 0812345678"
                                                placeholderTextColor={Colors.gray400}
                                                keyboardType="phone-pad"
                                                autoCapitalize="none"
                                                returnKeyType={isRegisterPhoneStep ? 'send' : 'next'}
                                                onSubmitEditing={() => {
                                                    if (isRegisterPhoneStep) {
                                                        handleContinueToRegisterStep();
                                                        return;
                                                    }
                                                    handleContinueToPin();
                                                }}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.phoneSummaryCard}>
                                        <Text style={styles.phoneSummaryLabel}>Numero utilise</Text>
                                        <View style={styles.phoneSummaryValueRow}>
                                            <Text style={styles.phoneSummaryValue}>{phone.trim()}</Text>
                                            <TouchableOpacity
                                                style={styles.phoneSummaryEditButton}
                                                onPress={() => {
                                                    if (isLoginMode) {
                                                        setLoginStep('phone');
                                                    } else {
                                                        setRegisterStep('phone');
                                                    }
                                                    setShowPin(false);
                                                    setIsPinFocused(false);
                                                }}
                                            >
                                                <Text style={styles.phoneSummaryEditText}>Modifier</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {isLoginPinStep && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Code PIN</Text>
                                        <View
                                            style={[
                                                styles.inputContainer,
                                                isPinFocused &&
                                                    styles.inputContainerFocusedCool,
                                            ]}
                                        >
                                            <Ionicons
                                                name="lock-closed-outline"
                                                size={19}
                                                color={Colors.gray500}
                                            />
                                            <TextInput
                                                style={styles.input}
                                                value={pin}
                                                onChangeText={setPin}
                                                onFocus={() => {
                                                    setIsPinFocused(true);
                                                    scrollToForm();
                                                }}
                                                onBlur={() => setIsPinFocused(false)}
                                                placeholder="4 chiffres"
                                                placeholderTextColor={Colors.gray400}
                                                secureTextEntry={!showPin}
                                                keyboardType="number-pad"
                                                maxLength={4}
                                            />
                                            <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeButton}>
                                                <Ionicons
                                                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                                    size={18}
                                                    color={Colors.gray500}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.pinHintRow}>
                                            <Ionicons name="information-circle-outline" size={14} color={Colors.gray500} />
                                            <Text style={styles.pinHintText}>Le PIN contient exactement 4 chiffres</Text>
                                        </View>
                                        <TouchableOpacity onPress={handleForgotPin} style={styles.forgotPinButton}>
                                            <Text style={styles.forgotPinText}>PIN oublie ? Reinitialiser</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {isRegisterIdentityStep && !shouldSkipManualIdentityStep && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Prenom</Text>
                                            <View
                                                style={[
                                                    styles.inputContainer,
                                                    isFirstNameFocused && styles.inputContainerFocusedCool,
                                                ]}
                                            >
                                                <Ionicons name="person-outline" size={19} color={Colors.gray500} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={firstName}
                                                    onChangeText={(text) => setFirstName(normalizeTextInputValue(text))}
                                                    onFocus={() => {
                                                        setIsFirstNameFocused(true);
                                                        scrollToForm();
                                                    }}
                                                    onBlur={() => setIsFirstNameFocused(false)}
                                                    placeholder="Votre prenom"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Nom</Text>
                                            <View
                                                style={[
                                                    styles.inputContainer,
                                                    isLastNameFocused && styles.inputContainerFocusedCool,
                                                ]}
                                            >
                                                <Ionicons name="person-outline" size={19} color={Colors.gray500} />
                                                <TextInput
                                                    style={styles.input}
                                                    value={lastName}
                                                    onChangeText={(text) => setLastName(normalizeTextInputValue(text))}
                                                    onFocus={() => {
                                                        setIsLastNameFocused(true);
                                                        scrollToForm();
                                                    }}
                                                    onBlur={() => setIsLastNameFocused(false)}
                                                    placeholder="Votre nom"
                                                    placeholderTextColor={Colors.gray400}
                                                />
                                            </View>
                                        </View>
                                    </>
                                )}

                                {isRegisterSecurityStep && !shouldSkipManualIdentityStep && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Code PIN (4 chiffres)</Text>
                                            <View
                                                style={[
                                                    styles.inputContainer,
                                                    isPinFocused && styles.inputContainerFocusedCool,
                                                ]}
                                            >
                                                <Ionicons
                                                    name="lock-closed-outline"
                                                    size={19}
                                                    color={Colors.gray500}
                                                />
                                                <TextInput
                                                    style={styles.input}
                                                    value={pin}
                                                    onChangeText={setPin}
                                                    onFocus={() => {
                                                        setIsPinFocused(true);
                                                        scrollToForm();
                                                    }}
                                                    onBlur={() => setIsPinFocused(false)}
                                                    placeholder="4 chiffres"
                                                    placeholderTextColor={Colors.gray400}
                                                    secureTextEntry={!showPin}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                />
                                                <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeButton}>
                                                    <Ionicons
                                                        name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={18}
                                                        color={Colors.gray500}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Confirmer le PIN</Text>
                                            <View
                                                style={[
                                                    styles.inputContainer,
                                                    isConfirmPinFocused && styles.inputContainerFocusedCool,
                                                ]}
                                            >
                                                <Ionicons
                                                    name="lock-closed-outline"
                                                    size={19}
                                                    color={Colors.gray500}
                                                />
                                                <TextInput
                                                    style={styles.input}
                                                    value={confirmPin}
                                                    onChangeText={setConfirmPin}
                                                    onFocus={() => {
                                                        setIsConfirmPinFocused(true);
                                                        scrollToForm();
                                                    }}
                                                    onBlur={() => setIsConfirmPinFocused(false)}
                                                    placeholder="4 chiffres"
                                                    placeholderTextColor={Colors.gray400}
                                                    secureTextEntry={!showConfirmPin}
                                                    keyboardType="number-pad"
                                                    maxLength={4}
                                                />
                                                <TouchableOpacity
                                                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                                                    style={styles.eyeButton}
                                                >
                                                    <Ionicons
                                                        name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                                                        size={18}
                                                        color={Colors.gray500}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {isRegisterPreferencesStep && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Categories preferees</Text>
                                        {isFetchingCategories && rootCategories.length === 0 ? (
                                            <View style={styles.categoriesLoadingCard}>
                                                <Text style={styles.categoriesLoadingText}>
                                                    Chargement des categories...
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.categoriesGrid}>
                                                {rootCategories.map((category) => {
                                                    const isSelected = selectedCategories.includes(category._id);
                                                    return (
                                                        <TouchableOpacity
                                                            key={category._id}
                                                            activeOpacity={0.86}
                                                            style={[
                                                                styles.categoryChip,
                                                                isSelected && styles.categoryChipSelected,
                                                            ]}
                                                            onPress={() => toggleCategory(category._id)}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.categoryIconWrap,
                                                                    isSelected && styles.categoryIconWrapSelected,
                                                                ]}
                                                            >
                                                                <CategoryIcon
                                                                    icon={category.icon}
                                                                    size={28}
                                                                    textStyle={styles.categoryIconText}
                                                                    imageStyle={styles.categoryIconImage}
                                                                />
                                                            </View>

                                                            {isSelected ? (
                                                                <View style={styles.categorySelectedBadge}>
                                                                    <Ionicons
                                                                        name="checkmark"
                                                                        size={12}
                                                                        color={Colors.white}
                                                                    />
                                                                </View>
                                                            ) : null}

                                                            <Text
                                                                style={[
                                                                    styles.categoryName,
                                                                    isSelected && styles.categoryNameSelected,
                                                                ]}
                                                                numberOfLines={2}
                                                            >
                                                                {category.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}

                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={goToPreviousStep}
                                        disabled={isBusy}
                                    >
                                        <Text style={styles.secondaryButtonText}>Retour</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.submitButton, isBusy && styles.disabledButton]}
                                        onPress={handlePrimaryAction}
                                        disabled={isBusy}
                                    >
                                        <LinearGradient
                                            colors={[activeAccentColor, activeAccentColor]}
                                            style={styles.submitGradient}
                                        >
                                            <Text style={styles.submitButtonText}>{primaryActionText}</Text>
                                            <View
                                                style={[
                                                    styles.submitIconWrap,
                                                    mode === 'register'
                                                        ? styles.submitIconWrapWarm
                                                        : styles.submitIconWrapCool,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={
                                                        isRegisterPreferencesStep
                                                            ? 'checkmark'
                                                            : 'arrow-forward'
                                                    }
                                                    size={18}
                                                    color={activeAccentColor}
                                                />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                {showOAuthButtons ? (
                                    <>
                                        <View style={styles.dividerRow}>
                                            <View style={styles.dividerLine} />
                                            <Text style={styles.dividerText}>ou</Text>
                                            <View style={styles.dividerLine} />
                                        </View>

                                        <View style={styles.oauthButtonsColumn}>
                                            {showGoogleButton ? (
                                                <TouchableOpacity
                                                    style={[styles.googleButton, isGoogleLoading && styles.disabledButton]}
                                                    onPress={() => void handleGoogleAuth()}
                                                    disabled={isBusy}
                                                >
                                                    <Ionicons name="logo-google" size={18} color={Colors.primary} />
                                                    <Text style={styles.googleButtonText}>
                                                        {isGoogleLoading
                                                            ? 'Connexion Google...'
                                                            : 'Continuer avec Google'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : null}

                                            {showAppleButton ? (
                                                <TouchableOpacity
                                                    style={[styles.appleButton, isAppleLoading && styles.disabledButton]}
                                                    onPress={() => void handleAppleAuth()}
                                                    disabled={isBusy}
                                                >
                                                    <Ionicons name="logo-apple" size={20} color={Colors.textPrimary} />
                                                    <Text style={styles.appleButtonText}>
                                                        {isAppleLoading
                                                            ? 'Connexion Apple...'
                                                            : 'Continuer avec Apple'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    </>
                                ) : null}

                                <View style={styles.helperRow}>
                                    <Ionicons
                                        name={
                                            isLoginMode
                                                ? 'information-circle-outline'
                                                : isRegisterSecurityStep
                                                  ? 'lock-closed-outline'
                                                  : 'flash-outline'
                                        }
                                        size={16}
                                        color={isLoginMode ? Colors.primary : Colors.accentDark}
                                    />
                                    <Text style={styles.helperText}>{helperMessage}</Text>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </Animated.View>
            </SafeAreaView>

            {/* Custom Alert */}
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={() => {
                    hideAlert();
                    alert.onConfirm?.();
                }}
                confirmText="OK"
            />
        </View>
  );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 19, 37, 0.42)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 26, 52, 0.28)',
    },
    container: {
        flex: 1,
    },
    animatedContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        marginTop: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.huge,
    },
    handle: {
        alignSelf: 'center',
        width: 54,
        height: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray300,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    brandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    brandDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandBadgeText: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.md,
    },
    modeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeStep: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: Colors.textPrimary,
        marginTop: 3,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroSubtitle: {
        color: Colors.gray600,
        marginTop: 4,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    modeTextWrap: {
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xl,
        padding: 4,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    tab: {
        flex: 1,
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.xl,
    },
    tabActiveRegister: {
        backgroundColor: Colors.accentDark,
    },
    tabActiveLogin: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    progressBlock: {
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    progressTrack: {
        flexDirection: 'row',
        gap: 6,
    },
    progressSegment: {
        flex: 1,
        height: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray200,
    },
    progressMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    progressMetaText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
    progressMetaHint: {
        flex: 1,
        textAlign: 'right',
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    form: {
        gap: Spacing.md,
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginLeft: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    inputContainerFocusedWarm: {
        borderColor: Colors.accentDark,
        backgroundColor: Colors.white,
    },
    inputContainerFocusedCool: {
        borderColor: Colors.primary,
        backgroundColor: Colors.white,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    eyeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
    },
    pinHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 2,
    },
    pinHintText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    forgotPinButton: {
        alignSelf: 'flex-end',
        paddingVertical: 2,
    },
    forgotPinText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    phoneSummaryCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '22',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.xs,
    },
    phoneSummaryLabel: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    phoneSummaryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    phoneSummaryValue: {
        flex: 1,
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    phoneSummaryEditButton: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '35',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        backgroundColor: Colors.primary + '10',
    },
    phoneSummaryEditText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    categoriesLoadingCard: {
        minHeight: 62,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    categoriesLoadingText: {
        textAlign: 'center',
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    categoryChip: {
        width: '48%',
        minHeight: 108,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        position: 'relative',
    },
    categoryChipSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '12',
    },
    categoryIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
    },
    categoryIconWrapSelected: {
        backgroundColor: Colors.primary + '16',
    },
    categorySelectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white,
    },
    categoryIconText: {
        fontSize: 28,
    },
    categoryIconImage: {
        borderRadius: 14,
    },
    categoryName: {
        width: '100%',
        textAlign: 'center',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    categoryNameSelected: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    secondaryButton: {
        flex: 0.8,
        minHeight: 54,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    secondaryButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    submitButton: {
        flex: 1.2,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    submitButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        letterSpacing: 0.2,
    },
    submitIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '66',
    },
    submitIconWrapWarm: {
        backgroundColor: Colors.white + 'EC',
    },
    submitIconWrapCool: {
        backgroundColor: Colors.white,
    },
    disabledButton: {
        opacity: 0.6,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.gray200,
    },
    dividerText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
        textTransform: 'uppercase',
    },
    googleButton: {
        minHeight: 52,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    oauthButtonsColumn: {
        gap: Spacing.sm,
    },
    googleButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    appleButton: {
        minHeight: 52,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    appleButtonText: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    secondaryActionButton: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    secondaryActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    helperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.xs,
    },
    helperText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.medium,
    },
});
