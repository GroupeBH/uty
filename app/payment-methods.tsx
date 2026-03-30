import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAppConfigQuery } from '@/store/api/appConfigApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const METHOD_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    delivery: 'cash-outline',
    mobile_money: 'phone-portrait-outline',
    bank: 'business-outline',
    other: 'wallet-outline',
};

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const { data } = useGetAppConfigQuery();
    const checkout = data?.checkout;
    const methods = checkout?.paymentMethods || [];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerCopy}>
                        <Text style={styles.title}>Moyens de paiement</Text>
                        <Text style={styles.subtitle}>
                            Des options plus simples et plus rassurantes pour Kinshasa.
                        </Text>
                    </View>
                </View>

                <LinearGradient colors={Gradients.accent} style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Mode recommande</Text>
                    <Text style={styles.heroText}>
                        Commencez par le paiement a la livraison pour les nouveaux utilisateurs et les premieres commandes.
                    </Text>
                    <View style={styles.ratePill}>
                        <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primaryDark} />
                        <Text style={styles.rateText}>
                            1 USD = {Math.round(checkout?.usdToCdfRate || 2300).toLocaleString('fr-FR')} CDF
                        </Text>
                    </View>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Options disponibles</Text>
                    {methods.map((method) => {
                        const icon = METHOD_ICON[method.kind] || 'wallet-outline';
                        const isEnabled = method.isEnabled !== false;
                        return (
                            <View key={method.id} style={[styles.methodCard, !isEnabled && styles.methodCardMuted]}>
                                <LinearGradient
                                    colors={method.isRecommended ? Gradients.success : Gradients.primary}
                                    style={styles.methodIcon}
                                >
                                    <Ionicons name={icon} size={18} color={Colors.white} />
                                </LinearGradient>
                                <View style={styles.methodCopy}>
                                    <View style={styles.methodTitleRow}>
                                        <Text style={styles.methodTitle}>{method.label}</Text>
                                        <View
                                            style={[
                                                styles.badge,
                                                isEnabled ? styles.badgeReady : styles.badgePending,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    isEnabled ? styles.badgeTextReady : styles.badgeTextPending,
                                                ]}
                                            >
                                                {isEnabled ? 'Disponible' : 'A venir'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.methodText}>{method.description}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bonnes pratiques</Text>
                    {[
                        'Verifiez toujours le total avant confirmation.',
                        'Gardez une monnaie adaptee si vous payez a la livraison.',
                        'Precisez votre repere pour eviter les retards de livraison.',
                    ].map((item) => (
                        <View key={item} style={styles.tipRow}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                            <Text style={styles.tipText}>{item}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    content: {
        padding: Spacing.xl,
        paddingBottom: 120,
        gap: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    headerCopy: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    subtitle: {
        marginTop: 4,
        fontSize: Typography.fontSize.base,
        lineHeight: 22,
        color: Colors.textSecondary,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.md,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primaryDark,
    },
    heroText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.base,
        lineHeight: 22,
        color: Colors.primaryDark + 'D9',
    },
    ratePill: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + 'A8',
    },
    rateText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primaryDark,
    },
    section: {
        gap: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    methodCard: {
        flexDirection: 'row',
        gap: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    methodCardMuted: {
        opacity: 0.78,
    },
    methodIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodCopy: {
        flex: 1,
    },
    methodTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    methodTitle: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    methodText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
    badge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    badgeReady: {
        backgroundColor: Colors.success + '15',
    },
    badgePending: {
        backgroundColor: Colors.warning + '15',
    },
    badgeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    badgeTextReady: {
        color: Colors.success,
    },
    badgeTextPending: {
        color: Colors.warning,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    tipText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.textPrimary,
    },
});
