import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetOngoingDeliveriesQuery } from '@/store/api/deliveriesApi';
import { useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import { DELIVERY_STATUS_LABELS, DeliveryGeoPoint, getDeliveryPersonRefId } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const parseGeoPoint = (value?: DeliveryGeoPoint | null): { latitude: number; longitude: number } | null => {
    const coordinates = value?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

const parseCoordinateLabel = (value?: string | null): { latitude: number; longitude: number } | null => {
    if (!value?.trim()) return null;
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { latitude, longitude };
};

const getLocationPoint = (
    value: unknown,
    fallbackCoordinates?: DeliveryGeoPoint | null,
): { latitude: number; longitude: number } | null => {
    if (typeof value === 'string') {
        const parsed = parseCoordinateLabel(value);
        if (parsed) return parsed;
    }

    if (value && typeof value === 'object') {
        const asRecord = value as Record<string, unknown>;
        if (Array.isArray(asRecord.coordinates)) {
            const [lng, lat] = asRecord.coordinates;
            const lngNumber = Number(lng);
            const latNumber = Number(lat);
            if (
                Number.isFinite(latNumber) &&
                Number.isFinite(lngNumber) &&
                Math.abs(latNumber) <= 90 &&
                Math.abs(lngNumber) <= 180
            ) {
                return { latitude: latNumber, longitude: lngNumber };
            }
        }
    }

    return parseGeoPoint(fallbackCoordinates);
};

const toCoordinateKey = (point: { latitude: number; longitude: number }): string =>
    `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;

const coordinatesToLabel = (value?: DeliveryGeoPoint | null): string => {
    const point = parseGeoPoint(value);
    if (!point) return '';
    return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
};

const formatLocationLabel = (
    value: unknown,
    fallbackCoordinates?: DeliveryGeoPoint | null,
    fallback = 'Adresse indisponible',
): string => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }

    if (value && typeof value === 'object') {
        const asRecord = value as Record<string, unknown>;
        const addressCandidate =
            (typeof asRecord.address === 'string' && asRecord.address.trim()) ||
            (typeof asRecord.formattedAddress === 'string' && asRecord.formattedAddress.trim()) ||
            (typeof asRecord.label === 'string' && asRecord.label.trim()) ||
            '';
        if (addressCandidate) return addressCandidate;

        if (Array.isArray(asRecord.coordinates)) {
            const [lng, lat] = asRecord.coordinates;
            const lngNumber = Number(lng);
            const latNumber = Number(lat);
            if (
                Number.isFinite(latNumber) &&
                Number.isFinite(lngNumber) &&
                Math.abs(latNumber) <= 90 &&
                Math.abs(lngNumber) <= 180
            ) {
                return `${latNumber.toFixed(5)},${lngNumber.toFixed(5)}`;
            }
        }
    }

    return coordinatesToLabel(fallbackCoordinates) || fallback;
};

export default function DeliveryPersonsActivityTab() {
    const router = useRouter();
    const { isLoading, isAuthenticated, requireAuth } = useAuth();
    const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();
    const [resolvedAddressByKey, setResolvedAddressByKey] = React.useState<Record<string, string>>(
        {},
    );
    const [requestedAddressByKey, setRequestedAddressByKey] = React.useState<Record<string, true>>(
        {},
    );
    const [failedAddressByKey, setFailedAddressByKey] = React.useState<Record<string, true>>({});

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

    const reverseGeocodeTargets = React.useMemo(() => {
        const byKey: Record<string, { latitude: number; longitude: number }> = {};

        for (const delivery of activeDeliveries) {
            const pickupPoint = getLocationPoint(delivery.pickupLocation, delivery.pickupCoordinates);
            const dropoffPoint = getLocationPoint(
                delivery.deliveryLocation,
                delivery.deliveryCoordinates,
            );

            if (pickupPoint) {
                byKey[toCoordinateKey(pickupPoint)] = pickupPoint;
            }
            if (dropoffPoint) {
                byKey[toCoordinateKey(dropoffPoint)] = dropoffPoint;
            }
        }

        return Object.entries(byKey)
            .filter(
                ([key]) =>
                    !resolvedAddressByKey[key] &&
                    !requestedAddressByKey[key] &&
                    !failedAddressByKey[key],
            )
            .map(([key, point]) => ({ key, ...point }));
    }, [activeDeliveries, failedAddressByKey, requestedAddressByKey, resolvedAddressByKey]);

    React.useEffect(() => {
        if (reverseGeocodeTargets.length === 0) return;

        setRequestedAddressByKey((prev) => {
            const next = { ...prev };
            for (const target of reverseGeocodeTargets) {
                next[target.key] = true;
            }
            return next;
        });

        let cancelled = false;
        (async () => {
            for (const target of reverseGeocodeTargets) {
                try {
                    const response = await triggerReverseGeocode({
                        lat: target.latitude,
                        lng: target.longitude,
                        language: 'fr',
                    }).unwrap();
                    if (cancelled) return;

                    const formattedAddress =
                        typeof response?.formattedAddress === 'string'
                            ? response.formattedAddress.trim()
                            : '';

                    if (!formattedAddress) {
                        setFailedAddressByKey((prev) =>
                            prev[target.key] ? prev : { ...prev, [target.key]: true },
                        );
                        continue;
                    }

                    setResolvedAddressByKey((prev) =>
                        prev[target.key]
                            ? prev
                            : { ...prev, [target.key]: formattedAddress },
                    );
                } catch {
                    if (cancelled) return;
                    setFailedAddressByKey((prev) =>
                        prev[target.key] ? prev : { ...prev, [target.key]: true },
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [reverseGeocodeTargets, triggerReverseGeocode]);

    const getResolvedLocationLabel = React.useCallback(
        (
            value: unknown,
            fallbackCoordinates?: DeliveryGeoPoint | null,
            fallback = 'Adresse indisponible',
        ): string => {
            const point = getLocationPoint(value, fallbackCoordinates);
            if (point) {
                const key = toCoordinateKey(point);
                const resolvedAddress = resolvedAddressByKey[key];
                if (resolvedAddress) return resolvedAddress;
                if (failedAddressByKey[key]) return fallback;
                if (requestedAddressByKey[key]) return "Recherche de l'adresse...";
                return "Recherche de l'adresse...";
            }

            return formatLocationLabel(value, fallbackCoordinates, fallback);
        },
        [failedAddressByKey, requestedAddressByKey, resolvedAddressByKey],
    );

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

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
                    activeDeliveries.map((delivery) => {
                        const pickupLabel = getResolvedLocationLabel(
                            delivery.pickupLocation,
                            delivery.pickupCoordinates,
                            'Adresse de retrait indisponible',
                        );
                        const dropoffLabel = getResolvedLocationLabel(
                            delivery.deliveryLocation,
                            delivery.deliveryCoordinates,
                            'Adresse de livraison indisponible',
                        );

                        return (
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
                                <Text style={styles.label}>Retrait</Text>
                                <Text style={styles.value}>{pickupLabel}</Text>
                                <Text style={[styles.label, { marginTop: Spacing.xs }]}>Livraison</Text>
                                <Text style={styles.value}>{dropoffLabel}</Text>
                            </TouchableOpacity>
                        );
                    })
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
