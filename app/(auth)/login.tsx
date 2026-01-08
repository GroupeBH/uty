/**
 * Écran de connexion
 */

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();
    const { login, isLoggingIn } = useAuth();

    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

    const validate = () => {
        const newErrors: { phone?: string; password?: string } = {};

        if (!phone.trim()) {
            newErrors.phone = 'Le numéro de téléphone est requis';
        } else if (phone.length < 10) {
            newErrors.phone = 'Numéro de téléphone invalide';
        }

        if (!password.trim()) {
            newErrors.password = 'Le mot de passe est requis';
        } else if (password.length < 6) {
            newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        try {
            const result = await login({ phone, password });

            // Redirection selon le rôle
            if (result.user.role === 'client') {
                router.replace('/(client)');
            } else if (result.user.role === 'seller') {
                router.replace('/(seller)');
            } else if (result.user.role === 'driver') {
                router.replace('/(driver)');
            }
        } catch (error: any) {
            Alert.alert(
                'Erreur de connexion',
                error?.data?.message || 'Une erreur est survenue lors de la connexion'
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Bienvenue</Text>
                        <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>
                    </View>

                    {/* Logo ou illustration */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>UTY</Text>
                        </View>
                    </View>

                    {/* Formulaire */}
                    <View style={styles.form}>
                        <Input
                            label="Numéro de téléphone"
                            type="phone"
                            icon="call"
                            placeholder="Ex: 0612345678"
                            value={phone}
                            onChangeText={(text) => {
                                setPhone(text);
                                setErrors({ ...errors, phone: undefined });
                            }}
                            error={errors.phone}
                            required
                        />

                        <Input
                            label="Mot de passe"
                            type="password"
                            icon="lock-closed"
                            placeholder="Votre mot de passe"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setErrors({ ...errors, password: undefined });
                            }}
                            error={errors.password}
                            required
                        />

                        <Button
                            title="Se connecter"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={isLoggingIn}
                            onPress={handleLogin}
                        />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Pas encore de compte ?</Text>
                        <Button
                            title="S'inscrire"
                            variant="outline"
                            size="md"
                            onPress={() => router.push('/(auth)/register')}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.xxl,
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: Typography.fontSize.huge,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xxxl,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: Typography.fontSize.xxxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
    },
    form: {
        marginBottom: Spacing.xxxl,
    },
    footer: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    footerText: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
    },
});
