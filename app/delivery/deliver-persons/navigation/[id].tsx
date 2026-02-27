import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useAcceptDeliveryMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
} from '@/store/api/deliveriesApi';
import { useGetDirectionsMutation } from '@/store/api/googleMapsApi';
import { DELIVERY_STATUS_LABELS, DeliveryGeoPoint, DeliveryStatusValue } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type LatLng = { latitude: number; longitude: number };
type NavStep = {
    instruction: string;
    distance: number;
    duration: number;
    end: LatLng;
};

type QuickAction = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void | Promise<void>;
    loading?: boolean;
    disabled?: boolean;
};
type DirectionsWaypointPayload = {
    address?: string;
    lat?: number;
    lng?: number;
    placeId?: string;
};

const DEFAULT_CENTER: LatLng = { latitude: -4.325, longitude: 15.3222 };

const parseError = (error: any, fallback: string): string =>
    (Array.isArray(error?.data?.message) && String(error.data.message[0])) ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    fallback;

const parseMetric = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value && typeof value === 'object') {
        const asRecord = value as Record<string, unknown>;
        const candidate = Number(asRecord.value ?? asRecord.amount ?? 0);
        return Number.isFinite(candidate) ? candidate : 0;
    }
    const candidate = Number(value);
    return Number.isFinite(candidate) ? candidate : 0;
};

const parseGeoPoint = (value?: DeliveryGeoPoint | null): LatLng | null => {
    const coordinates = value?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

const parseWaypoint = (value: unknown): LatLng | null => {
    if (!value || typeof value !== 'object') return null;
    const asRecord = value as Record<string, unknown>;
    if (Array.isArray(asRecord.coordinates) && asRecord.coordinates.length === 2) {
        const lng = Number(asRecord.coordinates[0]);
        const lat = Number(asRecord.coordinates[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return { latitude: lat, longitude: lng };
        }
    }
    const lat = Number(asRecord.lat ?? asRecord.latitude);
    const lng = Number(asRecord.lng ?? asRecord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

const parseCoordinateLabel = (value: unknown): LatLng | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) return null;
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { latitude: lat, longitude: lng };
    }
    return parseWaypoint(value);
};

const decodePolyline = (encoded: string): LatLng[] => {
    if (!encoded) return [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    const points: LatLng[] = [];
    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < encoded.length);
        lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
};

const stripHtml = (value?: string): string =>
    (value || 'Continuez tout droit')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();

const haversineMeters = (from: LatLng, to: LatLng): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLng = toRad(to.longitude - from.longitude);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
};

const bearingDegrees = (from: LatLng, to: LatLng): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const toDeg = (x: number) => (x * 180) / Math.PI;
    const dLng = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const formatDistance = (meters: number) => (meters < 1000 ? `${Math.max(Math.round(meters), 0)} m` : `${(meters / 1000).toFixed(1)} km`);

const formatDuration = (seconds: number) => {
    const minutes = Math.max(Math.round(seconds / 60), 0);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
};

const coordinatesToLabel = (value?: DeliveryGeoPoint | null): string => {
    const point = parseGeoPoint(value);
    if (!point) return '';
    return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
};

const formatLocationLabel = (
    value: unknown,
    fallbackCoordinates?: DeliveryGeoPoint | null,
    fallback = '',
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

        const point = parseCoordinateLabel(value);
        if (point) return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
    }

    return coordinatesToLabel(fallbackCoordinates) || fallback;
};

const buildDirectionsWaypoint = (
    point: LatLng | null,
    value: unknown,
): DirectionsWaypointPayload | null => {
    if (point) {
        return { lat: point.latitude, lng: point.longitude };
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const coordinatePoint = parseCoordinateLabel(trimmed);
        if (coordinatePoint) {
            return { lat: coordinatePoint.latitude, lng: coordinatePoint.longitude };
        }
        return { address: trimmed };
    }

    if (value && typeof value === 'object') {
        const asRecord = value as Record<string, unknown>;
        if (typeof asRecord.placeId === 'string' && asRecord.placeId.trim()) {
            return { placeId: asRecord.placeId.trim() };
        }
        const addressCandidate =
            (typeof asRecord.address === 'string' && asRecord.address.trim()) ||
            (typeof asRecord.formattedAddress === 'string' && asRecord.formattedAddress.trim()) ||
            (typeof asRecord.label === 'string' && asRecord.label.trim()) ||
            '';
        if (addressCandidate) {
            return { address: addressCandidate };
        }

        const parsed = parseCoordinateLabel(value);
        if (parsed) {
            return { lat: parsed.latitude, lng: parsed.longitude };
        }
    }

    return null;
};

const iconForInstruction = (instruction?: string): keyof typeof Ionicons.glyphMap => {
    const text = (instruction || '').toLowerCase();
    if (text.includes('gauche')) return 'arrow-back-outline';
    if (text.includes('droite')) return 'arrow-forward-outline';
    if (text.includes('demi-tour')) return 'reload-outline';
    if (text.includes('rond-point')) return 'git-compare-outline';
    if (text.includes('arrive')) return 'flag-outline';
    return 'arrow-up-outline';
};

export default function DriverNavigationGoScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();
    const { requireAuth } = useAuth();
    const mapRef = React.useRef<MapView | null>(null);
    const insets = useSafeAreaInsets();
    const topOverlayOffset = React.useMemo(
        () => Spacing.sm + Math.max(insets.top, 8),
        [insets.top],
    );
    const bottomOverlayOffset = React.useMemo(
        () => Spacing.lg + Math.max(insets.bottom, 14),
        [insets.bottom],
    );
    const routingBadgeBottom = React.useMemo(
        () => bottomOverlayOffset + 72,
        [bottomOverlayOffset],
    );

    const [fetchDirections, { isLoading: isRouting }] = useGetDirectionsMutation();
    const [acceptDelivery, { isLoading: isAccepting }] = useAcceptDeliveryMutation();
    const [arrivePickup, { isLoading: isArrivingPickup }] = useDriverArrivePickupMutation();
    const [arriveDropoff, { isLoading: isArrivingDropoff }] = useDriverArriveDropoffMutation();

    const { data: delivery, isLoading } = useGetDeliveryQuery(deliveryId, { skip: !deliveryId });
    const { data: tracking } = useGetDeliveryTrackingQuery(deliveryId, { skip: !deliveryId, pollingInterval: 4000 });

    const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);
    const [routeSteps, setRouteSteps] = React.useState<NavStep[]>([]);
    const [distanceMeters, setDistanceMeters] = React.useState(0);
    const [durationSeconds, setDurationSeconds] = React.useState(0);
    const [activeStepIndex, setActiveStepIndex] = React.useState(0);
    const [isFollowing, setIsFollowing] = React.useState(true);
    const [showSteps, setShowSteps] = React.useState(false);
    const [shouldTrackMarkerViews, setShouldTrackMarkerViews] = React.useState(true);

    React.useEffect(() => {
        requireAuth('Vous devez etre connecte pour ouvrir la navigation.');
    }, [requireAuth]);

    React.useEffect(() => {
        const timeout = setTimeout(() => setShouldTrackMarkerViews(false), 700);
        return () => clearTimeout(timeout);
    }, []);

    const status = (tracking?.status || delivery?.status || 'pending') as DeliveryStatusValue;
    const pickupCoordinatesSource = (tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined;
    const dropoffCoordinatesSource = (tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined;
    const currentLocationSource = tracking?.currentLocation || delivery?.currentLocation;
    const pickupLocationSource = tracking?.pickupLocation ?? delivery?.pickupLocation;
    const dropoffLocationSource = tracking?.deliveryLocation ?? delivery?.deliveryLocation;
    const pickupPoint = React.useMemo(
        () => parseGeoPoint(pickupCoordinatesSource) || parseCoordinateLabel(pickupLocationSource),
        [pickupCoordinatesSource, pickupLocationSource],
    );
    const dropoffPoint = React.useMemo(
        () => parseGeoPoint(dropoffCoordinatesSource) || parseCoordinateLabel(dropoffLocationSource),
        [dropoffCoordinatesSource, dropoffLocationSource],
    );
    const driverPoint = React.useMemo(
        () => parseGeoPoint(currentLocationSource as DeliveryGeoPoint | null | undefined),
        [currentLocationSource],
    );
    const mapCenter = React.useMemo(
        () => driverPoint || pickupPoint || dropoffPoint || DEFAULT_CENTER,
        [driverPoint, dropoffPoint, pickupPoint],
    );

    const headingToPickup = ['pending', 'assigned', 'at_pickup'].includes(status);
    const headingToDropoff = ['picked_up', 'in_transit', 'at_dropoff', 'delivered'].includes(status);
    const routeOriginPoint = React.useMemo(
        () =>
            headingToPickup
                ? (driverPoint || pickupPoint)
                : headingToDropoff
                    ? (pickupPoint || driverPoint)
                    : (driverPoint || pickupPoint || dropoffPoint),
        [driverPoint, dropoffPoint, headingToDropoff, headingToPickup, pickupPoint],
    );
    const routeDestinationPoint = React.useMemo(
        () =>
            headingToPickup
                ? pickupPoint
                : headingToDropoff
                    ? dropoffPoint
                    : dropoffPoint,
        [dropoffPoint, headingToDropoff, headingToPickup, pickupPoint],
    );
    const targetPoint = routeDestinationPoint;

    const pickupLabel = formatLocationLabel(pickupLocationSource, pickupCoordinatesSource, 'Point de retrait');
    const dropoffLabel = formatLocationLabel(dropoffLocationSource, dropoffCoordinatesSource, 'Point de livraison');
    const targetLabel = headingToPickup ? pickupLabel : dropoffLabel;
    const originPoint = routeOriginPoint || null;
    const routeOriginWaypoint = React.useMemo(
        () =>
            buildDirectionsWaypoint(
                routeOriginPoint || null,
                headingToPickup ? currentLocationSource : pickupLocationSource,
            ),
        [currentLocationSource, headingToPickup, pickupLocationSource, routeOriginPoint],
    );
    const routeDestinationWaypoint = React.useMemo(
        () =>
            buildDirectionsWaypoint(
                routeDestinationPoint || null,
                headingToPickup ? pickupLocationSource : dropoffLocationSource,
            ),
        [dropoffLocationSource, headingToPickup, pickupLocationSource, routeDestinationPoint],
    );
    const fallbackPathPoints = React.useMemo(
        () => (originPoint && targetPoint ? [originPoint, targetPoint] : []),
        [originPoint, targetPoint],
    );

    React.useEffect(() => {
        if (!routeOriginWaypoint || !routeDestinationWaypoint) return;
        let cancelled = false;
        const timeout = setTimeout(async () => {
            try {
                const response = await fetchDirections({
                    origin: routeOriginWaypoint,
                    destination: routeDestinationWaypoint,
                    language: 'fr',
                }).unwrap();
                if (cancelled) return;
                const route = response?.routes?.[0] as any;
                const polyline =
                    (typeof route?.overviewPolyline === 'string' && route.overviewPolyline) ||
                    (typeof route?.polyline === 'string' && route.polyline) ||
                    (typeof route?.polyline?.points === 'string' && route.polyline.points) ||
                    (typeof route?.overview_polyline?.points === 'string' && route.overview_polyline.points) ||
                    '';
                const decoded = decodePolyline(polyline);
                const legs = Array.isArray(route?.legs) ? route.legs : [];
                const steps = legs.flatMap((leg: any) => (Array.isArray(leg?.steps) ? leg.steps : []));
                const mappedSteps: NavStep[] = steps
                    .map((step: any) => {
                        const end = parseWaypoint(step?.endLocation || step?.end_location || step?.end);
                        if (!end) return null;
                        return {
                            instruction: stripHtml(step?.htmlInstructions || step?.html_instructions || step?.instruction),
                            distance: parseMetric(step?.distance ?? step?.distanceMeters),
                            duration: parseMetric(step?.duration ?? step?.durationSeconds),
                            end,
                        };
                    })
                    .filter((item: NavStep | null): item is NavStep => Boolean(item));
                setRouteSteps(mappedSteps);
                setRouteCoordinates(decoded.length >= 2 ? decoded : fallbackPathPoints);
                setDistanceMeters(legs.reduce((sum: number, leg: any) => sum + parseMetric(leg?.distance), 0));
                setDurationSeconds(legs.reduce((sum: number, leg: any) => sum + parseMetric(leg?.duration), 0));
                setActiveStepIndex(0);
            } catch {
                if (cancelled) return;
                setRouteCoordinates(fallbackPathPoints);
                setRouteSteps([]);
                setDistanceMeters(originPoint && targetPoint ? haversineMeters(originPoint, targetPoint) : 0);
                setDurationSeconds(0);
                setActiveStepIndex(0);
            }
        }, 320);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [fallbackPathPoints, fetchDirections, originPoint, routeDestinationWaypoint, routeOriginWaypoint, targetPoint]);

    React.useEffect(() => {
        if (!driverPoint || routeSteps.length === 0) return;
        setActiveStepIndex((previous) => {
            let next = Math.min(previous, routeSteps.length - 1);
            while (next < routeSteps.length - 1 && haversineMeters(driverPoint, routeSteps[next].end) <= 35) {
                next += 1;
            }
            return next;
        });
    }, [driverPoint, routeSteps]);

    React.useEffect(() => {
        if (!isFollowing || !driverPoint || !mapRef.current) return;
        const nextTarget = routeSteps[activeStepIndex]?.end || targetPoint;
        const heading = nextTarget ? bearingDegrees(driverPoint, nextTarget) : 0;
        mapRef.current.animateCamera({ center: driverPoint, heading, zoom: 17, pitch: 44 }, { duration: 600 });
    }, [activeStepIndex, driverPoint, isFollowing, routeSteps, targetPoint]);

    React.useEffect(() => {
        if (!mapRef.current || driverPoint || routeCoordinates.length < 2) return;
        mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 180, right: 80, bottom: 200, left: 80 },
            animated: true,
        });
    }, [driverPoint, routeCoordinates]);

    const recenterMap = () => {
        if (!mapRef.current || !targetPoint) return;
        setIsFollowing(true);
        if (driverPoint) {
            const nextTarget = routeSteps[activeStepIndex]?.end || targetPoint;
            const heading = nextTarget ? bearingDegrees(driverPoint, nextTarget) : 0;
            mapRef.current.animateCamera({ center: driverPoint, heading, zoom: 17, pitch: 44 }, { duration: 550 });
            return;
        }
        mapRef.current.fitToCoordinates([targetPoint], {
            edgePadding: { top: 160, right: 80, bottom: 200, left: 80 },
            animated: true,
        });
    };

    const openExternalNavigation = async () => {
        if (!targetPoint) return;
        const destination = `${targetPoint.latitude},${targetPoint.longitude}`;
        const origin = driverPoint ? `${driverPoint.latitude},${driverPoint.longitude}` : undefined;
        const googleUrl =
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` +
            `${origin ? `&origin=${encodeURIComponent(origin)}` : ''}` +
            '&travelmode=driving';
        const appleUrl =
            `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}` +
            `${origin ? `&saddr=${encodeURIComponent(origin)}` : ''}` +
            '&dirflg=d';
        const url = Platform.OS === 'ios' ? appleUrl : googleUrl;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
        } catch {
            // Keep in-app navigation as fallback.
        }
    };

    const runQuickMutation = React.useCallback(async (executor: () => Promise<unknown>, successMessage: string) => {
        try {
            await executor();
            Alert.alert('Succes', successMessage);
        } catch (error: any) {
            Alert.alert('Action impossible', parseError(error, 'Veuillez reessayer.'));
        }
    }, []);

    const openDeliveryDetails = React.useCallback(() => {
        if (!deliveryId) return;
        router.push(`/delivery/deliver-persons/${deliveryId}`);
    }, [deliveryId, router]);

    const handleAcceptDelivery = React.useCallback(async () => {
        if (!deliveryId) return;
        await runQuickMutation(
            () => acceptDelivery(deliveryId).unwrap(),
            'Course acceptee. Le vendeur est maintenant informe.',
        );
    }, [acceptDelivery, deliveryId, runQuickMutation]);

    const handleArrivePickup = React.useCallback(async () => {
        if (!deliveryId) return;
        await runQuickMutation(
            () => arrivePickup(deliveryId).unwrap(),
            'Arrivee signalee au point de retrait.',
        );
    }, [arrivePickup, deliveryId, runQuickMutation]);

    const handleArriveDropoff = React.useCallback(async () => {
        if (!deliveryId) return;
        await runQuickMutation(
            () => arriveDropoff(deliveryId).unwrap(),
            'Arrivee signalee au point de livraison.',
        );
    }, [arriveDropoff, deliveryId, runQuickMutation]);

    const primaryAction = React.useMemo<QuickAction>(() => {
        if (status === 'pending') {
            return {
                label: 'Accepter la course',
                icon: 'checkmark-circle-outline',
                onPress: handleAcceptDelivery,
                loading: isAccepting,
            };
        }
        if (status === 'assigned') {
            return {
                label: 'Signaler arrivee retrait',
                icon: 'storefront-outline',
                onPress: handleArrivePickup,
                loading: isArrivingPickup,
            };
        }
        if (status === 'at_pickup') {
            return {
                label: 'Scanner QR retrait',
                icon: 'qr-code-outline',
                onPress: openDeliveryDetails,
            };
        }
        if (status === 'picked_up' || status === 'in_transit') {
            return {
                label: 'Signaler arrivee livraison',
                icon: 'flag-outline',
                onPress: handleArriveDropoff,
                loading: isArrivingDropoff,
            };
        }
        if (status === 'at_dropoff') {
            return {
                label: 'Afficher QR livraison',
                icon: 'qr-code',
                onPress: openDeliveryDetails,
            };
        }
        if (status === 'delivered') {
            return {
                label: 'Livraison terminee',
                icon: 'checkmark-done-outline',
                onPress: openDeliveryDetails,
                disabled: true,
            };
        }
        return {
            label: 'Voir les details',
            icon: 'document-text-outline',
            onPress: openDeliveryDetails,
        };
    }, [
        handleAcceptDelivery,
        handleArriveDropoff,
        handleArrivePickup,
        isAccepting,
        isArrivingDropoff,
        isArrivingPickup,
        openDeliveryDetails,
        status,
    ]);

    const activeInstruction = routeSteps[activeStepIndex];
    const nextSteps = routeSteps.slice(activeStepIndex + 1, activeStepIndex + 6);

    const nextTurnDistance = React.useMemo(() => {
        if (!activeInstruction) return 0;
        if (!driverPoint) return activeInstruction.distance;
        return haversineMeters(driverPoint, activeInstruction.end);
    }, [activeInstruction, driverPoint]);

    const remainingMetrics = React.useMemo(() => {
        if (routeSteps.length === 0) {
            return { distance: distanceMeters, duration: durationSeconds };
        }
        const current = routeSteps[Math.min(activeStepIndex, routeSteps.length - 1)];
        const remainingTail = routeSteps.slice(activeStepIndex + 1);
        const tailDistance = remainingTail.reduce((sum, step) => sum + step.distance, 0);
        const tailDuration = remainingTail.reduce((sum, step) => sum + step.duration, 0);
        const currentDistance = current
            ? driverPoint
                ? Math.min(Math.max(haversineMeters(driverPoint, current.end), 0), Math.max(current.distance, 1))
                : current.distance
            : 0;
        const currentDuration = current
            ? current.distance > 0
                ? (current.duration * currentDistance) / current.distance
                : current.duration
            : 0;

        return {
            distance: Math.max(currentDistance + tailDistance, 0),
            duration: Math.max(currentDuration + tailDuration, 0),
        };
    }, [activeStepIndex, distanceMeters, driverPoint, durationSeconds, routeSteps]);

    const guidanceLead = activeInstruction
        ? nextTurnDistance <= 45
            ? 'Tournez maintenant'
            : `Dans ${formatDistance(nextTurnDistance)}`
        : 'Suivez la route';
    const guidanceInstruction = activeInstruction?.instruction || 'Continuez vers la destination.';
    const routeStatusLabel = DELIVERY_STATUS_LABELS[status] || status;
    const headingChip = headingToPickup ? 'Cap sur retrait' : 'Cap sur livraison';

    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;

    if (!delivery) {
        return (
            <SafeAreaView style={styles.empty} edges={['top', 'bottom']}>
                <Text style={styles.emptyTitle}>Livraison introuvable</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Retour</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const primaryBusy = Boolean(primaryAction.loading);
    const primaryDisabled = Boolean(primaryAction.disabled || primaryBusy);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <MapView
                ref={mapRef}
                style={styles.map}
                {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                initialRegion={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
                onPanDrag={() => setIsFollowing(false)}
            >
                {pickupPoint ? (
                    <Marker coordinate={pickupPoint} tracksViewChanges={shouldTrackMarkerViews} tracksInfoWindowChanges={shouldTrackMarkerViews}>
                        <View style={[styles.marker, { backgroundColor: Colors.accentDark }]}>
                            <Ionicons name="storefront" size={15} color={Colors.white} />
                        </View>
                    </Marker>
                ) : null}
                {dropoffPoint ? (
                    <Marker coordinate={dropoffPoint} tracksViewChanges={shouldTrackMarkerViews} tracksInfoWindowChanges={shouldTrackMarkerViews}>
                        <View style={[styles.marker, { backgroundColor: Colors.success }]}>
                            <Ionicons name="location" size={15} color={Colors.white} />
                        </View>
                    </Marker>
                ) : null}
                {driverPoint ? (
                    <Marker coordinate={driverPoint} tracksViewChanges={shouldTrackMarkerViews} tracksInfoWindowChanges={shouldTrackMarkerViews}>
                        <View style={[styles.marker, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="bicycle" size={15} color={Colors.white} />
                        </View>
                    </Marker>
                ) : null}
                {routeCoordinates.length >= 2 ? (
                    <>
                        <Polyline coordinates={routeCoordinates} strokeColor={Colors.white + 'D9'} strokeWidth={9} />
                        <Polyline coordinates={routeCoordinates} strokeColor={Colors.primary} strokeWidth={4.5} />
                    </>
                ) : null}
            </MapView>

            <LinearGradient colors={[Colors.primaryDark + 'DE', Colors.primaryDark + '0A']} style={styles.topGradient} pointerEvents="none" />

            <View style={[styles.topOverlay, { top: topOverlayOffset }]} pointerEvents="box-none">
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.glassBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.white} />
                    </TouchableOpacity>
                    <View style={styles.modeChip}>
                        <Ionicons name="navigate" size={14} color={Colors.white} />
                        <Text style={styles.modeChipText}>{headingChip}</Text>
                    </View>
                    <TouchableOpacity style={styles.glassBtn} onPress={recenterMap}>
                        <Ionicons name="locate-outline" size={20} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                <View style={styles.guidanceCard}>
                    <View style={styles.guidanceIcon}>
                        <Ionicons name={iconForInstruction(activeInstruction?.instruction)} size={18} color={Colors.white} />
                    </View>
                    <View style={styles.guidanceBody}>
                        <Text style={styles.guidanceLead}>{guidanceLead}</Text>
                        <Text style={styles.guidanceInstruction} numberOfLines={2}>
                            {guidanceInstruction}
                        </Text>
                        <Text style={styles.guidanceMeta}>
                            {formatDuration(remainingMetrics.duration)} - {formatDistance(remainingMetrics.distance)}
                        </Text>
                        <Text style={styles.guidanceSub} numberOfLines={1}>
                            {targetLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.rightRail} pointerEvents="box-none">
                <TouchableOpacity style={styles.railButton} onPress={() => setIsFollowing((previous) => !previous)}>
                    <Ionicons name={isFollowing ? 'radio-button-on-outline' : 'radio-button-off-outline'} size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.railButton} onPress={() => setShowSteps((previous) => !previous)}>
                    <Ionicons name={showSteps ? 'list-circle' : 'list-outline'} size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.railButton} onPress={() => void openExternalNavigation()}>
                    <Ionicons name="compass-outline" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.railButton} onPress={openDeliveryDetails}>
                    <Ionicons name="document-text-outline" size={18} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <View style={[styles.bottomOverlay, { bottom: bottomOverlayOffset }]} pointerEvents="box-none">
                {showSteps ? (
                    <View style={styles.stepsCard}>
                        <View style={styles.stepsHeader}>
                            <Text style={styles.stepsTitle}>Prochaines etapes</Text>
                            <Text style={styles.stepsStatus}>{routeStatusLabel}</Text>
                        </View>
                        <ScrollView style={styles.stepsScroll} showsVerticalScrollIndicator={false}>
                            {(nextSteps.length ? nextSteps : routeSteps.slice(0, 5)).map((step, index) => (
                                <View key={`${step.instruction}-${index}`} style={styles.stepItem}>
                                    <View style={styles.stepDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stepText}>{step.instruction}</Text>
                                        <Text style={styles.stepMeta}>
                                            {formatDistance(step.distance)} - {formatDuration(step.duration)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {routeSteps.length === 0 ? (
                                <Text style={styles.stepsEmpty}>Aucune etape detaillee pour le moment.</Text>
                            ) : null}
                        </ScrollView>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.primaryAction, primaryDisabled && styles.primaryActionDisabled]}
                    onPress={() => void primaryAction.onPress()}
                    disabled={primaryDisabled}
                >
                    <LinearGradient
                        colors={primaryDisabled ? [Colors.gray400, Colors.gray500] : [Colors.accent, Colors.accentDark]}
                        style={styles.primaryActionGradient}
                    >
                        {primaryBusy ? (
                            <ActivityIndicator size="small" color={Colors.primaryDark} />
                        ) : (
                            <Ionicons name={primaryAction.icon} size={18} color={Colors.primaryDark} />
                        )}
                        <Text style={styles.primaryActionText}>{primaryBusy ? 'Traitement...' : primaryAction.label}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {isRouting ? (
                <View style={[styles.routingBadge, { bottom: routingBadgeBottom }]}>
                    <ActivityIndicator size="small" color={Colors.white} />
                    <Text style={styles.routingText}>Mise a jour de l itineraire...</Text>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.primaryDark },
    map: StyleSheet.absoluteFillObject,
    topGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 190 },
    topOverlay: { position: 'absolute', left: Spacing.md, right: Spacing.md, top: Spacing.sm, gap: Spacing.sm },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    glassBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '3C',
        backgroundColor: Colors.primaryDark + '99',
        ...Shadows.md,
    },
    modeChip: {
        height: 36,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.white + '3A',
        backgroundColor: Colors.primaryDark + 'CC',
    },
    modeChipText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.2,
    },
    guidanceCard: {
        minHeight: 102,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.white + '2F',
        backgroundColor: Colors.primaryDark + 'E3',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        ...Shadows.lg,
    },
    guidanceIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    guidanceBody: { flex: 1 },
    guidanceLead: {
        color: Colors.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    guidanceInstruction: {
        marginTop: 2,
        color: Colors.white,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        lineHeight: 20,
    },
    guidanceMeta: {
        marginTop: 4,
        color: Colors.white + 'DA',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    guidanceSub: {
        marginTop: 2,
        color: Colors.white + 'C5',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    rightRail: {
        position: 'absolute',
        right: Spacing.md,
        top: '43%',
        gap: Spacing.sm,
    },
    railButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '40',
        backgroundColor: Colors.primaryDark + 'AE',
        ...Shadows.md,
    },
    bottomOverlay: {
        position: 'absolute',
        left: Spacing.md,
        right: Spacing.md,
        bottom: Spacing.lg,
        gap: Spacing.sm,
    },
    stepsCard: {
        maxHeight: 180,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.white + '3A',
        backgroundColor: Colors.white + 'F5',
        ...Shadows.lg,
    },
    stepsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    stepsTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    stepsStatus: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    stepsScroll: { maxHeight: 132 },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
    stepText: {
        color: Colors.gray700,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    stepMeta: {
        marginTop: 1,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    stepsEmpty: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        paddingVertical: Spacing.sm,
    },
    primaryAction: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        ...Shadows.xl,
    },
    primaryActionDisabled: { opacity: 0.9 },
    primaryActionGradient: {
        minHeight: 54,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    primaryActionText: {
        color: Colors.primaryDark,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    marker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    routingBadge: {
        position: 'absolute',
        alignSelf: 'center',
        bottom: 92,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.white + '2D',
        backgroundColor: Colors.primaryDark + 'D9',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        ...Shadows.md,
    },
    routingText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.primaryDark },
    emptyTitle: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
    backBtn: { borderWidth: 1, borderColor: Colors.white + '40', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    backBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
});
