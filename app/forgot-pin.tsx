import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import {
    useRequestOtpMutation,
    useResetPinMutation,
    useVerifyOtpMutation,
} from '@/store/api/authApi';
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

type Step = 'phone' | 'otp' | 'newPin';

const isPinValid = (value: string) => /^\d{4}$/.test(value);
const isOtpValid = (value: string) => /^\d{6}$/.test(value);

const readParam = (value?: string | string[]) => {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
};

export default function ForgotPinScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ phone?: string | string[] }>();
    const { showAlert, alertNode } = useStyledAlert();

    const [requestOtp, { isLoading: isRequestingOtp }] = useRequestOtpMutation();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
    const [resetPin, { isLoading: isResettingPin }] = useResetPinMutation();

    const [step, setStep] = React.useState<Step>('phone');
    const [phone, setPhone] = React.useState(readParam(params.phone).trim());
    const [otp, setOtp] = React.useState('');
    const [newPin, setNewPin] = React.useState('');
    const [confirmPin, setConfirmPin] = React.useState('');
    const [showPin, setShowPin] = React.useState(false);
    const [showConfirmPin, setShowConfirmPin] = React.useState(false);

    const busy = isRequestingOtp || isVerifyingOtp || isResettingPin;

    const submitPhone = async () => {
        if (!phone.trim()) {
            showAlert('Erreur', 'Veuillez saisir votre numero de telephone.', undefined, 'error');
            return;
        }

        let normalizedPhone: string;
        try {
            normalizedPhone = normalizePhoneNumberForApi(phone);
        } catch (error: any) {
            showAlert('Erreur', error?.message || 'Numero de telephone invalide.', undefined, 'error');
            return;
        }

        try {
            const response = await requestOtp({ phone: normalizedPhone }).unwrap();
            const resolvedPhone = response?.phone?.trim() || normalizedPhone;
            setPhone(resolvedPhone);
            setStep('otp');
            showAlert(
                'Code envoye',
                'Un code OTP vient d etre envoye. Entrez-le pour continuer.',
                undefined,
                'success',
            );
        } catch (error: any) {
            showAlert(
                'Erreur',
                error?.data?.message || 'Impossible d envoyer le code OTP. Veuillez reessayer.',
                undefined,
                'error',
            );
        }
    };

    const submitOtp = async () => {
        const normalizedOtp = otp.trim();
        if (!isOtpValid(normalizedOtp)) {
            showAlert('Erreur', 'Le code OTP doit contenir exactement 6 chiffres.', undefined, 'error');
            return;
        }

        let normalizedPhone: string;
        try {
            normalizedPhone = normalizePhoneNumberForApi(phone);
        } catch (error: any) {
            showAlert('Erreur', error?.message || 'Numero de telephone invalide.', undefined, 'error');
            return;
        }

        try {
            await verifyOtp({ phone: normalizedPhone, otp: normalizedOtp }).unwrap();
            setPhone(normalizedPhone);
            setStep('newPin');
        } catch (error: any) {
            showAlert('Erreur', error?.data?.message || 'Code OTP invalide.', undefined, 'error');
        }
    };

    const submitNewPin = async () => {
        if (!isPinValid(newPin) || !isPinValid(confirmPin)) {
            showAlert('Erreur', 'Le nouveau code PIN doit contenir exactement 4 chiffres.', undefined, 'error');
            return;
        }
        if (newPin !== confirmPin) {
            showAlert('Erreur', 'La confirmation ne correspond pas au nouveau PIN.', undefined, 'error');
            return;
        }

        let normalizedPhone: string;
        try {
            normalizedPhone = normalizePhoneNumberForApi(phone);
        } catch (error: any) {
            showAlert('Erreur', error?.message || 'Numero de telephone invalide.', undefined, 'error');
            return;
        }

        try {
            const response = await resetPin({
                phone: normalizedPhone,
                newPin: newPin.trim(),
            }).unwrap();

            showAlert(
                'Succes',
                response?.message || 'Nouveau code PIN enregistre.',
                [
                    {
                        text: 'Se connecter',
                        onPress: () =>
                            router.replace({
                                pathname: '/modal',
                                params: {
                                    mode: 'login',
                                    phone: normalizedPhone,
                                },
                            }),
                    },
                ],
                'success',
            );
        } catch (error: any) {
            showAlert(
                'Erreur',
                error?.data?.message || 'Impossible de reinitialiser le PIN. Veuillez reessayer.',
                undefined,
                'error',
            );
        }
    };

    const goBack = () => {
        if (step === 'newPin') {
            setStep('otp');
            return;
        }
        if (step === 'otp') {
            setStep('phone');
            return;
        }
        router.back();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PIN oublie</Text>
                <View style={styles.backButton} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <LinearGradient colors={Gradients.cool} style={styles.heroCard}>
                        <Text style={styles.heroTitle}>Recuperation securisee</Text>
                        <Text style={styles.heroText}>
                            Verifiez d abord votre numero avec OTP, puis choisissez un nouveau PIN.
                        </Text>
                    </LinearGradient>

                    <StepIndicator step={step} />

                    <View style={styles.card}>
                        {step === 'phone' && (
                            <>
                                <Text style={styles.label}>Numero de telephone</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="call-outline" size={18} color={Colors.gray500} />
                                    <TextInput
                                        style={styles.input}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        placeholder="Ex: 0812345678"
                                        placeholderTextColor={Colors.gray400}
                                    />
                                </View>
                            </>
                        )}

                        {step === 'otp' && (
                            <>
                                <Text style={styles.label}>Code OTP</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="shield-checkmark-outline" size={18} color={Colors.gray500} />
                                    <TextInput
                                        style={styles.input}
                                        value={otp}
                                        onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        placeholder="Code recu par SMS (6 chiffres)"
                                        placeholderTextColor={Colors.gray400}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.inlineAction}
                                    onPress={submitPhone}
                                    disabled={isRequestingOtp}
                                >
                                    <Text style={styles.inlineActionText}>
                                        {isRequestingOtp ? 'Renvoi en cours...' : 'Renvoyer un code OTP'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 'newPin' && (
                            <>
                                <PinField
                                    label="Nouveau PIN"
                                    value={newPin}
                                    onChangeText={setNewPin}
                                    visible={showPin}
                                    toggleVisible={() => setShowPin((prev) => !prev)}
                                />
                                <PinField
                                    label="Confirmer le nouveau PIN"
                                    value={confirmPin}
                                    onChangeText={setConfirmPin}
                                    visible={showConfirmPin}
                                    toggleVisible={() => setShowConfirmPin((prev) => !prev)}
                                />
                            </>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, busy && styles.submitButtonDisabled]}
                        onPress={() => {
                            if (step === 'phone') {
                                void submitPhone();
                                return;
                            }
                            if (step === 'otp') {
                                void submitOtp();
                                return;
                            }
                            void submitNewPin();
                        }}
                        disabled={busy}
                    >
                        <LinearGradient colors={Gradients.accent} style={styles.submitGradient}>
                            <Text style={styles.submitText}>
                                {step === 'phone'
                                    ? 'Envoyer OTP'
                                    : step === 'otp'
                                        ? 'Verifier OTP'
                                        : isResettingPin
                                            ? 'Validation en cours...'
                                            : 'Valider le nouveau PIN'}
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

function StepIndicator({ step }: { step: Step }) {
    const steps: Step[] = ['phone', 'otp', 'newPin'];
    const labels: Record<Step, string> = {
        phone: 'Telephone',
        otp: 'OTP',
        newPin: 'Nouveau PIN',
    };

    const currentIndex = steps.indexOf(step);

    return (
        <View style={styles.stepsRow}>
            {steps.map((item, index) => {
                const active = index <= currentIndex;
                return (
                    <View key={item} style={[styles.stepChip, active && styles.stepChipActive]}>
                        <Text style={[styles.stepText, active && styles.stepTextActive]}>{labels[item]}</Text>
                    </View>
                );
            })}
        </View>
    );
}

type PinFieldProps = {
    label: string;
    value: string;
    visible: boolean;
    onChangeText: (value: string) => void;
    toggleVisible: () => void;
};

function PinField({ label, value, visible, onChangeText, toggleVisible }: PinFieldProps) {
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.gray500} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry={!visible}
                    placeholder="4 chiffres"
                    placeholderTextColor={Colors.gray400}
                />
                <TouchableOpacity onPress={toggleVisible} style={styles.eyeButton}>
                    <Ionicons
                        name={visible ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={Colors.gray500}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
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
    stepsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    stepChip: {
        flex: 1,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        backgroundColor: Colors.white,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    stepChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '12',
    },
    stepText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    stepTextActive: {
        color: Colors.primary,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    fieldWrap: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        height: 50,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.medium,
    },
    eyeButton: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
    },
    inlineAction: {
        alignSelf: 'flex-end',
        paddingVertical: Spacing.xs,
    },
    inlineActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    submitButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitGradient: {
        height: 54,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    submitText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
});
