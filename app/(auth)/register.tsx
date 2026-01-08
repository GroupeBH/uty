/**
 * Écran d'inscription
 */

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isRegistering } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CLIENT);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'Le prénom est requis';
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Le nom est requis';
        }

        if (!phone.trim()) {
            newErrors.phone = 'Le numéro de téléphone est requis';
        } else if (phone.length < 10) {
            newErrors.phone = 'Numéro de téléphone invalide';
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Email invalide';
        }

        if (!password.trim()) {
            newErrors.password = 'Le mot de passe est requis';
        } else if (password.length < 6) {
            newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        try {
            const result = await register({
                firstName,
                lastName,
                phone,
                email: email || undefined,
                password,
                role: selectedRole,
            });

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
                'Erreur d\'inscription',
                error?.data?.message || 'Une erreur est survenue lors de l\'inscription'
            );
        }
    };

    const roles = [
        { value: UserRole.CLIENT, label: 'Client', icon: 'person' },
        { value: UserRole.SELLER, label: 'Vendeur', icon: 'storefront' },
        { value: UserRole.DRIVER, label: 'Livreur', icon: 'car' },
    ];

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
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Créer un compte</Text>
                        <Text style={styles.subtitle}>Rejoignez-nous dès maintenant</Text>
                    </View>

                    {/* Sélection du rôle */}
                    <View style={styles.roleSection}>
                        <Text style={styles.sectionTitle}>Je suis un :</Text>
                        <View style={styles.roleButtons}>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role.value}
                                    style={[
                                        styles.roleButton,
                                        selectedRole === role.value && styles.roleButtonActive,
                                    ]}
                                    onPress={() => setSelectedRole(role.value)}
                                >
                                    <Ionicons
                                        name={role.icon as any}
                                        size={24}
                                        color={selectedRole === role.value ? Colors.accent : Colors.gray400}
                                    />
                                    <Text
                                        style={[
                                            styles.roleButtonText,
                                            selectedRole === role.value && styles.roleButtonTextActive,
                                        ]}
                                    >
                                        {role.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Formulaire */}
                    <View style={styles.form}>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Input
                                    label="Prénom"
                                    icon="person"
                                    placeholder="Votre prénom"
                                    value={firstName}
                                    onChangeText={(text) => {
                                        setFirstName(text);
                                        setErrors({ ...errors, firstName: undefined });
                                    }}
                                    error={errors.firstName}
                                    required
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Input
                                    label="Nom"
                                    icon="person"
                                    placeholder="Votre nom"
                                    value={lastName}
                                    onChangeText={(text) => {
                                        setLastName(text);
                                        setErrors({ ...errors, lastName: undefined });
                                    }}
                                    error={errors.lastName}
                                    required
                                />
                            </View>
                        </View>

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
                            label="Email (optionnel)"
                            type="email"
                            icon="mail"
                            placeholder="votre@email.com"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setErrors({ ...errors, email: undefined });
                            }}
                            error={errors.email}
                        />

                        <Input
                            label="Mot de passe"
                            type="password"
                            icon="lock-closed"
                            placeholder="Minimum 6 caractères"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setErrors({ ...errors, password: undefined });
                            }}
                            error={errors.password}
                            required
                        />

                        <Input
                            label="Confirmer le mot de passe"
                            type="password"
                            icon="lock-closed"
                            placeholder="Retapez votre mot de passe"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                setErrors({ ...errors, confirmPassword: undefined });
                            }}
                            error={errors.confirmPassword}
                            required
                        />

                        <Button
                            title="S'inscrire"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={isRegistering}
                            onPress={handleRegister}
                        />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Déjà un compte ?</Text>
                        <Button
                            title="Se connecter"
                            variant="outline"
                            size="md"
                            onPress={() => router.back()}
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
        marginBottom: Spacing.xxl,
    },
    backButton: {
        marginBottom: Spacing.md,
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
    roleSection: {
        marginBottom: Spacing.xxl,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    roleButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    roleButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    roleButtonActive: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accent + '10',
    },
    roleButtonText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    roleButtonTextActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    form: {
        marginBottom: Spacing.xxl,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    halfInput: {
        flex: 1,
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
