import { OrderCard } from '@/components/OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { Order, isOrderSellerForUser, toIdString } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sortByDateDesc = (orders: Order[]) =>
    [...orders].sort(
        (a, b) =>
            new Date(b.createdAt || b.updatedAt || 0).getTime() -
            new Date(a.createdAt || a.updatedAt || 0).getTime(),
    );

const getOrderDeliveryRef = (order: Order): string | null => {
    const record = order as Record<string, any>;
    return toIdString(record.deliveryId ?? record.delivery?._id ?? record.delivery);
};

const isOrderInDelivery = (order: Order) =>
    order.status === 'shipped' ||
    Boolean(order.deliveryPersonId) ||
    Boolean(getOrderDeliveryRef(order));

export default function SellerOrdersTab() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour gerer vos commandes vendeur.');
        }
    }, [isAuthenticated, requireAuth]);

    const currentUserId = user?._id || '';
    const { data: orders = [], isFetching, refetch } = useGetOrdersQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const sellerOrders = sortByDateDesc(
        orders.filter((order) => isOrderSellerForUser(order, currentUserId)),
    );
    const deliveryOrders = sellerOrders.filter(isOrderInDelivery).slice(0, 3);

    const openOrderDetails = (order: Order) =>
        router.push({
            pathname: '/order/[id]',
            params: { id: order._id, view: 'sales' },
        });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Commandes vendeur</Text>
                <Text style={styles.subtitle}>{sellerOrders.length} commande(s)</Text>
            </View>

            <FlatList
                data={sellerOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <OrderCard order={item} perspective="seller" />}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    deliveryOrders.length > 0 ? (
                        <View style={styles.deliveryFocusSection}>
                            <View style={styles.deliveryFocusHeader}>
                                <View style={styles.deliveryFocusHeadingCopy}>
                                    <Text style={styles.deliveryFocusEyebrow}>EN LIVRAISON</Text>
                                    <Text style={styles.deliveryFocusHeading}>
                                        Ventes a suivre maintenant
                                    </Text>
                                </View>
                                <Ionicons name="navigate-circle-outline" size={24} color={Colors.accent} />
                            </View>
                            {deliveryOrders.map((order) => (
                                <TouchableOpacity
                                    key={`seller-delivery-focus-${order._id}`}
                                    style={styles.deliveryFocusCard}
                                    onPress={() => openOrderDetails(order)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.deliveryFocusIcon}>
                                        <Ionicons name="trail-sign-outline" size={16} color={Colors.primary} />
                                    </View>
                                    <View style={styles.deliveryFocusCopy}>
                                        <Text style={styles.deliveryFocusOrder}>
                                            Commande #{order._id.slice(-8).toUpperCase()}
                                        </Text>
                                        <Text style={styles.deliveryFocusAddress} numberOfLines={1}>
                                            {order.deliveryAddress?.trim() || 'Adresse a confirmer'}
                                        </Text>
                                    </View>
                                    <Text style={styles.deliveryFocusAction}>Suivre</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Aucune commande vendeur</Text>
                        <Text style={styles.emptyText}>
                            Les commandes recues apparaitront ici.
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
        paddingBottom: Spacing.sm,
    },
    title: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    subtitle: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
    },
    list: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: 120,
    },
    deliveryFocusSection: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
        backgroundColor: Colors.primary,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    deliveryFocusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    deliveryFocusHeadingCopy: {
        flex: 1,
        minWidth: 0,
    },
    deliveryFocusEyebrow: {
        color: Colors.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },
    deliveryFocusHeading: {
        marginTop: 2,
        color: Colors.white,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    deliveryFocusCard: {
        minHeight: 58,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white + '22',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    deliveryFocusIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent,
    },
    deliveryFocusCopy: {
        flex: 1,
        minWidth: 0,
    },
    deliveryFocusOrder: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    deliveryFocusAddress: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    deliveryFocusAction: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyText: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
});
