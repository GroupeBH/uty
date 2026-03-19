import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useChangePinMutation } from '@/store/api/authApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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

const isPinValid = (value: string) => /^\d{4}$/.test(value);

export default function ChangePinScreen() {
    const router = useRouter();
    const { showAlert, alertNode } = useStyledAlert();
    const [changePin, { isLoading }] = useChangePinMutation();

    const [currentPin, setCurrentPin] = React.useState('');
    const [newPin, setNewPin] = React.useState('');
    const [confirmPin, setConfirmPin] = React.useState('');
    const [showCurrentPin, setShowCurrentPin] = React.useState(false);
    const [showNewPin, setShowNewPin] = React.useState(false);
    const [showConfirmPin, setShowConfirmPin] = React.useState(false);

    const validate = () => {
        if (!isPinValid(currentPin) || !isPinValid(newPin) || !isPinValid(confirmPin)) {
            showAlert('Erreur', 'Chaque code PIN doit contenir exactement 4 chiffres.', undefined, 'error');
            return false;
        }

        if (currentPin === newPin) {
            showAlert('Erreur', 'Le nouveau PIN doit etre different du PIN actuel.', undefined, 'error');
            return false;
        }

        if (newPin !== confirmPin) {
            showAlert('Erreur', 'La confirmation du nouveau PIN ne correspond pas.', undefined, 'error');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const response = await changePin({
                currentPin: currentPin.trim(),
                newPin: newPin.trim(),
            }).unwrap();

            showAlert(
                'Succes',
                response?.message || 'Votre code PIN a ete modifie avec succes.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ],
                'success',
            );
        } catch (error: any) {
            const message =
                error?.data?.message ||
                'Impossible de modifier le code PIN pour le moment. Veuillez reessayer.';
            showAlert('Erreur', message, undefined, 'error');
        }
    };

    const canSubmit =
        isPinValid(currentPin) &&
        isPinValid(newPin) &&
        isPinValid(confirmPin) &&
        newPin === confirmPin &&
        currentPin !== newPin &&
        !isLoading;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Changer le code PIN</Text>
                <View style={styles.backButton} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={Colors.white} />
                        <Text style={styles.heroTitle}>Votre securite avant tout</Text>
                        <Text style={styles.heroText}>
                            Entrez votre PIN actuel puis definissez un nouveau code a 4 chiffres.
                        </Text>
                    </LinearGradient>

                    <View style={styles.formCard}>
                        <PinField
                            label="PIN actuel"
                            value={currentPin}
                            onChangeText={setCurrentPin}
                            visible={showCurrentPin}
                            toggleVisible={() => setShowCurrentPin((prev) => !prev)}
                        />
                        <PinField
                            label="Nouveau PIN"
                            value={newPin}
                            onChangeText={setNewPin}
                            visible={showNewPin}
                            toggleVisible={() => setShowNewPin((prev) => !prev)}
                        />
                        <PinField
                            label="Confirmer le nouveau PIN"
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                            visible={showConfirmPin}
                            toggleVisible={() => setShowConfirmPin((prev) => !prev)}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={Gradients.accent} style={styles.submitGradient}>
                            <Text style={styles.submitText}>
                                {isLoading ? 'Mise a jour en cours...' : 'Mettre a jour le PIN'}
                            </Text>
                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            {alertNode}
        </SafeAreaView>
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
                    onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
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
        gap: Spacing.sm,
        ...Shadows.md,
    },
    heroTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        opacity: 0.95,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.md,
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
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.white,
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
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
});
