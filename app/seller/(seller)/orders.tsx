import { OrderCard } from '@/components/OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { getOrderPartyId } from '@/types/order';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellerOrdersTab() {
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

    const sellerOrders = orders
        .filter((order) => getOrderPartyId(order.sellerId) === currentUserId)
        .sort(
            (a, b) =>
                new Date(b.createdAt || b.updatedAt || 0).getTime() -
                new Date(a.createdAt || a.updatedAt || 0).getTime(),
        );

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
