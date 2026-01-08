/**
 * Page des commandes client
 */

import { OrderCard } from '@/components/OrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetOrdersQuery } from '@/store/api/ordersApi';
import { OrderStatus } from '@/types';
import React, { useState } from 'react';
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

export default function OrdersScreen() {
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>();
    const [refreshing, setRefreshing] = useState(false);

    const { data, isLoading, refetch } = useGetOrdersQuery({
        status: selectedStatus,
        page: 1,
        limit: 20,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const statusFilters = [
        { value: undefined, label: 'Toutes' },
        { value: OrderStatus.PENDING, label: 'En attente' },
        { value: OrderStatus.IN_TRANSIT, label: 'En transit' },
        { value: OrderStatus.DELIVERED, label: 'Livrées' },
    ];

    if (isLoading && !data) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Filtres de statut */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {statusFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.label}
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

            {/* Liste des commandes */}
            <FlatList
                data={data?.data || []}
                renderItem={({ item }) => <OrderCard order={item} />}
                keyExtractor={(item) => item.id}
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
                        <Text style={styles.emptyText}>Aucune commande trouvée</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    filtersContainer: {
        backgroundColor: Colors.white,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray50,
        ...Shadows.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        marginRight: Spacing.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: Colors.accent + '20',
        borderColor: Colors.accent,
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
        padding: Spacing.xl,
        paddingBottom: 100, // Espace pour la tab bar flottante
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.massive,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        color: Colors.gray400,
        fontWeight: Typography.fontWeight.medium,
    },
});
