import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyShopQuery } from '@/store/api/shopsApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellerShopTab() {
    const router = useRouter();
    const { isAuthenticated, isLoading, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour gerer votre boutique.');
        }
    }, [isAuthenticated, requireAuth]);

    const { data: shop, isFetching, refetch } = useGetMyShopQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const hasShop = Boolean(shop?._id);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.wrapper}>
                <View style={styles.card}>
                    <View style={styles.topRow}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="storefront-outline" size={24} color={Colors.primary} />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.title}>
                                {hasShop ? shop?.name || 'Ma boutique' : 'Aucune boutique active'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {hasShop
                                    ? shop?.description || 'Gerez les informations et le KYC de votre boutique.'
                                    : 'Creez votre boutique pour activer toutes les operations vendeur.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.badgesRow}>
                        <View style={[styles.badge, hasShop ? styles.badgeReady : styles.badgePending]}>
                            <Text style={[styles.badgeText, hasShop && styles.badgeTextReady]}>
                                {hasShop ? 'Boutique configuree' : 'Configuration requise'}
                            </Text>
                        </View>
                        {shop ? (
                            <View style={[styles.badge, shop.isActive ? styles.badgeReady : styles.badgePending]}>
                                <Text style={[styles.badgeText, shop.isActive && styles.badgeTextReady]}>
                                    {shop.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push(hasShop ? '/my-shop' : '/create-shop')}
                        >
                            <Text style={styles.primaryButtonText}>
                                {hasShop ? 'Ouvrir ma boutique' : 'Creer ma boutique'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.secondaryButton, isFetching && styles.disabled]}
                            onPress={() => refetch()}
                            disabled={isFetching}
                        >
                            <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                            <Text style={styles.secondaryButtonText}>
                                {isFetching ? 'Actualisation...' : 'Actualiser'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    wrapper: {
        padding: Spacing.xl,
    },
    card: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        ...Shadows.sm,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: { flex: 1 },
    title: {
        color: Colors.primary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    subtitle: {
        marginTop: Spacing.xs,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    badgesRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    badge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
    },
    badgeReady: {
        borderColor: Colors.success + '40',
        backgroundColor: Colors.success + '15',
    },
    badgePending: {
        borderColor: Colors.warning + '45',
        backgroundColor: Colors.warning + '14',
    },
    badgeText: {
        color: Colors.warning,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    badgeTextReady: {
        color: Colors.success,
    },
    actions: {
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    primaryButton: {
        minHeight: 46,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    secondaryButton: {
        minHeight: 46,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    disabled: {
        opacity: 0.65,
    },
});
