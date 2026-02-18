import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { useGetMyShopQuery } from '@/store/api/shopsApi';
import { getOrderPartyId } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SELLER_ROLE_KEYS = ['seller', 'admin'];

const hasSellerRole = (roles: string[] | undefined) =>
    Boolean(roles?.some((role) => SELLER_ROLE_KEYS.includes((role || '').toLowerCase())));

export default function SellerDashboardTab() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, requireAuth } = useAuth();
    const currentUserId = user?._id || '';

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour acceder a l espace vendeur.');
        }
    }, [isAuthenticated, requireAuth]);

    const { data: shop } = useGetMyShopQuery(undefined, { skip: !isAuthenticated });
    const { data: orders = [] } = useGetOrdersQuery(undefined, { skip: !isAuthenticated });
    const { data: announcements = [] } = useGetMyAnnouncementsQuery(undefined, { skip: !isAuthenticated });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const hasRole = hasSellerRole(user?.roles);
    const sellerOrders = orders.filter((order) => getOrderPartyId(order.sellerId) === currentUserId);
    const activeOrders = sellerOrders.filter((order) =>
        ['pending', 'confirmed', 'shipped'].includes(order.status),
    );
    const deliveredOrders = sellerOrders.filter((order) => order.status === 'delivered');
    const deliveredRevenue = deliveredOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
    );

    const ctaRoute = shop?._id ? '/seller/shop' : '/create-shop';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerCard}>
                    <Text style={styles.eyebrow}>ESPACE VENDEUR</Text>
                    <Text style={styles.title}>
                        {shop?.name?.trim() || 'Operations vendeur'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {hasRole || shop?._id
                            ? 'Pilotez boutique, commandes et annonces depuis un espace dedie.'
                            : 'Activez votre profil vendeur pour debloquer toutes les operations.'}
                    </Text>
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Commandes actives</Text>
                        <Text style={styles.metricValue}>{activeOrders.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Annonces</Text>
                        <Text style={styles.metricValue}>{announcements.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Livrees</Text>
                        <Text style={styles.metricValue}>{deliveredOrders.length}</Text>
                    </View>
                </View>

                <View style={styles.revenueCard}>
                    <Text style={styles.revenueLabel}>Revenu cumule (commandes livrees)</Text>
                    <Text style={styles.revenueValue}>{Math.round(deliveredRevenue).toLocaleString('fr-FR')} FC</Text>
                </View>

                <View style={styles.actionsCard}>
                    <Text style={styles.sectionTitle}>Actions rapides</Text>
                    <View style={styles.grid}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/seller/orders')}>
                            <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Commandes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/seller/announcements')}>
                            <Ionicons name="megaphone-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Annonces</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push(ctaRoute as any)}>
                            <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Boutique</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/publish')}>
                            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Publier</Text>
                        </TouchableOpacity>
                    </View>
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
        gap: Spacing.md,
        paddingBottom: 120,
    },
    headerCard: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.md,
    },
    eyebrow: {
        color: Colors.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },
    title: {
        marginTop: 4,
        color: Colors.white,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    subtitle: {
        marginTop: Spacing.xs,
        color: Colors.white + 'DE',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    metricCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    metricLabel: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    metricValue: {
        marginTop: Spacing.xs,
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    revenueCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
        backgroundColor: Colors.primary + '10',
        padding: Spacing.lg,
    },
    revenueLabel: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        marginBottom: 2,
    },
    revenueValue: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    actionsCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    sectionTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        marginBottom: Spacing.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    actionButton: {
        width: '48%',
        minHeight: 74,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
