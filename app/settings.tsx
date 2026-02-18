/**
 * Écran des paramètres de l'application
 */

import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometricAuth, setBiometricAuth] = useState(false);

    const settingsSections = [
        {
            title: 'Notifications',
            items: [
                {
                    icon: 'notifications-outline',
                    label: 'Notifications push',
                    subtitle: 'Recevoir des notifications',
                    value: pushNotifications,
                    onValueChange: setPushNotifications,
                    gradient: Gradients.warm,
                },
                {
                    icon: 'mail-outline',
                    label: 'Notifications email',
                    subtitle: 'Recevoir des emails',
                    value: emailNotifications,
                    onValueChange: setEmailNotifications,
                    gradient: Gradients.cool,
                },
            ],
        },
        {
            title: 'Sécurité',
            items: [
                {
                    icon: 'finger-print-outline',
                    label: 'Authentification biométrique',
                    subtitle: 'Utiliser l\'empreinte digitale',
                    value: biometricAuth,
                    onValueChange: setBiometricAuth,
                    gradient: Gradients.primary,
                },
                {
                    icon: 'lock-closed-outline',
                    label: 'Changer le code PIN',
                    subtitle: 'Modifier votre code de sécurité',
                    gradient: Gradients.accent,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
            ],
        },
        {
            title: 'Apparence',
            items: [
                {
                    icon: 'moon-outline',
                    label: 'Mode sombre',
                    subtitle: 'Activer le thème sombre',
                    value: darkMode,
                    onValueChange: setDarkMode,
                    gradient: Gradients.cool,
                },
            ],
        },
        {
            title: 'Données',
            items: [
                {
                    icon: 'download-outline',
                    label: 'Télécharger mes données',
                    subtitle: 'Exporter toutes mes données',
                    gradient: Gradients.success,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
                {
                    icon: 'trash-outline',
                    label: 'Supprimer mon compte',
                    subtitle: 'Supprimer définitivement mon compte',
                    gradient: Gradients.warm,
                    isDestructive: true,
                    onPress: () => {
                        Alert.alert(
                            'Supprimer le compte',
                            'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
                            [
                                { text: 'Annuler', style: 'cancel' },
                                {
                                    text: 'Supprimer',
                                    style: 'destructive',
                                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                                },
                            ]
                        );
                    },
                },
            ],
        },
        {
            title: 'À propos',
            items: [
                {
                    icon: 'document-text-outline',
                    label: 'Conditions d\'utilisation',
                    subtitle: 'Lire les conditions',
                    gradient: Gradients.cool,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
                {
                    icon: 'shield-checkmark-outline',
                    label: 'Politique de confidentialité',
                    subtitle: 'Comment nous protégeons vos données',
                    gradient: Gradients.primary,
                    onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
                },
                {
                    icon: 'information-circle-outline',
                    label: 'À propos',
                    subtitle: 'Version 1.0.0',
                    gradient: Gradients.accent,
                    onPress: () => Alert.alert('À propos', 'UTY - Version 1.0.0\n\nApplication de marketplace'),
                },
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paramètres</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {settingsSections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.itemsContainer}>
                            {section.items.map((item, itemIndex) => (
                                <TouchableOpacity
                                    key={itemIndex}
                                    style={[
                                        styles.settingItem,
                                        item.isDestructive && styles.settingItemDestructive,
                                    ]}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                    disabled={!item.onPress}
                                >
                                    <View style={styles.settingItemLeft}>
                                        <LinearGradient
                                            colors={item.gradient}
                                            style={styles.settingIconGradient}
                                        >
                                            <Ionicons
                                                name={item.icon as any}
                                                size={20}
                                                color={Colors.white}
                                            />
                                        </LinearGradient>
                                        <View style={styles.settingItemText}>
                                            <Text
                                                style={[
                                                    styles.settingLabel,
                                                    item.isDestructive && styles.settingLabelDestructive,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                                        </View>
                                    </View>
                                    {item.onValueChange ? (
                                        <Switch
                                            value={item.value}
                                            onValueChange={item.onValueChange}
                                            trackColor={{
                                                false: Colors.gray300,
                                                true: Colors.primary + '80',
                                            }}
                                            thumbColor={item.value ? Colors.primary : Colors.gray400}
                                        />
                                    ) : (
                                        <Ionicons
                                            name="chevron-forward"
                                            size={20}
                                            color={Colors.gray400}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
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
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    itemsContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    settingItemDestructive: {
        borderBottomColor: Colors.error + '20',
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIconGradient: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    settingItemText: {
        flex: 1,
    },
    settingLabel: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs / 2,
    },
    settingLabelDestructive: {
        color: Colors.error,
    },
    settingSubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
});

