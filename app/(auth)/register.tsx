import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useRequestOtpMutation } from '@/store/api/authApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
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

export default function RegisterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [phone, setPhone] = useState('');
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [requestOtp, { isLoading }] = useRequestOtpMutation();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();
    const scrollRef = React.useRef<ScrollView | null>(null);

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

    const handleContinue = async () => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) {
            showStyledAlert('Erreur', 'Veuillez entrer votre numero de telephone');
            return;
        }

        try {
            const response = await requestOtp({ phone: trimmedPhone }).unwrap();
            showStyledAlert('Succes', response.message || 'Code OTP envoye !', [
                {
                    text: 'OK',
                    onPress: () => {
                        router.push({
                            pathname: '/(auth)/otp',
                            params: { phone: trimmedPhone, mode: 'register' },
                        });
                    },
                },
            ]);
        } catch (error: any) {
            console.error('OTP request error:', error);
            showStyledAlert('Erreur', error?.data?.message || 'Erreur lors de l\'envoi du code OTP');
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
                    <View pointerEvents="none" style={styles.colorOrbCool} />
                    <View pointerEvents="none" style={styles.colorOrbWarm} />

                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <LinearGradient colors={Gradients.accent} style={styles.brandBadge}>
                            <Ionicons name="sparkles-outline" size={14} color={Colors.white} />
                            <Text style={styles.brandBadgeText}>UTY Start</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.modeCard}>
                        <LinearGradient colors={Gradients.cool} style={styles.modeCardGradient}>
                            <View style={styles.modeIconCircle}>
                                <Ionicons name="person-add-outline" size={22} color={Colors.white} />
                            </View>
                            <View style={styles.modeTextWrap}>
                                <Text style={styles.modeStep}>Inscription</Text>
                                <Text style={styles.modeTitle}>Creer un compte</Text>
                                <Text style={styles.modeSubtitle}>Demarrez rapidement avec verification OTP.</Text>
                            </View>
                        </LinearGradient>
                    </View>

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

                        <TouchableOpacity
                            style={[styles.continueButton, isLoading && styles.disabledButton]}
                            onPress={handleContinue}
                            disabled={isLoading}
                        >
                            <LinearGradient colors={Gradients.cool} style={styles.continueGradient}>
                                {isLoading ? (
                                    <Text style={styles.continueButtonText}>Envoi...</Text>
                                ) : (
                                    <>
                                        <Text style={styles.continueButtonText}>Recevoir le code</Text>
                                        <View style={styles.continueIconWrap}>
                                            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                                        </View>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.helperRow}>
                            <Ionicons name="flash-outline" size={16} color={Colors.accentDark} />
                            <Text style={styles.helperText}>Le code OTP est envoye en quelques secondes.</Text>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Deja un compte ?</Text>
                            <Link href="/(auth)/login" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.footerLink}>Se connecter</Text>
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
    colorOrbCool: {
        position: 'absolute',
        top: 84,
        right: -22,
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: Colors.info + '26',
    },
    colorOrbWarm: {
        position: 'absolute',
        top: 170,
        left: -34,
        width: 126,
        height: 126,
        borderRadius: 63,
        backgroundColor: Colors.accent + '22',
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
    continueButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    continueGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    continueButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    continueIconWrap: {
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
