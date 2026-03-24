import { OrderCard } from '@/components/OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { useGetMyShopQuery } from '@/store/api/shopsApi';
import { Order, OrderStatusValue, getOrderPartyId } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ViewMode = 'buyer' | 'seller';
type StatusFilter = 'all' | OrderStatusValue;

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'all', label: 'Toutes', icon: 'apps-outline' },
    { value: 'pending', label: 'En attente', icon: 'time-outline' },
    { value: 'confirmed', label: 'Confirmees', icon: 'checkmark-circle-outline' },
    { value: 'shipped', label: 'Expediees', icon: 'cube-outline' },
    { value: 'delivered', label: 'Livrees', icon: 'checkmark-done-outline' },
    { value: 'cancelled', label: 'Annulees', icon: 'close-circle-outline' },
];

const normalizeViewQuery = (viewParam: unknown): ViewMode | null => {
    if (viewParam !== 'sales' && viewParam !== 'purchases') return null;
    return viewParam === 'sales' ? 'seller' : 'buyer';
};

const sortByDateDesc = (orders: Order[]) =>
    [...orders].sort((a, b) => {
        const first = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const second = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return second - first;
    });

export default function OrdersScreen() {
    const { user, isAuthenticated, requireAuth } = useAuth();
    const router = useRouter();
    const { view } = useLocalSearchParams<{ view?: string }>();
    const requestedView = normalizeViewQuery(view);

    const [activeView, setActiveView] = React.useState<ViewMode>('buyer');
    const [selectedStatus, setSelectedStatus] = React.useState<StatusFilter>('all');
    const [refreshing, setRefreshing] = React.useState(false);

    React.useEffect(() => {
        if (isAuthenticated) return;
        requireAuth('Connectez-vous pour consulter vos commandes.');
    }, [isAuthenticated, requireAuth]);

    const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: myShop } = useGetMyShopQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: myAnnouncements = [] } = useGetMyAnnouncementsQuery(undefined, {
        skip: !isAuthenticated,
    });

    const hasShop = Boolean(myShop?._id);
    const hasPublishedAnnouncements = myAnnouncements.length > 0;
    const currentUserId = user?._id || '';

    const buyerOrders = React.useMemo(() => {
        if (!currentUserId) return [] as Order[];
        return orders.filter((order) => getOrderPartyId(order.userId) === currentUserId);
    }, [currentUserId, orders]);

    const receivedOrders = React.useMemo(() => {
        if (!currentUserId) return [] as Order[];
        return orders.filter((order) => getOrderPartyId(order.sellerId) === currentUserId);
    }, [currentUserId, orders]);

    const openSellerOrders = React.useCallback(() => {
        router.push('/seller/orders' as any);
    }, [router]);

    const selectBuyerView = React.useCallback(() => {
        setActiveView('buyer');
    }, []);

    const selectReceivedView = React.useCallback(() => {
        if (hasShop) {
            openSellerOrders();
            return;
        }
        setActiveView('seller');
    }, [hasShop, openSellerOrders]);

    React.useEffect(() => {
        if (requestedView === 'buyer') {
            setActiveView('buyer');
            return;
        }
        if (requestedView === 'seller') {
            selectReceivedView();
        }
    }, [requestedView, selectReceivedView]);

    const activeOrders = React.useMemo(() => {
        const base = activeView === 'seller' ? receivedOrders : buyerOrders;
        if (selectedStatus === 'all') return sortByDateDesc(base);
        return sortByDateDesc(base.filter((order) => order.status === selectedStatus));
    }, [activeView, buyerOrders, receivedOrders, selectedStatus]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (!isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    if (isLoading && orders.length === 0) {
        return <LoadingSpinner fullScreen />;
    }

    const activeCount = activeView === 'seller' ? receivedOrders.length : buyerOrders.length;
    const subtitle = activeView === 'seller' ? 'Commandes recue' : 'Commandes passee';
    const emptyTitle =
        activeView === 'seller'
            ? hasShop
                ? 'Commandes recues dans espace vendeur'
                : 'Aucune commande recue'
            : 'Aucune commande passee';
    const emptyMessage =
        activeView === 'seller'
            ? hasShop
                ? 'Utilisez votre espace vendeur pour gerer les commandes recues.'
                : hasPublishedAnnouncements
                    ? 'Les commandes de vos annonces apparaitront ici.'
                    : 'Publiez des annonces pour commencer a recevoir des commandes.'
            : 'Vos achats valides apparaitront ici.';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.headerWrap}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Retour">
                    <Ionicons name="arrow-back" size={20} color={Colors.white} />
                </TouchableOpacity>
                <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <View style={styles.heroCopy}>
                            <Text style={styles.heroTitle}>Mes commandes</Text>
                            <Text style={styles.heroSubtitle}>{subtitle} • {activeCount}</Text>
                        </View>
                        <View style={styles.heroIconWrap}>
                            <Ionicons name="receipt-outline" size={24} color={Colors.accent} />
                        </View>
                    </View>
                    <View style={styles.heroStats}>
                        <TouchableOpacity
                            style={[styles.heroStatCard, activeView === 'buyer' && styles.heroStatCardActive]}
                            onPress={selectBuyerView}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.heroStatLabel}>Passees</Text>
                            <Text style={styles.heroStatValue}>{buyerOrders.length}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.heroStatCard, activeView === 'seller' && !hasShop && styles.heroStatCardActive]}
                            onPress={selectReceivedView}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.heroStatLabel}>Recues</Text>
                            <Text style={styles.heroStatValue}>{receivedOrders.length}</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>

            <View style={styles.tabSwitch}>
                <TouchableOpacity
                    style={[styles.tabChip, activeView === 'buyer' && styles.tabChipActive]}
                    onPress={selectBuyerView}
                >
                    <View style={[styles.tabChipIconWrap, activeView === 'buyer' && styles.tabChipIconWrapActive]}>
                        <Ionicons
                            name="cart-outline"
                            size={14}
                            color={activeView === 'buyer' ? Colors.primary : Colors.gray500}
                        />
                    </View>
                    <View style={styles.tabChipCopy}>
                        <Text style={[styles.tabChipText, activeView === 'buyer' && styles.tabChipTextActive]}>
                            Commandes passees
                        </Text>
                        <Text
                            style={[
                                styles.tabChipSubtext,
                                activeView === 'buyer' && styles.tabChipSubtextActive,
                            ]}
                        >
                            {buyerOrders.length} commande(s)
                        </Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabChip, activeView === 'seller' && !hasShop && styles.tabChipActive]}
                    onPress={selectReceivedView}
                >
                    <View
                        style={[
                            styles.tabChipIconWrap,
                            activeView === 'seller' && !hasShop && styles.tabChipIconWrapActive,
                        ]}
                    >
                        <Ionicons
                            name="storefront-outline"
                            size={14}
                            color={activeView === 'seller' && !hasShop ? Colors.primary : Colors.gray500}
                        />
                    </View>
                    <View style={styles.tabChipCopy}>
                        <Text
                            style={[
                                styles.tabChipText,
                                activeView === 'seller' && !hasShop && styles.tabChipTextActive,
                            ]}
                        >
                            Commandes recues
                        </Text>
                        <Text
                            style={[
                                styles.tabChipSubtext,
                                activeView === 'seller' && !hasShop && styles.tabChipSubtextActive,
                            ]}
                        >
                            {receivedOrders.length} commande(s)
                        </Text>
                    </View>
                    {hasShop ? (
                        <Ionicons name="open-outline" size={13} color={Colors.primary} />
                    ) : null}
                </TouchableOpacity>
            </View>

            {hasShop ? (
                <TouchableOpacity style={styles.redirectBanner} onPress={openSellerOrders}>
                    <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                    <Text style={styles.redirectBannerText}>
                        Vos commandes recues se gerent dans l espace vendeur.
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
            ) : null}

            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {STATUS_FILTERS.map((filter) => (
                        <TouchableOpacity
                            key={filter.value}
                            style={[
                                styles.filterChip,
                                selectedStatus === filter.value && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedStatus(filter.value)}
                        >
                            <Ionicons
                                name={filter.icon}
                                size={13}
                                color={selectedStatus === filter.value ? Colors.primary : Colors.gray500}
                            />
                            <Text
                                style={[
                                    styles.filterText,
                                    selectedStatus === filter.value && styles.filterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View style={styles.uxHintCard}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.uxHintText}>
                    Touchez une commande pour voir ses details et actions disponibles.
                </Text>
            </View>

            <FlatList
                data={activeOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        perspective={activeView === 'seller' ? 'seller' : 'buyer'}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isFetching}
                        onRefresh={onRefresh}
                        tintColor={Colors.accent}
                        colors={[Colors.accent]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={28} color={Colors.gray400} />
                        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                        <Text style={styles.emptyText}>{emptyMessage}</Text>
                        {activeView === 'seller' && hasShop ? (
                            <TouchableOpacity style={styles.emptySellerBtn} onPress={openSellerOrders}>
                                <Text style={styles.emptySellerBtnText}>Ouvrir l espace vendeur</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    headerWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primaryDark,
        marginBottom: Spacing.sm,
        ...Shadows.md,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.white + '22',
        ...Shadows.lg,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroCopy: {
        flex: 1,
    },
    heroTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroSubtitle: {
        marginTop: 2,
        color: Colors.white + 'D4',
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    heroIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + '16',
        borderWidth: 1,
        borderColor: Colors.white + '28',
    },
    heroStats: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    heroStatCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white + '2A',
        backgroundColor: Colors.white + '12',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    heroStatCardActive: {
        backgroundColor: Colors.accent + '22',
        borderColor: Colors.accent + 'A0',
    },
    heroStatLabel: {
        color: Colors.white + 'D0',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    heroStatValue: {
        marginTop: 2,
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    tabSwitch: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    tabChip: {
        flex: 1,
        minHeight: 52,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    tabChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '14',
    },
    tabChipIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabChipIconWrapActive: {
        backgroundColor: Colors.primary + '18',
    },
    tabChipCopy: {
        flex: 1,
    },
    tabChipText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    tabChipTextActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    tabChipSubtext: {
        marginTop: 1,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    tabChipSubtextActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    redirectBanner: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '2E',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    redirectBannerText: {
        flex: 1,
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    filtersContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
    },
    filterChipActive: {
        backgroundColor: Colors.accent + '25',
        borderColor: Colors.accentDark,
    },
    filterText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray500,
    },
    filterTextActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    uxHintCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '22',
        backgroundColor: Colors.primary + '10',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    uxHintText: {
        flex: 1,
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: 120,
    },
    emptyContainer: {
        marginTop: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxxl,
        ...Shadows.sm,
    },
    emptyTitle: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },
    emptyText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptySellerBtn: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    emptySellerBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
