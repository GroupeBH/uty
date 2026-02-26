/**
 * Modal d'authentification - Register & Login
 * Affiche l'enregistrement par dÃ©faut
 */

import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { tokenService } from '@/services/tokenService';
import { useLoginMutation, useRequestOtpMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

export default function AuthModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        mode?: string;
        title?: string;
        reason?: string;
        source?: string;
    }>();
    const dispatch = useAppDispatch();
    
    const initialMode: AuthMode = params.mode === 'login' ? 'login' : 'register';
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [loginStep, setLoginStep] = useState<LoginStep>('phone');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [isPinFocused, setIsPinFocused] = useState(false);

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

    const [requestOtp, { isLoading: isRequestingOtp }] = useRequestOtpMutation();
    const [login, { isLoading: isLoggingIn }] = useLoginMutation();
    const isLoginMode = mode === 'login';
    const isLoginPhoneStep = isLoginMode && loginStep === 'phone';
    const isLoginPinStep = isLoginMode && loginStep === 'pin';

    const authRequiredTitle = (params.title || '').toString().trim();
    const authRequiredMessage = (params.reason || '').toString().trim();
    const showAuthRequiredNotice = authRequiredTitle.length > 0 || authRequiredMessage.length > 0;

    useEffect(() => {
        if (params.mode === 'login') {
            setMode('login');
            setLoginStep('phone');
        } else if (params.mode === 'register') {
            setMode('register');
            setLoginStep('phone');
            setPin('');
            setShowPin(false);
            setIsPinFocused(false);
        }
    }, [params.mode]);

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

    const handleRegister = async () => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) {
            showAlert('Erreur', 'Veuillez entrer votre numÃ©ro de tÃ©lÃ©phone', 'error');
            return;
        }

        try {
            const response = await requestOtp({ phone: trimmedPhone }).unwrap();
            showAlert(
                'SuccÃ¨s',
                response.message || 'Code OTP envoyÃ© Ã  votre numÃ©ro !',
                'success',
                () => {
                    hideAlert();
                    router.push({
                        pathname: '/(auth)/otp',
                        params: { phone: trimmedPhone, mode: 'register' },
                    });
                }
            );
        } catch (error: any) {
            console.error('OTP request error:', error);
            showAlert(
                'Erreur',
                error?.data?.message || 'Erreur lors de l\'envoi du code OTP',
                'error'
            );
        }
    };

    const handleContinueToPin = () => {
        if (!phone.trim()) {
            showAlert('Erreur', 'Veuillez entrer votre numero de telephone', 'error');
            return;
        }
        setLoginStep('pin');
    };

    const handleLogin = async () => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) {
            showAlert('Erreur', 'Veuillez entrer votre numÃ©ro de tÃ©lÃ©phone', 'error');
            return;
        }
        if (!pin.trim() || pin.length !== 4) {
            showAlert('Erreur', 'Le code PIN doit contenir 4 chiffres', 'error');
            return;
        }

        try {
            const response = await login({ phone: trimmedPhone, pin }).unwrap();

            await tokenService.saveTokens(response.access_token, response.refresh_token);

            const profileResponse = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200'}/users/profile`,
                {
                    headers: {
                        Authorization: `Bearer ${response.access_token}`,
                    },
                }
            );
            const user = await profileResponse.json();

            await storage.setUser(user);
            dispatch(
                setCredentials({
                    user,
                    accessToken: response.access_token,
                    refreshToken: response.refresh_token,
                })
            );

            showAlert('Bienvenue !', `Content de vous revoir ${user.firstName} !`, 'success', () => {
                hideAlert();
                router.back();
            });
        } catch (error: any) {
            console.error('Login error:', error);
            showAlert(
                'Erreur',
                error?.data?.message || 'NumÃ©ro de tÃ©lÃ©phone ou code PIN incorrect',
                'error'
            );
        }
    };

    const handleModeChange = (nextMode: AuthMode) => {
        setMode(nextMode);
        setLoginStep('phone');
        setIsPhoneFocused(false);
        setPin('');
        setShowPin(false);
        setIsPinFocused(false);
    };

    const handlePrimaryAction = () => {
        if (mode === 'register') {
            void handleRegister();
            return;
        }

        if (isLoginPhoneStep) {
            handleContinueToPin();
            return;
        }

        void handleLogin();
    };

    const isSubmitting = mode === 'register' ? isRequestingOtp : isLoggingIn;

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
                                    onPress={() => router.back()}
                                >
                                    <Ionicons name="close" size={22} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <LinearGradient
                                colors={mode === 'register' ? Gradients.cool : Gradients.primary}
                                style={styles.heroCard}
                            >
                                <View style={styles.heroIconCircle}>
                                    <Ionicons
                                        name={
                                            mode === 'register'
                                                ? 'person-add-outline'
                                                : isLoginPhoneStep
                                                    ? 'call-outline'
                                                    : 'lock-closed-outline'
                                        }
                                        size={36}
                                        color={Colors.white}
                                    />
                                </View>
                                <View style={styles.heroTextWrap}>
                                    <Text style={styles.heroTitle}>
                                        {mode === 'register'
                                            ? 'Creer un compte'
                                            : isLoginPhoneStep
                                                ? 'Connexion en 2 etapes'
                                                : 'Validation du PIN'}
                                    </Text>
                                    <Text style={styles.heroSubtitle}>
                                        {mode === 'register'
                                            ? 'Inscrivez-vous en 1 minute via OTP'
                                            : isLoginPhoneStep
                                                ? 'Etape 1/2 : entrez votre numero'
                                                : 'Etape 2/2 : confirmez avec votre PIN'}
                                    </Text>
                                </View>
                            </LinearGradient>

                            {showAuthRequiredNotice ? (
                                <View style={styles.authRequiredCard}>
                                    <LinearGradient
                                        colors={['#FFF4E6', '#FFE9CC']}
                                        style={styles.authRequiredTop}
                                    >
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
                                    </LinearGradient>
                                    <View style={styles.authRequiredFooter}>
                                        <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
                                        <Text style={styles.authRequiredFooterText}>
                                            Connexion rapide et securisee en quelques secondes.
                                        </Text>
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

                            {isLoginMode ? (
                                <View style={styles.stepperRow}>
                                    <View style={[styles.stepChip, styles.stepChipActive]}>
                                        <Text style={[styles.stepChipText, styles.stepChipTextActive]}>1 Numero</Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={isLoginPinStep ? Colors.primary : Colors.gray400}
                                    />
                                    <View style={[styles.stepChip, isLoginPinStep && styles.stepChipActive]}>
                                        <Text style={[styles.stepChipText, isLoginPinStep && styles.stepChipTextActive]}>
                                            2 PIN
                                        </Text>
                                    </View>
                                </View>
                            ) : null}

                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>
                                    {mode === 'register'
                                        ? 'Bienvenue'
                                        : isLoginPhoneStep
                                            ? 'Commencer la connexion'
                                            : 'Bon retour'}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {mode === 'register'
                                        ? 'Entrez votre numero pour recevoir un code de verification.'
                                        : isLoginPhoneStep
                                            ? 'Etape 1 sur 2 : saisissez votre numero de telephone.'
                                            : `Etape 2 sur 2 : saisissez votre PIN pour ${phone.trim() || 'continuer'}.`}
                                </Text>
                            </View>

                            <View style={styles.form}>
                                {(mode === 'register' || isLoginPhoneStep) ? (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Numero de telephone</Text>
                                        <View
                                            style={[
                                                styles.inputContainer,
                                                isPhoneFocused &&
                                                    (mode === 'register'
                                                        ? styles.inputContainerFocusedWarm
                                                        : styles.inputContainerFocusedCool),
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.inputPrefixBadge,
                                                    mode === 'register'
                                                        ? styles.inputPrefixBadgeWarm
                                                        : styles.inputPrefixBadgeCool,
                                                ]}
                                            >
                                                <Text style={styles.inputPrefixText}>TEL</Text>
                                            </View>
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
                                                returnKeyType={mode === 'register' ? 'send' : 'next'}
                                                onSubmitEditing={() => {
                                                    if (mode === 'register') {
                                                        void handleRegister();
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
                                            <View
                                                style={[
                                                    styles.inputPrefixBadge,
                                                    styles.inputPrefixBadgeCool,
                                                ]}
                                            >
                                                <Text style={styles.inputPrefixText}>PIN</Text>
                                            </View>
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

                                <TouchableOpacity
                                    style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                                    onPress={handlePrimaryAction}
                                    disabled={isSubmitting}
                                >
                                    <LinearGradient
                                        colors={mode === 'register' ? Gradients.cool : Gradients.primary}
                                        style={styles.submitGradient}
                                    >
                                        {isSubmitting ? (
                                            <Text style={styles.submitButtonText}>
                                                {mode === 'register' ? 'Envoi...' : 'Connexion...'}
                                            </Text>
                                        ) : (
                                            <>
                                                <Text style={styles.submitButtonText}>
                                                    {mode === 'register'
                                                        ? 'Recevoir le code'
                                                        : isLoginPhoneStep
                                                            ? 'Continuer'
                                                            : 'Se connecter'}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.submitIconWrap,
                                                        mode === 'register'
                                                            ? styles.submitIconWrapWarm
                                                            : styles.submitIconWrapCool,
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={isLoginPhoneStep ? 'arrow-forward' : 'log-in-outline'}
                                                        size={18}
                                                        color={Colors.primary}
                                                    />
                                                </View>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                {isLoginPinStep ? (
                                    <TouchableOpacity
                                        style={styles.secondaryActionButton}
                                        onPress={() => {
                                            setLoginStep('phone');
                                            setShowPin(false);
                                            setIsPinFocused(false);
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                                        <Text style={styles.secondaryActionText}>Modifier le numero</Text>
                                    </TouchableOpacity>
                                ) : null}

                                {mode === 'register' ? (
                                    <View style={styles.infoBox}>
                                        <Ionicons
                                            name="information-circle-outline"
                                            size={18}
                                            color={Colors.accentDark}
                                        />
                                        <Text style={styles.infoText}>
                                            Un code OTP vous sera envoye sur ce numero.
                                        </Text>
                                    </View>
                                ) : isLoginPinStep ? (
                                    <View style={[styles.infoBox, styles.infoBoxLogin]}>
                                        <Ionicons name="key-outline" size={18} color={Colors.primary} />
                                        <Text style={styles.infoText}>
                                            Utilisez votre PIN a 4 chiffres pour finaliser la connexion.
                                        </Text>
                                    </View>
                                ) : null}

                                <View style={styles.trustRow}>
                                    <View style={[styles.trustChip, styles.trustChipPrimary]}>
                                        <Ionicons name="shield-outline" size={13} color={Colors.primaryDark} />
                                        <Text style={[styles.trustChipText, styles.trustChipTextPrimary]}>Securise</Text>
                                    </View>
                                    <View style={[styles.trustChip, styles.trustChipWarning]}>
                                        <Ionicons name="flash-outline" size={13} color={Colors.accentDark} />
                                        <Text style={[styles.trustChipText, styles.trustChipTextWarning]}>Rapide</Text>
                                    </View>
                                    <View style={[styles.trustChip, styles.trustChipInfo]}>
                                        <Ionicons name="lock-closed-outline" size={13} color={Colors.info} />
                                        <Text style={[styles.trustChipText, styles.trustChipTextInfo]}>Prive</Text>
                                    </View>
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
    heroCard: {
        borderRadius: BorderRadius.xxl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
        ...Shadows.lg,
    },
    heroIconCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#FFFFFF2D',
        borderWidth: 1,
        borderColor: '#FFFFFF4D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTextWrap: {
        flex: 1,
        gap: 2,
    },
    heroTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroSubtitle: {
        color: Colors.white + 'E8',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    authRequiredCard: {
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.accent + '55',
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    authRequiredTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.accent + '50',
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
    authRequiredFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        backgroundColor: Colors.primary + '08',
    },
    authRequiredFooterText: {
        flex: 1,
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.primary + '0A',
        borderRadius: BorderRadius.xxl,
        padding: 5,
        marginBottom: Spacing.xl,
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
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: -Spacing.xs,
        marginBottom: Spacing.lg,
    },
    stepChip: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
    },
    stepChipActive: {
        borderColor: Colors.primary + '45',
        backgroundColor: Colors.primary + '16',
    },
    stepChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray500,
    },
    stepChipTextActive: {
        color: Colors.primary,
    },
    titleContainer: {
        marginBottom: Spacing.xl,
        gap: Spacing.xs,
    },
    title: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
        textAlign: 'center',
    },
    form: {
        gap: Spacing.lg,
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
        borderWidth: 1.5,
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
    inputPrefixBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    inputPrefixBadgeWarm: {
        backgroundColor: Colors.accentDark,
    },
    inputPrefixBadgeCool: {
        backgroundColor: Colors.primary,
    },
    inputPrefixText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    input: {
        flex: 1,
        height: 54,
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
    submitButton: {
        marginTop: Spacing.sm,
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.accent + '1F',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.accent + '52',
    },
    infoBoxLogin: {
        backgroundColor: Colors.primary + '12',
        borderColor: Colors.primary + '32',
    },
    infoText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray700,
        lineHeight: 20,
        fontWeight: Typography.fontWeight.medium,
    },
    trustRow: {
        marginTop: Spacing.xs,
        flexDirection: 'row',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    trustChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    trustChipPrimary: {
        borderColor: Colors.primary + '24',
        backgroundColor: Colors.primary + '10',
    },
    trustChipWarning: {
        borderColor: Colors.accentDark + '3D',
        backgroundColor: Colors.accent + '1F',
    },
    trustChipInfo: {
        borderColor: Colors.info + '35',
        backgroundColor: Colors.info + '16',
    },
    trustChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    trustChipTextPrimary: {
        color: Colors.primaryDark,
    },
    trustChipTextWarning: {
        color: Colors.accentDark,
    },
    trustChipTextInfo: {
        color: Colors.info,
    },
});

