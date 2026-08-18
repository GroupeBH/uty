import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DeliveryRoutePreview } from '@/components/delivery/DeliveryRoutePreview';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import {
    useAcceptDeliveryMutation,
    useGetOngoingDeliveriesQuery,
} from '@/store/api/deliveriesApi';
import { useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import {
    Delivery,
    DeliveryGeoPoint,
    getDeliveryPersonRefId,
    getDeliveryPersonUserId,
} from '@/types/delivery';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DRIVER_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];

const normalizeId = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === 'object') {
        const asObject = value as Record<string, unknown>;
        if (typeof asObject._id === 'string') return asObject._id;
        if (typeof asObject.id === 'string') return asObject.id;
    }
    const asString = (value as any)?.toString?.();
    return typeof asString === 'string' && asString !== '[object Object]' ? asString : null;
};

const parseErrorMessage = (error: any, fallback: string): string => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (Array.isArray(error?.data?.message) && error.data.message.length > 0) {
        return String(error.data.message[0]);
    }
    if (typeof error?.data?.message === 'string') return error.data.message;
    if (typeof error?.data?.error === 'string') return error.data.error;
    if (typeof error?.message === 'string') return error.message;
    return fallback;
};

const extractOrderPayload = (delivery: Delivery): Record<string, any> | null => {
    if (!delivery?.orderId || typeof delivery.orderId !== 'object') {
        return null;
    }
    return delivery.orderId as Record<string, any>;
};

const getOrderCode = (delivery: Delivery): string => {
    const fromOrder = normalizeId((delivery.orderId as any)?._id);
    const fromDelivery = normalizeId(delivery._id);
    return (fromOrder || fromDelivery || '----').slice(-8).toUpperCase();
};

const getItemCount = (delivery: Delivery): number => {
    const orderPayload = extractOrderPayload(delivery);
    if (!Array.isArray(orderPayload?.items)) return 0;
    return orderPayload.items.reduce((sum: number, item: any) => {
        const quantity = Number(item?.quantity || 0);
        return Number.isFinite(quantity) ? sum + quantity : sum;
    }, 0);
};

const getEstimatedEarningsLabel = (delivery: Delivery): string | null => {
    const orderPayload = extractOrderPayload(delivery);
    const candidate =
        Number(orderPayload?.deliveryCost) ||
        Number(orderPayload?.deliveryFee) ||
        Number(orderPayload?.shippingFee);
    if (!Number.isFinite(candidate) || candidate <= 0) {
        return null;
    }
    const currency =
        orderPayload?.currency ||
        orderPayload?.items?.[0]?.productId?.currency ||
        orderPayload?.items?.[0]?.currency ||
        'CDF';
    return formatCurrencyAmount(candidate, currency);
};

const getRouteMetrics = (
    delivery: Delivery,
): { distanceMeters?: number; durationSeconds?: number } => {
    const route = (delivery.route || delivery.calculatedRoute || {}) as Record<string, any>;
    const distanceMeters = Number(
        route.totalDistanceMeters ??
            route.distanceMeters ??
            (Number(route.distanceKm) > 0 ? Number(route.distanceKm) * 1000 : undefined),
    );
    const durationSeconds = Number(
        route.totalDurationSeconds ??
            route.durationSeconds ??
            (Number(route.durationMin) > 0 ? Number(route.durationMin) * 60 : undefined),
    );

    return {
        distanceMeters: Number.isFinite(distanceMeters) && distanceMeters > 0 ? distanceMeters : undefined,
        durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : undefined,
    };
};

const formatDistance = (meters?: number): string => {
    if (!Number.isFinite(meters || 0) || !meters || meters <= 0) return '--';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds?: number): string => {
    if (!Number.isFinite(seconds || 0) || !seconds || seconds <= 0) return '--';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return remain > 0 ? `${hours} h ${remain} min` : `${hours} h`;
};

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

type DriverDeliveriesPoolScreenProps = {
    showBackButton?: boolean;
};

export default function DriverDeliveriesPoolScreen({
    showBackButton = true,
}: DriverDeliveriesPoolScreenProps) {
    const router = useRouter();
    const { user, requireAuth } = useAuth();
    const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();
    const [acceptDelivery, { isLoading: isAcceptingAny }] = useAcceptDeliveryMutation();
    const [acceptingId, setAcceptingId] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [resolvedAddressByKey, setResolvedAddressByKey] = React.useState<Record<string, string>>(
        {},
    );
    const [requestedAddressByKey, setRequestedAddressByKey] = React.useState<Record<string, true>>(
        {},
    );
    const [failedAddressByKey, setFailedAddressByKey] = React.useState<Record<string, true>>({});

    React.useEffect(() => {
        requireAuth('Vous devez etre connecte pour voir les livraisons disponibles.');
    }, [requireAuth]);

    const hasDriverRole = Boolean(
        user?.roles?.some((role) => DRIVER_ROLE_KEYS.includes((role || '').toLowerCase())),
    );
    const currentUserId = normalizeId(user?._id);

    const { data: deliveryProfile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !hasDriverRole || !currentUserId,
    });
    const myDeliveryPersonId = normalizeId(deliveryProfile?._id);

    const {
        data: deliveries = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetOngoingDeliveriesQuery(undefined, {
        skip: !hasDriverRole || !currentUserId,
        pollingInterval: 15000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    const sortedDeliveries = React.useMemo(
        () =>
            [...deliveries].sort((a, b) => {
                const dateA = new Date((a as any).requestedAt || a.createdAt || 0).getTime();
                const dateB = new Date((b as any).requestedAt || b.createdAt || 0).getTime();
                return dateB - dateA;
            }),
        [deliveries],
    );

    const availableDeliveries = React.useMemo(
        () =>
            sortedDeliveries.filter((delivery) => {
                const assignedDeliveryPerson = getDeliveryPersonRefId(delivery.deliveryPersonId);
                return delivery.status === 'pending' && !assignedDeliveryPerson;
            }),
        [sortedDeliveries],
    );

    const myOngoingDeliveries = React.useMemo(
        () =>
            sortedDeliveries.filter((delivery) => {
                if (['delivered', 'failed', 'cancelled'].includes(delivery.status)) {
                    return false;
                }
                const assignedDeliveryPerson = getDeliveryPersonRefId(delivery.deliveryPersonId);
                const assignedUserId = getDeliveryPersonUserId(delivery.deliveryPersonId);
                if (assignedUserId && currentUserId && assignedUserId === currentUserId) {
                    return true;
                }
                if (myDeliveryPersonId && assignedDeliveryPerson === myDeliveryPersonId) {
                    return true;
                }
                return false;
            }),
        [currentUserId, myDeliveryPersonId, sortedDeliveries],
    );

    const reverseGeocodeTargets = React.useMemo(() => {
        const candidates = [...myOngoingDeliveries, ...availableDeliveries];
        const byKey: Record<string, { latitude: number; longitude: number }> = {};

        for (const delivery of candidates) {
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
    }, [
        availableDeliveries,
        failedAddressByKey,
        myOngoingDeliveries,
        requestedAddressByKey,
        resolvedAddressByKey,
    ]);

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

    const onAccept = async (deliveryId: string) => {
        if (!deliveryId) return;
        try {
            setAcceptingId(deliveryId);
            await acceptDelivery(deliveryId).unwrap();
            router.push(`/delivery/deliver-persons/${deliveryId}` as any);
        } catch (error: any) {
            setErrorMessage(
                parseErrorMessage(
                    error,
                    'Impossible de prendre cette livraison. Verifiez si elle est toujours disponible.',
                ),
            );
            await refetch();
        } finally {
            setAcceptingId(null);
        }
    };

    if (!currentUserId) {
        return <LoadingSpinner fullScreen />;
    }

    if (!hasDriverRole) {
        return (
            <SafeAreaView style={styles.emptyRoleContainer} edges={['top', 'bottom']}>
                <ScrollView
                    contentContainerStyle={styles.emptyRoleContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.emptyRoleIcon}>
                        <Ionicons name="bicycle-outline" size={38} color={Colors.primary} />
                    </View>
                    <Text style={styles.emptyRoleTitle}>
                        Veuillez completer vos informations pour devenir livreur
                    </Text>
                    <Text style={styles.emptyRoleText}>
                        Avant de voir et d accepter des livraisons, nous devons verifier votre
                        identite et votre moyen de transport, si vous en avez un.
                    </Text>

                    <View style={styles.requirementsCard}>
                        <View style={styles.requirementRow}>
                            <View style={styles.requirementIcon}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.requirementCopy}>
                                <Text style={styles.requirementTitle}>Verifier votre identite</Text>
                                <Text style={styles.requirementText}>
                                    Completez la verification KYC pour securiser les livraisons.
                                </Text>
                            </View>
                        </View>
                        <View style={styles.requirementRow}>
                            <View style={styles.requirementIcon}>
                                <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.requirementCopy}>
                                <Text style={styles.requirementTitle}>Ajouter une photo</Text>
                                <Text style={styles.requirementText}>
                                    Fournissez une photo de profil claire pour confirmer votre identite.
                                </Text>
                            </View>
                        </View>
                        <View style={styles.requirementRow}>
                            <View style={styles.requirementIcon}>
                                <Ionicons name="car-outline" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.requirementCopy}>
                                <Text style={styles.requirementTitle}>Indiquer votre moyen de transport</Text>
                                <Text style={styles.requirementText}>
                                    Le vehicule est facultatif. Vous pouvez aussi livrer sans vehicule.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.emptyRoleNote}>
                        Une fois ces informations validees, vous pourrez consulter et accepter les
                        livraisons disponibles.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/become-delivery')}
                    >
                        <Text style={styles.primaryButtonText}>Completer mes informations</Text>
                        <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.homeButton}
                        onPress={() => router.replace('/(tabs)' as any)}
                    >
                        <Ionicons name="home-outline" size={18} color={Colors.primary} />
                        <Text style={styles.homeButtonText}>Revenir a l accueil</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                {showBackButton ? (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
                <View style={styles.headerBody}>
                    <Text style={styles.headerTitle}>Livraisons disponibles</Text>
                    <Text style={styles.headerSubtitle}>
                        {availableDeliveries.length} a prendre maintenant
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => refetch()}
                    disabled={isFetching}
                >
                    <Ionicons
                        name={isFetching ? 'hourglass-outline' : 'refresh-outline'}
                        size={18}
                        color={Colors.primary}
                    />
                </TouchableOpacity>
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
            >
                {myOngoingDeliveries.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mes livraisons en cours</Text>
                        {myOngoingDeliveries.map((delivery) => {
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
                                <DeliveryRoutePreview
                                    key={`mine-${delivery._id}`}
                                    code={`#${getOrderCode(delivery)}`}
                                    pickupLabel={pickupLabel}
                                    dropoffLabel={dropoffLabel}
                                    status={delivery.status}
                                    workflow={delivery.workflow}
                                    actionLabel="Continuer la course"
                                    onPress={() =>
                                        router.push(`/delivery/deliver-persons/${delivery._id}` as any)
                                    }
                                />
                            );
                        })}
                    </View>
                ) : null}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>A prendre maintenant</Text>
                    {availableDeliveries.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="checkmark-done-circle-outline" size={24} color={Colors.success} />
                            <Text style={styles.emptyCardTitle}>Aucune livraison en attente</Text>
                            <Text style={styles.emptyCardText}>
                                Revenez dans un instant ou utilisez actualiser.
                            </Text>
                        </View>
                    ) : (
                        availableDeliveries.map((delivery) => {
                            const route = getRouteMetrics(delivery);
                            const earningsLabel = getEstimatedEarningsLabel(delivery);
                            const itemCount = getItemCount(delivery);
                            const isTaking = acceptingId === delivery._id;
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
                                <View key={delivery._id} style={styles.deliveryCard}>
                                    <View style={styles.cardTopRow}>
                                        <Text style={styles.cardCode}>#{getOrderCode(delivery)}</Text>
                                        <Text style={styles.pendingChip}>En attente</Text>
                                    </View>

                                    <View style={styles.metricRow}>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Distance</Text>
                                            <Text style={styles.metricValue}>
                                                {formatDistance(route.distanceMeters)}
                                            </Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Duree</Text>
                                            <Text style={styles.metricValue}>
                                                {formatDuration(route.durationSeconds)}
                                            </Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricLabel}>Articles</Text>
                                            <Text style={styles.metricValue}>{itemCount || '-'}</Text>
                                        </View>
                                    </View>

                                    {earningsLabel ? (
                                        <Text style={styles.earningText}>Gain estime: {earningsLabel}</Text>
                                    ) : null}

                                    <View style={styles.locationsWrap}>
                                        <View style={styles.locationRow}>
                                            <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                                            <Text style={styles.locationText} numberOfLines={2}>
                                                {pickupLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-outline" size={16} color={Colors.accentDark} />
                                            <Text style={styles.locationText} numberOfLines={2}>
                                                {dropoffLabel}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={() =>
                                                router.push(`/delivery/deliver-persons/${delivery._id}` as any)
                                            }
                                        >
                                            <Text style={styles.secondaryButtonText}>Voir</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.acceptButton,
                                                (isTaking || isAcceptingAny) && styles.acceptButtonDisabled,
                                            ]}
                                            onPress={() => void onAccept(delivery._id)}
                                            disabled={isTaking || isAcceptingAny}
                                        >
                                            <Text style={styles.acceptButtonText}>
                                                {isTaking ? 'Prise en cours...' : 'Accepter'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {errorMessage ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage('')}>
                        <Ionicons name="close" size={16} color={Colors.white} />
                    </TouchableOpacity>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
    },
    headerSpacer: {
        width: 34,
        height: 34,
    },
    refreshButton: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
    },
    headerBody: {
        flex: 1,
        paddingHorizontal: Spacing.sm,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.massive,
        gap: Spacing.md,
    },
    section: {
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    deliveryCard: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardCode: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    pendingChip: {
        fontSize: Typography.fontSize.xs,
        color: Colors.warning,
        fontWeight: Typography.fontWeight.bold,
        backgroundColor: Colors.warning + '16',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    metricRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    metricItem: {
        flex: 1,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.gray50,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
    },
    metricLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    earningText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.success,
        fontWeight: Typography.fontWeight.bold,
    },
    locationsWrap: {
        marginTop: Spacing.sm,
        gap: Spacing.xs,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
    },
    locationText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray700,
        lineHeight: 18,
    },
    actionsRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    secondaryButton: {
        flex: 1,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '44',
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '0E',
    },
    secondaryButtonText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    acceptButton: {
        flex: 1.2,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },
    acceptButtonDisabled: {
        opacity: 0.7,
    },
    acceptButtonText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyCard: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCardTitle: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.base,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyCardText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        textAlign: 'center',
    },
    errorBanner: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.error,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    errorText: {
        flex: 1,
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
    },
    emptyRoleContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    emptyRoleContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxl,
    },
    emptyRoleIcon: {
        width: 76,
        height: 76,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '12',
    },
    emptyRoleTitle: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.xl,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },
    emptyRoleText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        textAlign: 'center',
        lineHeight: 20,
    },
    requirementsCard: {
        width: '100%',
        marginTop: Spacing.xl,
        padding: Spacing.lg,
        gap: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    requirementIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
    },
    requirementCopy: {
        flex: 1,
    },
    requirementTitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    requirementText: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        lineHeight: 18,
    },
    emptyRoleNote: {
        marginTop: Spacing.lg,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        textAlign: 'center',
        lineHeight: 19,
    },
    primaryButton: {
        marginTop: Spacing.lg,
        width: '100%',
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    homeButton: {
        marginTop: Spacing.sm,
        width: '100%',
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '33',
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
    },
    homeButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
