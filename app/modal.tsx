/**
 * Modal d'authentification - Register & Login
 * Affiche l'enregistrement par défaut
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
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthMode = 'register' | 'login';

export default function AuthModal() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    
    const [mode, setMode] = useState<AuthMode>('register');
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);

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

    const [requestOtp, { isLoading: isRequestingOtp }] = useRequestOtpMutation();
    const [login, { isLoading: isLoggingIn }] = useLoginMutation();

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
    }, []);

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
        if (!phone.trim()) {
            showAlert('Erreur', 'Veuillez entrer votre numéro de téléphone', 'error');
            return;
        }

        try {
            const response = await requestOtp({ phone }).unwrap();
            showAlert(
                'Succès',
                response.message || 'Code OTP envoyé à votre numéro !',
                'success',
                () => {
                    hideAlert();
                    router.push({
                        pathname: '/(auth)/otp',
                        params: { phone, mode: 'register' },
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

    const handleLogin = async () => {
        if (!phone.trim()) {
            showAlert('Erreur', 'Veuillez entrer votre numéro de téléphone', 'error');
            return;
        }
        if (!pin.trim() || pin.length !== 4) {
            showAlert('Erreur', 'Le code PIN doit contenir 4 chiffres', 'error');
            return;
        }

        try {
            const response = await login({ phone, pin }).unwrap();

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
                error?.data?.message || 'Numéro de téléphone ou code PIN incorrect',
                'error'
            );
        }
    };

    const isLoading = isRequestingOtp || isLoggingIn;

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
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="close" size={28} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Illustration */}
                    <View style={styles.illustrationContainer}>
                        <LinearGradient
                            colors={mode === 'register' ? Gradients.cool : Gradients.primary}
                            style={styles.iconCircle}
                        >
                            <Ionicons
                                name={mode === 'register' ? 'person-add-outline' : 'log-in-outline'}
                                size={64}
                                color={Colors.white}
                            />
                        </LinearGradient>
                    </View>

                    {/* Toggle Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'register' && styles.tabActive]}
                            onPress={() => setMode('register')}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    mode === 'register' && styles.tabTextActive,
                                ]}
                            >
                                S'inscrire
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'login' && styles.tabActive]}
                            onPress={() => setMode('login')}
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

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>
                            {mode === 'register' ? 'Créer un compte' : 'Bon retour !'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {mode === 'register'
                                ? 'Entrez votre numéro pour commencer'
                                : 'Connectez-vous pour continuer'}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Numéro de téléphone</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color={Colors.gray400} />
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Ex: 0812345678"
                                    placeholderTextColor={Colors.gray400}
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* PIN (only for login) */}
                        {mode === 'login' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Code PIN</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={Colors.gray400}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        value={pin}
                                        onChangeText={setPin}
                                        placeholder="4 chiffres"
                                        placeholderTextColor={Colors.gray400}
                                        secureTextEntry={!showPin}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                    />
                                    <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                                        <Ionicons
                                            name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={Colors.gray400}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.disabledButton]}
                            onPress={mode === 'register' ? handleRegister : handleLogin}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={mode === 'register' ? Gradients.cool : Gradients.primary}
                                style={styles.submitGradient}
                            >
                                {isLoading ? (
                                    <Text style={styles.submitButtonText}>
                                        {mode === 'register' ? 'Envoi...' : 'Connexion...'}
                                    </Text>
                                ) : (
                                    <>
                                        <Text style={styles.submitButtonText}>
                                            {mode === 'register'
                                                ? 'Recevoir le code'
                                                : 'Se connecter'}
                                        </Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={20}
                                            color={Colors.white}
                                        />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Info Box (only for register) */}
                        {mode === 'register' && (
                            <View style={styles.infoBox}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={20}
                                    color={Colors.accent}
                                />
                                <Text style={styles.infoText}>
                                    Un code de vérification sera envoyé à ce numéro
                                </Text>
                            </View>
                        )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    container: {
        flex: 1,
    },
    animatedContainer: {
        flex: 1,
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        marginTop: Spacing.xxxl,
        ...Shadows.xl,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xxl,
        paddingBottom: Spacing.xxxl,
    },
    header: {
        paddingVertical: Spacing.lg,
        alignItems: 'flex-end',
    },
    closeButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        ...Shadows.sm,
    },
    illustrationContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xxl,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.xl,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xs,
        marginBottom: Spacing.xxl,
        ...Shadows.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        borderRadius: BorderRadius.xl,
    },
    tabActive: {
        backgroundColor: Colors.white,
        ...Shadows.md,
    },
    tabText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    titleContainer: {
        marginBottom: Spacing.xxl,
    },
    title: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
    },
    form: {
        gap: Spacing.xl,
    },
    inputGroup: {
        gap: Spacing.md,
    },
    label: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginLeft: Spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.gray100,
        ...Shadows.md,
    },
    input: {
        flex: 1,
        height: 56,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    submitButton: {
        marginTop: Spacing.xxl,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
    },
    submitButtonText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    disabledButton: {
        opacity: 0.6,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: Colors.accent + '15',
        borderRadius: BorderRadius.xl,
        borderLeftWidth: 4,
        borderLeftColor: Colors.accent,
        ...Shadows.sm,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
});
