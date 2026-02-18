import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { useLoginMutation } from '@/store/api/authApi';
import { setCredentials } from '@/store/slices/authSlice';
import { tokenService } from '@/services/tokenService';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function LoginScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const params = useLocalSearchParams<{ returnUrl?: string; message?: string }>();

    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);

    const [login, { isLoading }] = useLoginMutation();

    const handleLogin = async () => {
        if (!phone.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
            return;
        }
        if (!pin.trim() || pin.length !== 4) {
            Alert.alert('Erreur', 'Le code PIN doit contenir 4 chiffres');
            return;
        }

        try {
            const response = await login({ phone, pin }).unwrap();

            // Sauvegarder les tokens
            await tokenService.saveTokens(response.access_token, response.refresh_token);

            // Récupérer le profil utilisateur
            const profileResponse = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.188:5200'}/users/profile`,
                {
                    headers: {
                        Authorization: `Bearer ${response.access_token}`,
                    },
                }
            );
            const user = await profileResponse.json();

            // Sauvegarder dans storage et Redux
            await storage.setUser(user);
            dispatch(
                setCredentials({
                    user,
                    accessToken: response.access_token,
                    refreshToken: response.refresh_token,
                })
            );

            Alert.alert('Succès', 'Connexion réussie !', [
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
            Alert.alert(
                'Erreur',
                error?.data?.message || 'Numéro de téléphone ou code PIN incorrect'
            );
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
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Illustration */}
                    <View style={styles.illustrationContainer}>
                        <LinearGradient colors={Gradients.primary} style={styles.iconCircle}>
                            <Ionicons name="log-in-outline" size={64} color={Colors.white} />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Bon retour !</Text>
                        <Text style={styles.subtitle}>
                            Connectez-vous pour continuer
                        </Text>
                        {params.message && (
                            <View style={styles.messageContainer}>
                                <Ionicons name="information-circle" size={20} color={Colors.accent} />
                                <Text style={styles.messageText}>{params.message}</Text>
                            </View>
                        )}
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

                        {/* PIN */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Code PIN</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />
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

                        {/* Login Button */}
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
                                        <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Register Link */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Vous n'avez pas de compte ?</Text>
                            <Link href="/(auth)/register" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.footerLink}>Créer un compte</Text>
                                </TouchableOpacity>
                            </Link>
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
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.accent + '20',
        borderRadius: BorderRadius.md,
    },
    messageText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.accent,
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
    loginButton: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
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
    disabledButton: {
        opacity: 0.5,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.lg,
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
