import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetOngoingDeliveriesQuery } from '@/store/api/deliveriesApi';
import { getDeliveryPersonRefId } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DRIVER_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];

const hasDriverRole = (roles: string[] | undefined) =>
    Boolean(roles?.some((role) => DRIVER_ROLE_KEYS.includes((role || '').toLowerCase())));

export default function DeliveryPersonsDashboardTab() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour acceder a l espace livreur.');
        }
    }, [isAuthenticated, requireAuth]);

    const roleActive = hasDriverRole(user?.roles);
    const { data: profile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: deliveries = [] } = useGetOngoingDeliveriesQuery(undefined, {
        skip: !isAuthenticated || !roleActive,
        pollingInterval: 20000,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const profileId = profile?._id;
    const pendingPool = deliveries.filter((delivery) => delivery.status === 'pending');
    const myActiveDeliveries = deliveries.filter((delivery) => {
        const assignedId = getDeliveryPersonRefId(delivery.deliveryPersonId);
        return Boolean(
            assignedId &&
                profileId &&
                assignedId === profileId &&
                !['delivered', 'failed', 'cancelled'].includes(delivery.status),
        );
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>ESPACE LIVREUR</Text>
                    <Text style={styles.title}>Operations de livraison</Text>
                    <Text style={styles.subtitle}>
                        {roleActive
                            ? 'Acceptez les courses disponibles et suivez vos livraisons actives.'
                            : 'Activez votre profil livreur pour debloquer cet espace.'}
                    </Text>
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Courses disponibles</Text>
                        <Text style={styles.metricValue}>{pendingPool.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Mes livraisons</Text>
                        <Text style={styles.metricValue}>{myActiveDeliveries.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Disponibilite</Text>
                        <Text style={styles.metricValue}>{profile?.isAvailable ? 'ON' : 'OFF'}</Text>
                    </View>
                </View>

                <View style={styles.actionsCard}>
                    <Text style={styles.sectionTitle}>Actions rapides</Text>
                    <View style={styles.grid}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/delivery-persons/pool')}
                        >
                            <Ionicons name="map-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Courses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/delivery-persons/activity')}
                        >
                            <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Actives</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() =>
                                router.push(roleActive ? '/delivery-persons/profile' : '/become-delivery')
                            }
                        >
                            <Ionicons name="bicycle-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Profil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/spaces')}
                        >
                            <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
                            <Text style={styles.actionText}>Changer</Text>
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
    heroCard: {
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
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
        minHeight: 72,
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
