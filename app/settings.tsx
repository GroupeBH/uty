/**
 * Ecran des parametres de l'application
 */

import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { OTP_DISABLED } from '@/utils/featureFlags';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type GradientValue = (typeof Gradients)[keyof typeof Gradients];

type SettingsItemBase = {
    icon: string;
    label: string;
    subtitle: string;
    gradient: GradientValue;
    isDestructive?: boolean;
};

type SettingsToggleItem = SettingsItemBase & {
    kind: 'toggle';
    value: boolean;
    onValueChange: React.Dispatch<React.SetStateAction<boolean>>;
};

type SettingsActionItem = SettingsItemBase & {
    kind: 'action';
    onPress: () => void;
};

type SettingsItem = SettingsToggleItem | SettingsActionItem;

type SettingsSection = {
    title: string;
    items: SettingsItem[];
};

export default function SettingsScreen() {
    const router = useRouter();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometricAuth, setBiometricAuth] = useState(false);

    const showComingSoon = React.useCallback(() => {
        showStyledAlert('Info', 'Fonctionnalite a venir', undefined, 'info');
    }, [showStyledAlert]);

    const settingsSections: SettingsSection[] = [
        {
            title: 'Notifications',
            items: [
                {
                    kind: 'toggle',
                    icon: 'notifications-outline',
                    label: 'Notifications push',
                    subtitle: 'Recevoir des notifications',
                    value: pushNotifications,
                    onValueChange: setPushNotifications,
                    gradient: Gradients.warm,
                },
                {
                    kind: 'toggle',
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
            title: 'Securite',
            items: [
                {
                    kind: 'toggle',
                    icon: 'finger-print-outline',
                    label: 'Authentification biometrique',
                    subtitle: "Utiliser l'empreinte digitale",
                    value: biometricAuth,
                    onValueChange: setBiometricAuth,
                    gradient: Gradients.primary,
                },
                {
                    kind: 'action',
                    icon: 'lock-closed-outline',
                    label: 'Changer le code PIN',
                    subtitle: 'Modifier votre code de securite',
                    gradient: Gradients.accent,
                    onPress: () => router.push('/change-pin'),
                },
                {
                    kind: 'action',
                    icon: 'help-circle-outline',
                    label: 'PIN oublie',
                    subtitle: OTP_DISABLED ? 'Reinitialiser temporairement sans OTP' : 'Reinitialiser avec OTP',
                    gradient: Gradients.cool,
                    onPress: () => router.push('/forgot-pin'),
                },
            ],
        },
        {
            title: 'Apparence',
            items: [
                {
                    kind: 'toggle',
                    icon: 'moon-outline',
                    label: 'Mode sombre',
                    subtitle: 'Activer le theme sombre',
                    value: darkMode,
                    onValueChange: setDarkMode,
                    gradient: Gradients.cool,
                },
            ],
        },
        {
            title: 'Utilisation locale',
            items: [
                {
                    kind: 'action',
                    icon: 'card-outline',
                    label: 'Moyens de paiement',
                    subtitle: 'Paiement a la livraison et options locales',
                    gradient: Gradients.accent,
                    onPress: () => router.push('/payment-methods'),
                },
                {
                    kind: 'action',
                    icon: 'help-circle-outline',
                    label: 'Aide et support',
                    subtitle: 'Conseils simples, FAQ et contacts utiles',
                    gradient: Gradients.success,
                    onPress: () => router.push('/help-support'),
                },
            ],
        },
        {
            title: 'Donnees',
            items: [
                {
                    kind: 'action',
                    icon: 'download-outline',
                    label: 'Telecharger mes donnees',
                    subtitle: 'Exporter toutes mes donnees',
                    gradient: Gradients.success,
                    onPress: showComingSoon,
                },
                {
                    kind: 'action',
                    icon: 'trash-outline',
                    label: 'Supprimer mon compte',
                    subtitle: 'Supprimer definitivement mon compte',
                    gradient: Gradients.warm,
                    isDestructive: true,
                    onPress: () => {
                        showStyledAlert(
                            'Supprimer le compte',
                            'Etes-vous sur de vouloir supprimer votre compte ? Cette action est irreversible.',
                            [
                                { text: 'Annuler', style: 'cancel' },
                                {
                                    text: 'Supprimer',
                                    style: 'destructive',
                                    onPress: showComingSoon,
                                },
                            ],
                            'warning',
                        );
                    },
                },
            ],
        },
        {
            title: 'A propos',
            items: [
                {
                    kind: 'action',
                    icon: 'document-text-outline',
                    label: "Conditions d'utilisation",
                    subtitle: 'Lire les conditions',
                    gradient: Gradients.cool,
                    onPress: showComingSoon,
                },
                {
                    kind: 'action',
                    icon: 'shield-checkmark-outline',
                    label: 'Politique de confidentialite',
                    subtitle: 'Comment nous protegeons vos donnees',
                    gradient: Gradients.primary,
                    onPress: showComingSoon,
                },
                {
                    kind: 'action',
                    icon: 'information-circle-outline',
                    label: 'A propos',
                    subtitle: 'Version 1.0.0',
                    gradient: Gradients.accent,
                    onPress: () =>
                        showStyledAlert(
                            'A propos',
                            'UTY - Version 1.0.0\n\nApplication de marketplace',
                            undefined,
                            'info',
                        ),
                },
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Parametres</Text>
                <View style={styles.backButton} />
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
                                    onPress={item.kind === 'action' ? item.onPress : undefined}
                                    activeOpacity={0.7}
                                    disabled={item.kind !== 'action'}
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
                                    {item.kind === 'toggle' ? (
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
            {alertNode}
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
