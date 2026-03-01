import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { tokenService } from '@/services/tokenService';
import { useLoginMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ returnUrl?: string; message?: string }>();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();

    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [isPinFocused, setIsPinFocused] = useState(false);
    const scrollRef = React.useRef<ScrollView | null>(null);

    const [login, { isLoading }] = useLoginMutation();
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

    const handleLogin = async () => {
        const trimmedPhone = phone.trim();

        if (!trimmedPhone) {
            showStyledAlert('Erreur', 'Veuillez entrer votre numero de telephone');
            return;
        }
        if (!pin.trim() || pin.length !== 4) {
            showStyledAlert('Erreur', 'Le code PIN doit contenir 4 chiffres');
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

            showStyledAlert('Succes', 'Connexion reussie !', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (params.returnUrl) {
                            router.replace(params.returnUrl as any);
                        } else {
                            router.replace('/(tabs)');
                        }
                    },
                },
            ]);
        } catch (error: any) {
            console.error('Login error:', error);
            showStyledAlert(
                'Erreur',
                error?.data?.message || 'Numero de telephone ou code PIN incorrect'
            );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                    <View pointerEvents="none" style={styles.colorOrbPrimary} />
                    <View pointerEvents="none" style={styles.colorOrbWarm} />

                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <LinearGradient colors={Gradients.primary} style={styles.brandBadge}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.white} />
                            <Text style={styles.brandBadgeText}>UTY Secure</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.modeCard}>
                        <LinearGradient colors={Gradients.primary} style={styles.modeCardGradient}>
                            <View style={styles.modeIconCircle}>
                                <Ionicons name="log-in-outline" size={22} color={Colors.white} />
                            </View>
                            <View style={styles.modeTextWrap}>
                                <Text style={styles.modeStep}>Connexion</Text>
                                <Text style={styles.modeTitle}>Bon retour</Text>
                                <Text style={styles.modeSubtitle}>Accedez a votre compte en quelques secondes.</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {params.message ? (
                        <View style={styles.noticeCard}>
                            <Ionicons name="information-circle-outline" size={18} color={Colors.accentDark} />
                            <Text style={styles.noticeText}>{params.message}</Text>
                        </View>
                    ) : null}

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Numero de telephone</Text>
                            <View style={[styles.inputContainer, isPhoneFocused && styles.inputContainerFocused]}>
                                <Ionicons name="call-outline" size={20} color={Colors.gray400} />
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
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Code PIN</Text>
                            <View style={[styles.inputContainer, isPinFocused && styles.inputContainerFocused]}>
                                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
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
                                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPin(!showPin)}>
                                    <Ionicons
                                        name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                        size={18}
                                        color={Colors.gray400}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.disabledButton]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            <LinearGradient colors={Gradients.primary} style={styles.loginGradient}>
                                {isLoading ? (
                                    <Text style={styles.loginButtonText}>Connexion...</Text>
                                ) : (
                                    <>
                                        <Text style={styles.loginButtonText}>Se connecter</Text>
                                        <View style={styles.loginIconWrap}>
                                            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                                        </View>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.helperRow}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                            <Text style={styles.helperText}>Connexion securisee avec votre PIN a 4 chiffres.</Text>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Vous n&apos;avez pas de compte ?</Text>
                            <Link href="/(auth)/register" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.footerLink}>Creer un compte</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {alertNode}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        position: 'relative',
    },
    colorOrbPrimary: {
        position: 'absolute',
        top: 84,
        right: -22,
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: Colors.primary + '26',
    },
    colorOrbWarm: {
        position: 'absolute',
        top: 168,
        left: -36,
        width: 126,
        height: 126,
        borderRadius: 63,
        backgroundColor: Colors.accent + '26',
    },
    header: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
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
    modeTextWrap: {
        flex: 1,
    },
    modeStep: {
        color: Colors.white + 'D9',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    modeTitle: {
        color: Colors.white,
        marginTop: 2,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    modeSubtitle: {
        color: Colors.white + 'E0',
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        backgroundColor: Colors.accent + '14',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.accent + '44',
        ...Shadows.sm,
    },
    noticeText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray700,
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
    inputContainerFocused: {
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
    loginButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    loginGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    loginButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    loginIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '66',
        backgroundColor: Colors.white,
    },
    disabledButton: {
        opacity: 0.6,
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
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    footerText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    footerLink: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
});
