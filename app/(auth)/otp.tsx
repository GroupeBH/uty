import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useRequestOtpMutation, useVerifyOtpMutation } from '@/store/api/authApi';
import { OTP_DISABLED } from '@/utils/featureFlags';
import { normalizePhoneNumberForApi } from '@/utils/phone';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const readParam = (value?: string | string[]) => {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
};

const isOtpValid = (value: string) => /^\d{6}$/.test(value);

export default function OtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ phone?: string | string[] }>();
    const { showAlert, alertNode } = useStyledAlert();

    const [requestOtp, { isLoading: isRequestingOtp }] = useRequestOtpMutation();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();

    const [phone, setPhone] = React.useState(readParam(params.phone).trim());
    const [otp, setOtp] = React.useState('');
    const [hasRequestedOnce, setHasRequestedOnce] = React.useState(false);

    const busy = isRequestingOtp || isVerifyingOtp;

    const goBackToRegisterPhone = React.useCallback(() => {
        router.replace({
            pathname: '/modal',
            params: {
                mode: 'register',
                registerStep: 'phone',
                ...(phone.trim() ? { phone: phone.trim() } : {}),
            },
        });
    }, [phone, router]);

    const resolveNormalizedPhone = React.useCallback(() => {
        if (!phone.trim()) {
            showAlert('Erreur', 'Veuillez saisir votre numero de telephone.', undefined, 'error');
            return null;
        }

        try {
            return normalizePhoneNumberForApi(phone);
        } catch (error: any) {
            showAlert('Erreur', error?.message || 'Numero de telephone invalide.', undefined, 'error');
            return null;
        }
    }, [phone, showAlert]);

    React.useEffect(() => {
        if (!OTP_DISABLED) {
            return;
        }

        const trimmedPhone = phone.trim();
        router.replace({
            pathname: '/modal',
            params: {
                mode: 'register',
                registerStep: trimmedPhone ? 'identity' : 'phone',
                ...(trimmedPhone ? { phone: trimmedPhone } : {}),
            },
        });
    }, [phone, router]);

    const submitRequestOtp = React.useCallback(
        async (showSuccessAlert = true) => {
            const normalizedPhone = resolveNormalizedPhone();
            if (!normalizedPhone) {
                return false;
            }

            try {
                const response = await requestOtp({ phone: normalizedPhone }).unwrap();
                const resolvedPhone = response?.phone?.trim() || normalizedPhone;
                setPhone(resolvedPhone);
                setHasRequestedOnce(true);

                if (showSuccessAlert) {
                    showAlert(
                        'Code envoye',
                        'Un code OTP a ete envoye. Entrez les 6 chiffres recus par SMS.',
                        undefined,
                        'success',
                    );
                }
                return true;
            } catch (error: any) {
                showAlert(
                    'Erreur',
                    error?.data?.message || 'Impossible d envoyer le code OTP. Veuillez reessayer.',
                    undefined,
                    'error',
                );
                return false;
            }
        },
        [requestOtp, resolveNormalizedPhone, showAlert],
    );

    const submitVerifyOtp = async () => {
        const normalizedOtp = otp.trim();
        if (!isOtpValid(normalizedOtp)) {
            showAlert('Erreur', 'Le code OTP doit contenir exactement 6 chiffres.', undefined, 'error');
            return;
        }

        const normalizedPhone = resolveNormalizedPhone();
        if (!normalizedPhone) {
            return;
        }

        try {
            await verifyOtp({ phone: normalizedPhone, otp: normalizedOtp }).unwrap();
            showAlert(
                'Verification reussie',
                'Numero verifie. Vous pouvez terminer votre inscription.',
                [
                    {
                        text: 'Continuer',
                        onPress: () =>
                            router.replace({
                                pathname: '/modal',
                                params: {
                                    mode: 'register',
                                    registerStep: 'identity',
                                    phone: normalizedPhone,
                                },
                            }),
                    },
                ],
                'success',
            );
        } catch (error: any) {
            showAlert('Erreur', error?.data?.message || 'Code OTP invalide.', undefined, 'error');
        }
    };

    React.useEffect(() => {
        if (hasRequestedOnce) {
            return;
        }

        if (!phone.trim()) {
            showAlert(
                'Numero requis',
                'Veuillez d abord saisir votre numero avant la verification OTP.',
                [
                    {
                        text: 'Retour',
                        onPress: goBackToRegisterPhone,
                    },
                ],
                'warning',
            );
            return;
        }

        void submitRequestOtp(false);
    }, [goBackToRegisterPhone, hasRequestedOnce, phone, showAlert, submitRequestOtp]);

    if (OTP_DISABLED) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.redirectContainer}>
                    <Text style={styles.redirectTitle}>Verification OTP desactivee</Text>
                    <Text style={styles.redirectText}>Redirection vers la suite de l inscription...</Text>
                </View>
                {alertNode}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBackToRegisterPhone}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verification OTP</Text>
                <View style={styles.backButton} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <LinearGradient colors={Gradients.cool} style={styles.heroCard}>
                        <Text style={styles.heroTitle}>Securisez votre inscription</Text>
                        <Text style={styles.heroText}>
                            Entrez le code OTP recu par SMS pour confirmer votre numero.
                        </Text>
                    </LinearGradient>

                    <View style={styles.card}>
                        <Text style={styles.label}>Numero de telephone</Text>
                        <View style={styles.readonlyPhoneRow}>
                            <Ionicons name="call-outline" size={18} color={Colors.gray500} />
                            <Text style={styles.readonlyPhoneText}>{phone.trim() || '-'}</Text>
                        </View>

                        <Text style={styles.label}>Code OTP (6 chiffres)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.gray500} />
                            <TextInput
                                style={styles.input}
                                value={otp}
                                onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                                keyboardType="number-pad"
                                maxLength={6}
                                placeholder="Ex: 123456"
                                placeholderTextColor={Colors.gray400}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.inlineAction}
                            onPress={() => {
                                void submitRequestOtp(true);
                            }}
                            disabled={isRequestingOtp}
                        >
                            <Text style={styles.inlineActionText}>
                                {isRequestingOtp ? 'Renvoi en cours...' : 'Renvoyer un code OTP'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, busy && styles.submitButtonDisabled]}
                        onPress={() => {
                            void submitVerifyOtp();
                        }}
                        disabled={busy}
                    >
                        <LinearGradient colors={Gradients.accent} style={styles.submitGradient}>
                            <Text style={styles.submitText}>
                                {isVerifyingOtp ? 'Verification en cours...' : 'Verifier OTP'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            {alertNode}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    redirectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    redirectTitle: {
        ...Typography.h3,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    redirectText: {
        ...Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.lg,
        paddingBottom: Spacing.massive,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.xs,
        ...Shadows.md,
    },
    heroTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    heroText: {
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.white,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray700,
    },
    readonlyPhoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    readonlyPhoneText: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
    },
    inlineAction: {
        alignSelf: 'flex-start',
        marginTop: Spacing.xs,
    },
    inlineActionText: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
        fontSize: Typography.fontSize.sm,
    },
    submitButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    submitButtonDisabled: {
        opacity: 0.65,
    },
    submitGradient: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    submitText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
});
