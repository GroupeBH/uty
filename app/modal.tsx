/**
 * Modal d'authentification unifie - Login & Inscription.
 */

import { CategoryIcon } from '@/components/CategoryIcon';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { authFlowService } from '@/services/authFlowService';
import {
    useLoginMutation,
    useRegisterMutation,
    useRequestOtpMutation,
    useVerifyOtpMutation,
} from '@/store/api/authApi';
import { useGetCategoriesQuery } from '@/store/api/categoriesApi';
import { useAppDispatch } from '@/store/hooks';
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
type RegisterStep = 'phone' | 'otp' | 'identity' | 'security' | 'preferences';

const REGISTER_PROGRESS: { step: RegisterStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'otp', label: 'OTP' },
    { step: 'identity', label: 'Profil' },
    { step: 'security', label: 'PIN' },
    { step: 'preferences', label: 'Preferences' },
];

const GOOGLE_REGISTER_PROGRESS: { step: RegisterStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'otp', label: 'OTP' },
    { step: 'preferences', label: 'Preferences' },
];

const LOGIN_PROGRESS: { step: LoginStep; label: string }[] = [
    { step: 'phone', label: 'Telephone' },
    { step: 'pin', label: 'PIN' },
];

const createEmptyOtp = () => ['', '', '', '', ''];
const isPinValid = (value: string) => /^\d{4}$/.test(value);
const generateFourDigitPin = () => String(Math.floor(1000 + Math.random() * 9000));
const GOOGLE_REGISTRATION_INFO_MESSAGE =
    'Pour une utilisation optimale et fluide de l application, completez ces 2 etapes:\n' +
    '1. Ajoutez votre numero de telephone (validation OTP).\n' +
    '2. Choisissez vos preferences.';

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

const isGoogleRegistrationSessionExpired = (message: string): boolean => {
    const normalized = toNormalizedMessage(message);
    return (
        (normalized.includes('session google') && normalized.includes('expire')) ||
        normalized.includes('google_registration') ||
        normalized.includes('google registration')
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
        title?: string | string[];
        reason?: string | string[];
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
        if (step === 'otp' || step === 'identity' || step === 'security' || step === 'preferences') {
            return step;
        }
        return 'phone';
    });
    const [phone, setPhone] = useState(readParam(params.phone));
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [otp, setOtp] = useState<string[]>(createEmptyOtp());
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [googleRegistrationToken, setGoogleRegistrationToken] = useState<string | undefined>(
        undefined
    );
    const [googleProfileImage, setGoogleProfileImage] = useState<string | undefined>(undefined);
    const [googleAutoPin, setGoogleAutoPin] = useState<string | undefined>(undefined);
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [isPinFocused, setIsPinFocused] = useState(false);
    const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
    const [isLastNameFocused, setIsLastNameFocused] = useState(false);
    const [isConfirmPinFocused, setIsConfirmPinFocused] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    const otpRefs = useRef<(TextInput | null)[]>([]);

    const [requestOtp, { isLoading: isRequestingOtp }] = useRequestOtpMutation();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
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
    const isRegisterPhoneStep = !isLoginMode && registerStep === 'phone';
    const isRegisterOtpStep = !isLoginMode && registerStep === 'otp';
    const isRegisterIdentityStep = !isLoginMode && registerStep === 'identity';
    const isRegisterSecurityStep = !isLoginMode && registerStep === 'security';
    const isRegisterPreferencesStep = !isLoginMode && registerStep === 'preferences';
    const isGoogleRegistrationFlow = !isLoginMode && Boolean(googleRegistrationToken);

    const authRequiredTitle = readParam(params.title).trim();
    const authRequiredMessage = readParam(params.reason).trim();
    const showAuthRequiredNotice = authRequiredTitle.length > 0 || authRequiredMessage.length > 0;

    useEffect(() => {
        if (readParam(params.mode) === 'register') {
            setMode('register');
            return;
        }
        setMode('login');
    }, [params.mode]);

    useEffect(() => {
        if (!isGoogleRegistrationFlow) {
            return;
        }

        if (registerStep === 'identity' || registerStep === 'security') {
            setRegisterStep('preferences');
        }
    }, [isGoogleRegistrationFlow, registerStep]);

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

    const closeModal = () => {
        router.back();
    };

    const redirectAfterSuccess = () => {
        router.replace(resolveSuccessRoute() as any);
    };

    const resetRegisterData = () => {
        setRegisterStep('phone');
        setOtp(createEmptyOtp());
        setFirstName('');
        setLastName('');
        setPin('');
        setConfirmPin('');
        setShowPin(false);
        setShowConfirmPin(false);
        setSelectedCategories([]);
        setGoogleRegistrationToken(undefined);
        setGoogleProfileImage(undefined);
        setGoogleAutoPin(undefined);
        setIsFirstNameFocused(false);
        setIsLastNameFocused(false);
        setIsPinFocused(false);
        setIsConfirmPinFocused(false);
    };

    const validatePhone = () => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) {
            showAlert('Erreur', 'Veuillez entrer votre numero de telephone', 'error');
            return false;
        }
        return true;
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

    const handleRequestOtp = async () => {
        if (!validatePhone()) return;

        const trimmedPhone = phone.trim();

        try {
            await requestOtp({ phone: trimmedPhone }).unwrap();
            setOtp(createEmptyOtp());
            setRegisterStep('otp');
            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 120);
        } catch (error: any) {
            console.error('OTP request error:', error);
            showAlert(
                'Erreur',
                error?.data?.message || 'Erreur lors de l envoi du code OTP',
                'error'
            );
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        const value = text.slice(-1);
        if (value && !/^\d$/.test(value)) {
            return;
        }

        const next = [...otp];
        next[index] = value;
        setOtp(next);

        if (value && index < otpRefs.current.length - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key !== 'Backspace' || otp[index] || index === 0) {
            return;
        }
        otpRefs.current[index - 1]?.focus();
    };

    const handleVerifyOtp = async () => {
        const code = otp.join('');
        if (code.length !== 5) {
            showAlert('Erreur', 'Le code OTP doit contenir 5 chiffres', 'error');
            return;
        }

        try {
            await verifyOtp({ phone: phone.trim(), otp: code }).unwrap();
            setRegisterStep(isGoogleRegistrationFlow ? 'preferences' : 'identity');
        } catch (error: any) {
            console.error('OTP verify error:', error);
            showAlert('Erreur', error?.data?.message || 'Code OTP invalide', 'error');
        }
    };

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories((previous) =>
            previous.includes(categoryId)
                ? previous.filter((id) => id !== categoryId)
                : [...previous, categoryId]
        );
    };

    const resolveGoogleRegistrationPin = () => {
        if (googleAutoPin && isPinValid(googleAutoPin)) {
            return googleAutoPin;
        }

        const generatedPin = generateFourDigitPin();
        setGoogleAutoPin(generatedPin);
        return generatedPin;
    };

    const handleRegister = async () => {
        if (!validatePhone()) {
            return;
        }

        const usingGoogleDraft = Boolean(googleRegistrationToken);

        if (usingGoogleDraft) {
            if (!validatePreferencesStep()) {
                return;
            }
        } else if (!validateIdentityStep() || !validateSecurityStep() || !validatePreferencesStep()) {
            return;
        }

        const resolvedFirstName = usingGoogleDraft
            ? firstName.trim() || 'Utilisateur'
            : firstName.trim();
        const resolvedLastName = usingGoogleDraft ? lastName.trim() || 'Google' : lastName.trim();
        const resolvedPin = usingGoogleDraft ? resolveGoogleRegistrationPin() : pin;

        try {
            const response = await register({
                phone: phone.trim(),
                firstName: resolvedFirstName,
                lastName: resolvedLastName,
                pin: resolvedPin,
                preferredCategoryIds: selectedCategories,
                image: googleProfileImage,
                googleRegistrationToken,
            }).unwrap();

            await completeAuthSession(response.access_token, response.refresh_token);
            showAlert('Succes', 'Votre compte a ete cree avec succes', 'success', () => {
                redirectAfterSuccess();
            });
        } catch (error: any) {
            console.error('Register error:', error);
            const errorMessage = readApiErrorMessage(error);

            if (usingGoogleDraft && isGoogleRegistrationSessionExpired(errorMessage)) {
                showAlert(
                    'Session Google expiree',
                    'Votre session Google a expire. Appuyez sur OK pour vous reconnecter et continuer sans perdre vos informations.',
                    'warning',
                    () => {
                        void refreshGoogleRegistrationSession();
                    }
                );
                return;
            }

            showAlert('Erreur', errorMessage || 'Erreur lors de l inscription', 'error');
        }
    };

    const handleContinueToPin = () => {
        if (!validatePhone()) return;
        setLoginStep('pin');
    };

    const handleLogin = async () => {
        if (!validatePhone()) return;

        const trimmedPhone = phone.trim();
        if (!isPinValid(pin)) {
            showAlert('Erreur', 'Le code PIN doit contenir 4 chiffres', 'error');
            return;
        }

        try {
            const response = await login({ phone: trimmedPhone, pin }).unwrap();
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

    const handleGoogleAuth = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await authFlowService.loginWithGoogle();

            if (result.kind === 'registration_required') {
                setMode('register');
                setLoginStep('phone');
                setRegisterStep('phone');
                setOtp(createEmptyOtp());
                setSelectedCategories([]);
                setPin('');
                setConfirmPin('');
                setShowPin(false);
                setShowConfirmPin(false);
                setIsPinFocused(false);
                setIsConfirmPinFocused(false);
                setGoogleRegistrationToken(result.registrationToken);
                setGoogleProfileImage(result.profile.image);
                setGoogleAutoPin(generateFourDigitPin());
                setFirstName(result.profile.firstName || '');
                setLastName(result.profile.lastName || '');
                showAlert(
                    'Inscription requise',
                    GOOGLE_REGISTRATION_INFO_MESSAGE,
                    'info'
                );
                return;
            }

            await completeAuthSession(result.tokens.accessToken, result.tokens.refreshToken);
            showAlert('Succes', 'Connexion Google reussie', 'success', () => {
                redirectAfterSuccess();
            });
        } catch (error: any) {
            console.error('Google auth error:', error);
            showAlert(
                'Erreur',
                error?.message || 'Impossible de se connecter avec Google.',
                'error'
            );
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const refreshGoogleRegistrationSession = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await authFlowService.loginWithGoogle();

            if (result.kind === 'authenticated') {
                await completeAuthSession(result.tokens.accessToken, result.tokens.refreshToken);
                showAlert('Succes', 'Connexion Google reussie', 'success', () => {
                    redirectAfterSuccess();
                });
                return;
            }

            setGoogleRegistrationToken(result.registrationToken);
            setGoogleProfileImage(result.profile.image);
            setGoogleAutoPin(generateFourDigitPin());
            if (!firstName.trim()) {
                setFirstName(result.profile.firstName || '');
            }
            if (!lastName.trim()) {
                setLastName(result.profile.lastName || '');
            }

            showAlert(
                'Session actualisee',
                'Connexion Google actualisee. Vous pouvez continuer l inscription.',
                'success'
            );
        } catch (error: any) {
            console.error('Google refresh error:', error);
            showAlert(
                'Erreur',
                error?.message || 'Impossible de reinitialiser la session Google.',
                'error'
            );
        } finally {
            setIsGoogleLoading(false);
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

        if (isGoogleRegistrationFlow) {
            if (registerStep === 'preferences') {
                setRegisterStep('otp');
                return;
            }
            if (registerStep === 'otp') {
                setRegisterStep('phone');
                setOtp(createEmptyOtp());
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
            setRegisterStep('otp');
            return;
        }
        if (registerStep === 'otp') {
            setRegisterStep('phone');
            setOtp(createEmptyOtp());
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

        if (isGoogleRegistrationFlow) {
            if (isRegisterPhoneStep) {
                void handleRequestOtp();
                return;
            }
            if (isRegisterOtpStep) {
                void handleVerifyOtp();
                return;
            }
            if (isRegisterPreferencesStep) {
                void handleRegister();
                return;
            }
        }

        if (isRegisterPhoneStep) {
            void handleRequestOtp();
            return;
        }
        if (isRegisterOtpStep) {
            void handleVerifyOtp();
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

    const isSubmitting =
        isRequestingOtp || isVerifyingOtp || isRegistering || isLoggingIn;
    const isBusy = isSubmitting || isGoogleLoading;

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
            ? 'Connexion rapide'
            : 'Verification PIN'
        : isGoogleRegistrationFlow
          ? isRegisterPhoneStep
            ? 'Verification du numero'
            : isRegisterOtpStep
              ? 'Verification OTP'
              : 'Choisissez vos preferences'
        : isRegisterPhoneStep
          ? 'Demarrage'
          : isRegisterOtpStep
            ? 'Verification OTP'
            : isRegisterIdentityStep
              ? 'Completez votre profil'
              : isRegisterSecurityStep
                ? 'Securisez votre compte'
                : 'Choisissez vos preferences';

    const modeSubtitle = isLoginMode
        ? isLoginPhoneStep
            ? 'Etape 1/2: saisissez votre numero de telephone.'
            : `Etape 2/2: saisissez votre PIN${phone.trim() ? ` pour ${phone.trim()}` : ''}.`
        : isGoogleRegistrationFlow
          ? isRegisterPhoneStep
            ? 'Entrez votre numero pour finaliser votre compte Google.'
            : isRegisterOtpStep
              ? `Entrez le code recu au ${phone.trim() || 'numero renseigne'}.`
              : 'Selectionnez les categories qui vous interessent.'
        : isRegisterPhoneStep
          ? 'Entrez votre numero pour recevoir un code OTP.'
          : isRegisterOtpStep
            ? `Entrez le code recu au ${phone.trim() || 'numero renseigne'}.`
            : isRegisterIdentityStep
              ? 'Renseignez vos informations personnelles.'
              : isRegisterSecurityStep
                ? 'Creez un code PIN pour proteger votre compte.'
                : 'Selectionnez les categories qui vous interessent.';

    const helperMessage = isLoginMode
        ? isLoginPhoneStep
            ? 'Continuez avec PIN ou utilisez Google.'
            : 'Le PIN contient exactement 4 chiffres.'
        : isGoogleRegistrationFlow
          ? isRegisterPhoneStep
            ? 'Numero requis pour verifier et lier votre compte Google.'
            : isRegisterOtpStep
              ? 'Le code OTP contient 5 chiffres.'
              : 'Selectionnez au moins une categorie pour terminer.'
        : isRegisterPhoneStep
          ? googleRegistrationToken
            ? 'Compte Google detecte. Finalisez l inscription avec votre numero de telephone.'
            : 'Code OTP envoye en quelques secondes, ou connexion rapide via Google.'
        : isRegisterOtpStep
            ? 'Le code OTP contient 5 chiffres.'
            : isRegisterIdentityStep
              ? 'Utilisez vos vraies informations pour faciliter le support.'
              : isRegisterSecurityStep
                ? 'Votre PIN doit contenir exactement 4 chiffres.'
                : 'Choisissez au moins une categorie pour continuer.';

    const currentProgress = isLoginMode
        ? LOGIN_PROGRESS
        : isGoogleRegistrationFlow
          ? GOOGLE_REGISTER_PROGRESS
          : REGISTER_PROGRESS;
    const currentProgressStep = isLoginMode ? loginStep : registerStep;
    const currentProgressIndexRaw = currentProgress.findIndex(
        (item) => item.step === currentProgressStep
    );
    const currentProgressIndex = currentProgressIndexRaw >= 0 ? currentProgressIndexRaw : 0;
    const modeCardColors = isLoginMode
        ? Gradients.primary
        : isRegisterSecurityStep
          ? Gradients.primary
          : Gradients.accent;
    const modeIconName: keyof typeof Ionicons.glyphMap = isLoginMode
        ? isLoginPhoneStep
            ? 'call-outline'
            : 'lock-closed-outline'
        : isRegisterPhoneStep
          ? 'person-add-outline'
          : isRegisterOtpStep
            ? 'shield-checkmark-outline'
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
        : isGoogleRegistrationFlow
          ? isRegisterPhoneStep
            ? isSubmitting
              ? 'Envoi...'
              : 'Recevoir le code'
            : isRegisterOtpStep
              ? isSubmitting
                ? 'Verification...'
                : 'Verifier'
              : isSubmitting
                ? 'Creation...'
                : 'Finaliser mon compte'
        : isRegisterPhoneStep
          ? isSubmitting
              ? 'Envoi...'
              : 'Recevoir le code'
          : isRegisterOtpStep
            ? isSubmitting
                ? 'Verification...'
                : 'Verifier'
            : isRegisterIdentityStep || isRegisterSecurityStep
              ? 'Continuer'
              : isSubmitting
                ? 'Inscription...'
                : 'Creer mon compte';
    const showGoogleButton = isLoginPhoneStep || (isRegisterPhoneStep && !isGoogleRegistrationFlow);

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
                            <View pointerEvents="none" style={styles.colorOrbWarm} />
                            <View pointerEvents="none" style={styles.colorOrbCool} />
                            <View style={styles.handle} />

                            <View style={styles.header}>
                                <LinearGradient
                                    colors={mode === 'register' ? Gradients.accent : Gradients.primary}
                                    style={styles.brandBadge}
                                >
                                    <Ionicons name="shield-checkmark-outline" size={14} color={Colors.white} />
                                    <Text style={styles.brandBadgeText}>UTY Secure</Text>
                                </LinearGradient>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={closeModal}
                                    disabled={isBusy}
                                >
                                    <Ionicons name="close" size={22} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modeCard}>
                                <LinearGradient colors={modeCardColors} style={styles.modeCardGradient}>
                                    <View style={styles.modeIconCircle}>
                                        <Ionicons name={modeIconName} size={22} color={Colors.white} />
                                    </View>
                                    <View style={styles.authRequiredTextWrap}>
                                        <Text style={styles.modeStep}>{modeStepHeader}</Text>
                                        <Text style={styles.heroTitle}>{modeTitle}</Text>
                                        <Text style={styles.heroSubtitle}>{modeSubtitle}</Text>
                                    </View>
                                </LinearGradient>
                            </View>

                            {showAuthRequiredNotice ? (
                                <View style={styles.authRequiredCard}>
                                    <View style={styles.authRequiredTop}>
                                        <View style={styles.authRequiredIconWrap}>
                                            <Ionicons name="lock-closed-outline" size={18} color={Colors.accentDark} />
                                        </View>
                                        <View style={styles.authRequiredTextWrap}>
                                            <Text style={styles.authRequiredTitle}>
                                                {authRequiredTitle || 'Connexion requise'}
                                            </Text>
                                            <Text style={styles.authRequiredSubtitle}>
                                                {authRequiredMessage || 'Connectez-vous pour continuer.'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : null}

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
                                        S&apos;inscrire
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

                            <View style={styles.progressRow}>
                                {currentProgress.map((item, index) => {
                                    const isDone = index < currentProgressIndex;
                                    const isActive = index === currentProgressIndex;
                                    return (
                                        <View
                                            key={item.step}
                                            style={[
                                                styles.progressChip,
                                                isActive && styles.progressChipActive,
                                                isDone && styles.progressChipDone,
                                            ]}
                                        >
                                            {isDone ? (
                                                <Ionicons name="checkmark" size={14} color={Colors.white} />
                                            ) : (
                                                <Text
                                                    style={[
                                                        styles.progressChipIndex,
                                                        isActive && styles.progressChipIndexActive,
                                                    ]}
                                                >
                                                    {index + 1}
                                                </Text>
                                            )}
                                            <Text
                                                style={[
                                                    styles.progressChipText,
                                                    isActive && styles.progressChipTextActive,
                                                    isDone && styles.progressChipTextDone,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>
                                    );
                                })}
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
                                                        void handleRequestOtp();
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
                                                    setLoginStep('phone');
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
                                    </View>
                                )}

                                {isRegisterOtpStep && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Code OTP (5 chiffres)</Text>
                                        <View style={styles.otpRow}>
                                            {otp.map((digit, index) => (
                                                <TextInput
                                                    key={`otp-${index}`}
                                                    ref={(ref) => {
                                                        otpRefs.current[index] = ref;
                                                    }}
                                                    style={[
                                                        styles.otpInput,
                                                        digit ? styles.otpInputFilled : undefined,
                                                    ]}
                                                    value={digit}
                                                    onChangeText={(text) => handleOtpChange(text, index)}
                                                    onKeyPress={(event) =>
                                                        handleOtpKeyPress(event.nativeEvent.key, index)
                                                    }
                                                    keyboardType="number-pad"
                                                    maxLength={1}
                                                    selectTextOnFocus
                                                />
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {isRegisterIdentityStep && !isGoogleRegistrationFlow && (
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
                                                    onChangeText={setFirstName}
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
                                                    onChangeText={setLastName}
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

                                {isRegisterSecurityStep && !isGoogleRegistrationFlow && (
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
                                            colors={mode === 'register' ? Gradients.accent : Gradients.primary}
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
                                                    color={Colors.primary}
                                                />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                {showGoogleButton ? (
                                    <>
                                        <View style={styles.dividerRow}>
                                            <View style={styles.dividerLine} />
                                            <Text style={styles.dividerText}>ou</Text>
                                            <View style={styles.dividerLine} />
                                        </View>

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
        backgroundColor: '#F7FAFF',
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        marginTop: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.xxl,
        ...Shadows.xl,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingBottom: Spacing.huge,
        position: 'relative',
    },
    colorOrbWarm: {
        position: 'absolute',
        top: 82,
        right: -26,
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: Colors.accent + '33',
    },
    colorOrbCool: {
        position: 'absolute',
        top: 158,
        left: -38,
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: Colors.info + '26',
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
        marginBottom: Spacing.md,
    },
    brandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        ...Shadows.sm,
    },
    brandBadgeText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    closeButton: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    modeCard: {
        marginBottom: Spacing.lg,
    },
    modeCardGradient: {
        borderRadius: BorderRadius.xxl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md + 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        ...Shadows.lg,
    },
    modeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF33',
        borderWidth: 1,
        borderColor: '#FFFFFF55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeStep: {
        color: Colors.white + 'D9',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: Colors.white,
        marginTop: 2,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroSubtitle: {
        color: Colors.white + 'E0',
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    authRequiredCard: {
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.accent + '55',
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
    authRequiredTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    authRequiredIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent + '1F',
        borderWidth: 1,
        borderColor: Colors.accent + '60',
    },
    authRequiredTextWrap: {
        flex: 1,
    },
    authRequiredTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    authRequiredSubtitle: {
        marginTop: 3,
        color: Colors.gray700,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '0A',
        borderRadius: BorderRadius.xxl,
        padding: 5,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        ...Shadows.sm,
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
        ...Shadows.sm,
    },
    tabActiveLogin: {
        backgroundColor: Colors.primary,
        ...Shadows.sm,
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
    progressRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    progressChip: {
        minHeight: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.sm,
    },
    progressChipActive: {
        borderColor: Colors.primary + '66',
        backgroundColor: Colors.primary + '12',
    },
    progressChipDone: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    progressChipIndex: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray500,
    },
    progressChipIndexActive: {
        color: Colors.primary,
    },
    progressChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    progressChipTextActive: {
        color: Colors.primary,
    },
    progressChipTextDone: {
        color: Colors.white,
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
        ...Shadows.sm,
    },
    inputContainerFocusedWarm: {
        borderColor: Colors.accentDark,
        backgroundColor: Colors.accent + '12',
    },
    inputContainerFocusedCool: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '0A',
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
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    otpInput: {
        width: 50,
        height: 58,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        textAlign: 'center',
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    otpInputFilled: {
        borderColor: Colors.accentDark,
        backgroundColor: Colors.accent + '16',
    },
    phoneSummaryCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '22',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.xs,
        ...Shadows.sm,
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
        ...Shadows.sm,
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
        ...Shadows.lg,
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
        ...Shadows.sm,
    },
    googleButtonText: {
        color: Colors.primary,
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

