import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAppConfigQuery } from '@/store/api/appConfigApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sanitizePhone = (value?: string | null) => (value || '').replace(/[^\d+]/g, '');

export default function HelpSupportScreen() {
    const router = useRouter();
    const { data } = useGetAppConfigQuery();
    const support = data?.support;
    const channels = support?.channels;
    const faq = support?.faq || [];

    const openUrl = React.useCallback(async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    }, []);

    const phone = sanitizePhone(channels?.phone);
    const whatsapp = sanitizePhone(channels?.whatsapp);
    const email = (channels?.email || '').trim();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerCopy}>
                        <Text style={styles.title}>Aide & Support</Text>
                        <Text style={styles.subtitle}>
                            Des consignes simples pour commander et se faire livrer a Kinshasa.
                        </Text>
                    </View>
                </View>

                <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Besoin d aide rapide ?</Text>
                    <Text style={styles.heroText}>
                        Commencez par la messagerie integree, puis utilisez un repere clair et un numero joignable.
                    </Text>
                    <Text style={styles.heroHours}>
                        {channels?.hoursLabel || 'Lun-Sam 8h00-18h00'}
                    </Text>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contacter le support</Text>

                    {phone ? (
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => void openUrl(`tel:${phone}`)}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={Gradients.cool} style={styles.actionIcon}>
                                <Ionicons name="call-outline" size={18} color={Colors.white} />
                            </LinearGradient>
                            <View style={styles.actionCopy}>
                                <Text style={styles.actionTitle}>Appeler le support</Text>
                                <Text style={styles.actionText}>{channels?.phone}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {whatsapp ? (
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => void openUrl(`https://wa.me/${whatsapp.replace('+', '')}`)}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={Gradients.success} style={styles.actionIcon}>
                                <Ionicons name="logo-whatsapp" size={18} color={Colors.white} />
                            </LinearGradient>
                            <View style={styles.actionCopy}>
                                <Text style={styles.actionTitle}>WhatsApp support</Text>
                                <Text style={styles.actionText}>{channels?.whatsapp}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {email ? (
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => void openUrl(`mailto:${email}`)}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={Gradients.warm} style={styles.actionIcon}>
                                <Ionicons name="mail-outline" size={18} color={Colors.white} />
                            </LinearGradient>
                            <View style={styles.actionCopy}>
                                <Text style={styles.actionTitle}>Ecrire par email</Text>
                                <Text style={styles.actionText}>{email}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {!phone && !whatsapp && !email ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
                            <Text style={styles.emptyText}>
                                Les contacts directs du support ne sont pas encore configures. Utilisez la messagerie integree et les instructions ci-dessous.
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conseils pratiques</Text>
                    {[
                        'Ajoutez toujours commune, quartier et repere connu.',
                        'Gardez votre telephone joignable pendant la livraison.',
                        'Si vous n etes pas a l aise avec la carte, indiquez d abord un repere simple.',
                        'Pour une premiere commande, privilegiez le paiement a la livraison.',
                    ].map((item) => (
                        <View key={item} style={styles.tipRow}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                            <Text style={styles.tipText}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Questions frequentes</Text>
                    {faq.map((item) => (
                        <View key={item.question} style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>{item.question}</Text>
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
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
        color: Colors.white,
    },
    heroText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.base,
        lineHeight: 22,
        color: Colors.white + 'EA',
    },
    heroHours: {
        marginTop: Spacing.md,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + '22',
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    section: {
        gap: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    actionIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCopy: {
        flex: 1,
    },
    actionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    actionText: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    emptyCard: {
        flexDirection: 'row',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    emptyText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.textSecondary,
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
    faqCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    faqQuestion: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    faqAnswer: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        lineHeight: 21,
        color: Colors.textSecondary,
    },
});
