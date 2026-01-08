/**
 * Page de profil client
 */

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, isLoading, isLoggingOut } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    const menuItems = [
        {
            icon: 'person-outline',
            label: 'Informations personnelles',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
        {
            icon: 'location-outline',
            label: 'Adresses de livraison',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
        {
            icon: 'card-outline',
            label: 'Moyens de paiement',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
        {
            icon: 'heart-outline',
            label: 'Liste de souhaits',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
        {
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
        {
            icon: 'help-circle-outline',
            label: 'Aide & Support',
            onPress: () => Alert.alert('Info', 'Fonctionnalité en cours de développement'),
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header avec informations utilisateur */}
                <Card variant="elevated" style={styles.userCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </Text>
                    </View>
                    <Text style={styles.userName}>
                        {user?.firstName} {user?.lastName}
                    </Text>
                    <Text style={styles.userPhone}>{user?.phone}</Text>
                    {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
                </Card>

                {/* Menu */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                                </View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bouton de déconnexion */}
                <Button
                    title="Déconnexion"
                    variant="outline"
                    size="lg"
                    fullWidth
                    loading={isLoggingOut}
                    onPress={handleLogout}
                    icon={<Ionicons name="log-out-outline" size={20} color={Colors.primary} />}
                />

                {/* Version */}
                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.gray50,
    },
    scrollContent: {
        padding: Spacing.xl,
        paddingBottom: 100, // Espace pour la tab bar flottante
    },
    userCard: {
        alignItems: 'center',
        paddingVertical: Spacing.huge,
        marginBottom: Spacing.xxxl,
        borderRadius: BorderRadius.lg,
        ...Shadows.lg,
        backgroundColor: Colors.white,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        ...Shadows.md,
    },
    avatarText: {
        fontSize: Typography.fontSize.huge,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
    },
    userName: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    userPhone: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    userEmail: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray400,
        marginTop: Spacing.xs,
    },
    menuSection: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xxxl,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray50,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.accent + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.lg,
    },
    menuLabel: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
    },
    version: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});
