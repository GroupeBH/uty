import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetOngoingDeliveriesQuery } from '@/store/api/deliveriesApi';
import { DELIVERY_STATUS_LABELS, getDeliveryPersonRefId } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeliveryPersonsActivityTab() {
    const router = useRouter();
    const { isLoading, isAuthenticated, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour suivre vos livraisons actives.');
        }
    }, [isAuthenticated, requireAuth]);

    const { data: profile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: deliveries = [], isFetching, refetch } = useGetOngoingDeliveriesQuery(undefined, {
        skip: !isAuthenticated,
        pollingInterval: 15000,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const myDeliveryPersonId = profile?._id;
    const activeDeliveries = deliveries
        .filter((delivery) => {
            const assignedId = getDeliveryPersonRefId(delivery.deliveryPersonId);
            return Boolean(
                assignedId &&
                    myDeliveryPersonId &&
                    assignedId === myDeliveryPersonId &&
                    !['delivered', 'failed', 'cancelled'].includes(delivery.status),
            );
        })
        .sort(
            (a, b) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Mes livraisons actives</Text>
                <Text style={styles.subtitle}>{activeDeliveries.length} en cours</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {activeDeliveries.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="navigate-outline" size={22} color={Colors.primary} />
                        <Text style={styles.emptyTitle}>Aucune livraison active</Text>
                        <Text style={styles.emptyText}>
                            Acceptez une course depuis l onglet Courses.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => router.push('/delivery-persons/pool')}
                        >
                            <Text style={styles.emptyButtonText}>Voir les courses</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    activeDeliveries.map((delivery) => (
                        <TouchableOpacity
                            key={delivery._id}
                            style={styles.card}
                            activeOpacity={0.9}
                            onPress={() =>
                                router.push(`/delivery/deliver-persons/${delivery._id}` as any)
                            }
                        >
                            <View style={styles.row}>
                                <Text style={styles.code}>
                                    #{String(delivery.orderId && typeof delivery.orderId === 'object' ? delivery.orderId._id || delivery._id : delivery._id).slice(-8).toUpperCase()}
                                </Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>
                                        {DELIVERY_STATUS_LABELS[delivery.status]}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.label}>Pickup</Text>
                            <Text style={styles.value}>{delivery.pickupLocation || 'Non renseigne'}</Text>
                            <Text style={[styles.label, { marginTop: Spacing.xs }]}>Dropoff</Text>
                            <Text style={styles.value}>{delivery.deliveryLocation || 'Non renseigne'}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
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
    content: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 120,
        gap: Spacing.sm,
    },
    card: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    code: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    statusBadge: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    statusText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    label: {
        marginTop: Spacing.sm,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    value: {
        marginTop: 2,
        color: Colors.gray700,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    emptyCard: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: Spacing.sm,
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
    emptyButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        minHeight: 40,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
