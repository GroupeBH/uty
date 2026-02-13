/**
 * Ecran des commandes
 * - Achats de l'utilisateur
 * - Ventes de la boutique (si role vendeur)
 */

import { OrderCard } from '@/components/OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { Order, OrderStatusValue, getOrderPartyId } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
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

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmees' },
    { value: 'shipped', label: 'Expediees' },
    { value: 'delivered', label: 'Livrees' },
    { value: 'cancelled', label: 'Annulees' },
];

const isSellerRole = (role?: string) => {
    const normalized = (role || '').toLowerCase();
    return normalized === 'seller' || normalized === 'admin';
};

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
    const { user } = useAuth();
    const router = useRouter();
    const { view } = useLocalSearchParams<{ view?: string }>();
    const requestedView = normalizeViewQuery(view);
    const [refreshing, setRefreshing] = React.useState(false);
    const [selectedStatus, setSelectedStatus] = React.useState<StatusFilter>('all');
    const hasSellerRole = Boolean(user?.roles?.some((role) => isSellerRole(role)));
    const [activeView, setActiveView] = React.useState<ViewMode>(
        requestedView && (requestedView === 'buyer' || hasSellerRole) ? requestedView : 'buyer',
    );

    React.useEffect(() => {
        if (requestedView && (requestedView === 'buyer' || hasSellerRole)) {
            setActiveView(requestedView);
            return;
        }

        if (!hasSellerRole && activeView === 'seller') {
            setActiveView('buyer');
        }
    }, [activeView, hasSellerRole, requestedView]);

    const { data: orders = [], isLoading, refetch } = useGetOrdersQuery();
    const currentUserId = user?._id || '';

    const viewOrders = React.useMemo(() => {
        if (!currentUserId) return [] as Order[];

        return orders.filter((order) => {
            const buyerId = getOrderPartyId(order.userId);
            const sellerId = getOrderPartyId(order.sellerId);
            if (activeView === 'seller') return sellerId === currentUserId;
            return buyerId === currentUserId;
        });
    }, [activeView, currentUserId, orders]);

    const filteredOrders = React.useMemo(() => {
        const base = selectedStatus === 'all'
            ? viewOrders
            : viewOrders.filter((order) => order.status === selectedStatus);
        return sortByDateDesc(base);
    }, [selectedStatus, viewOrders]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (isLoading && orders.length === 0) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityLabel="Retour"
                >
                    <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Gestion des commandes</Text>
                <Text style={styles.subtitle}>
                    {activeView === 'seller' ? 'Commandes recues' : 'Commandes passees'}
                </Text>
            </View>

            {hasSellerRole ? (
                <View style={styles.switchContainer}>
                    <TouchableOpacity
                        style={[styles.switchChip, activeView === 'buyer' && styles.switchChipActive]}
                        onPress={() => setActiveView('buyer')}
                    >
                        <Text style={[styles.switchChipText, activeView === 'buyer' && styles.switchChipTextActive]}>
                            Mes achats
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.switchChip, activeView === 'seller' && styles.switchChipActive]}
                        onPress={() => setActiveView('seller')}
                    >
                        <Text style={[styles.switchChipText, activeView === 'seller' && styles.switchChipTextActive]}>
                            Ma boutique
                        </Text>
                    </TouchableOpacity>
                </View>
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

            <FlatList
                data={filteredOrders}
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        perspective={activeView === 'seller' ? 'seller' : 'buyer'}
                    />
                )}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.accent}
                        colors={[Colors.accent]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>
                            {activeView === 'seller'
                                ? 'Aucune commande boutique'
                                : 'Aucune commande client'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeView === 'seller'
                                ? 'Les nouvelles ventes apparaitront ici.'
                                : 'Vos achats valides apparaitront ici.'}
                        </Text>
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
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    subtitle: {
        marginTop: Spacing.xs / 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
    },
    switchContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    switchChip: {
        flex: 1,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    switchChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    switchChipText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    switchChipTextActive: {
        color: Colors.white,
    },
    filtersContainer: {
        backgroundColor: Colors.white,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray50,
    },
    filterChip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
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
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: 120,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.massive,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        textAlign: 'center',
    },
});
