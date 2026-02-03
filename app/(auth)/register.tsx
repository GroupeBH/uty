import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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
import { useRequestOtpMutation } from '@/store/api/authApi';

export default function RegisterScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [requestOtp, { isLoading }] = useRequestOtpMutation();

    const handleContinue = async () => {
        if (!phone.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
            return;
        }

        try {
            const response = await requestOtp({ phone }).unwrap();
            Alert.alert('Succès', response.message || 'Code OTP envoyé !', [
                {
                    text: 'OK',
                    onPress: () => {
                        router.push({
                            pathname: '/(auth)/otp',
                            params: { phone, mode: 'register' },
                        });
                    },
                },
            ]);
        } catch (error: any) {
            console.error('OTP request error:', error);
            Alert.alert('Erreur', error?.data?.message || 'Erreur lors de l\'envoi du code OTP');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Illustration */}
                    <View style={styles.illustrationContainer}>
                        <LinearGradient colors={Gradients.cool} style={styles.iconCircle}>
                            <Ionicons name="person-add-outline" size={64} color={Colors.white} />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Créer un compte</Text>
                        <Text style={styles.subtitle}>
                            Entrez votre numéro de téléphone pour commencer
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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
                                        <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Info Box */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color={Colors.accent} />
                            <Text style={styles.infoText}>
                                Un code de vérification sera envoyé à ce numéro
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
    },
    header: {
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xxxl,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    titleContainer: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    form: {
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    continueButton: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
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
    disabledButton: {
        opacity: 0.5,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: Colors.accent + '10',
        borderRadius: BorderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
});
