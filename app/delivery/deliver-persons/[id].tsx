import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QrCodeMatrix } from '@/components/ui/QrCodeMatrix';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useDeliveryStream } from '@/hooks/useDeliveryStream';
import {
    useAcceptDeliveryMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useGenerateDropoffQrMutation,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useScanPickupQrMutation,
} from '@/store/api/deliveriesApi';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetDirectionsMutation, useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import {
    DeliveryGeoPoint,
    DeliveryStatusValue,
    getDeliveryPersonRefId,
} from '@/types/delivery';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Animated,
    Linking,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type LatLng = { latitude: number; longitude: number };

type QrScanConfig = {
    title: string;
    caption: string;
    inputPlaceholder: string;
    action: (qrData: string) => Promise<any>;
};

const UI = {
    bg: Colors.primaryDark,
    card: '#1B4C83',
    border: '#4B7FB8',
    text: Colors.white,
    muted: '#C8DCF5',
    accent: Colors.accent,
    accentDark: Colors.accentDark,
};

const DRIVER_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];
const DEFAULT_MAP_CENTER: LatLng = { latitude: -4.325, longitude: 15.3222 };
const MAP_EXPANDED_HEIGHT = 260;
const MAP_COLLAPSED_HEIGHT = 178;
const STEPS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'assigned', label: 'Assigne', icon: 'person-add-outline' },
    { key: 'at_pickup', label: 'Retrait', icon: 'storefront-outline' },
    { key: 'in_transit', label: 'En route', icon: 'bicycle-outline' },
    { key: 'delivered', label: 'Livre', icon: 'checkmark-circle-outline' },
];
const JOURNEY_GUIDE_STEPS: {
    key: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    {
        key: 'pickup',
        title: '1. Prise en charge de la course',
        description:
            'Le livreur accepte la course, le vendeur est notifie, puis le livreur arrive au point de retrait.',
        icon: 'storefront-outline',
    },
    {
        key: 'transit',
        title: '2. Demarrage et trajet',
        description:
            'Le livreur scanne le QR genere par le vendeur pour recuperer la commande, puis son trajet est suivi en temps reel.',
        icon: 'navigate-outline',
    },
    {
        key: 'dropoff',
        title: '3. Validation de la livraison',
        description:
            'A l arrivee chez l acheteur, le livreur montre son QR de livraison et l acheteur le scanne pour valider.',
        icon: 'qr-code-outline',
    },
];

const getJourneyGuideIndex = (status: DeliveryStatusValue): number => {
    if (status === 'pending' || status === 'assigned') return 0;
    if (status === 'at_pickup' || status === 'picked_up' || status === 'in_transit') return 1;
    if (status === 'at_dropoff' || status === 'delivered') return 2;
    return 0;
};

const parseError = (error: any, fallback: string): string =>
    (Array.isArray(error?.data?.message) && String(error.data.message[0])) ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    fallback;

const parseGeoPoint = (value?: DeliveryGeoPoint | null): LatLng | null => {
    const coordinates = value?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
};

const parseCoordinateLabel = (value?: string | null): LatLng | null => {
    if (!value?.trim()) return null;
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

const coordinatesToLabel = (value?: DeliveryGeoPoint | null): string => {
    const point = parseGeoPoint(value);
    if (!point) return '';
    return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
};

const decodePolyline = (encoded: string): LatLng[] => {
    if (!encoded) return [];

    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    const coordinates: LatLng[] = [];

    while (index < len) {
        let shift = 0;
        let result = 0;
        let byte = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < len);
        const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20 && index < len);
        const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return coordinates;
};

const parseNumeric = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return (
            parseNumeric(record.value) ??
            parseNumeric(record.amount) ??
            parseNumeric(record.meters) ??
            parseNumeric(record.seconds)
        );
    }

    return null;
};

const parseRoutePoint = (value: unknown): LatLng | null => {
    if (Array.isArray(value) && value.length >= 2) {
        const first = parseNumeric(value[0]);
        const second = parseNumeric(value[1]);
        if (first === null || second === null) return null;

        // Default GeoJSON [lng, lat], fallback to [lat, lng] when obvious.
        let lng = first;
        let lat = second;
        if (Math.abs(first) <= 90 && Math.abs(second) > 90 && Math.abs(second) <= 180) {
            lat = first;
            lng = second;
        }
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { latitude: lat, longitude: lng };
    }

    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.coordinates)) {
        return parseRoutePoint(record.coordinates);
    }

    const lat = parseNumeric(record.latitude ?? record.lat);
    const lng = parseNumeric(record.longitude ?? record.lng ?? record.lon ?? record.long);
    if (lat === null || lng === null) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

const parseRouteCoordinates = (value: unknown): LatLng[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => parseRoutePoint(item))
        .filter((item): item is LatLng => Boolean(item));
};

const sumLegMetric = (legs: unknown, key: 'distance' | 'duration'): number => {
    if (!Array.isArray(legs)) return 0;
    return legs.reduce((sum, leg) => {
        if (!leg || typeof leg !== 'object') return sum;
        const record = leg as Record<string, unknown>;
        const value =
            key === 'distance'
                ? parseNumeric(record.distanceMeters ?? record.distance)
                : parseNumeric(record.durationSeconds ?? record.duration);
        return sum + Math.max(value ?? 0, 0);
    }, 0);
};

const parseDirectionsRoute = (
    payload: unknown,
): { coordinates: LatLng[]; distanceMeters: number; durationSeconds: number } | null => {
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;

    const coordinates = parseRouteCoordinates(
        record.coordinates ??
        record.routeCoordinates ??
        record.path ??
        record.routePath ??
        record.points ??
        record.overviewPath ??
        record.overview_path,
    );
    const polylineCandidate =
        record.overviewPolyline ??
        (record.overview_polyline as Record<string, unknown> | undefined)?.points ??
        record.encodedPolyline ??
        record.routePolyline ??
        (typeof record.polyline === 'string'
            ? record.polyline
            : (record.polyline as Record<string, unknown> | undefined)?.points);
    const decodedPolyline =
        typeof polylineCandidate === 'string' ? decodePolyline(polylineCandidate) : [];
    const normalizedCoordinates =
        coordinates.length >= 2 ? coordinates : decodedPolyline.length >= 2 ? decodedPolyline : [];

    const distanceMeters =
        Math.max(
            parseNumeric(
                record.totalDistanceMeters ??
                record.distanceMeters ??
                record.routeDistanceMeters ??
                record.distance,
            ) ?? sumLegMetric(record.legs, 'distance'),
            0,
        ) || 0;

    const durationSeconds =
        Math.max(
            parseNumeric(
                record.totalDurationSeconds ??
                record.durationSeconds ??
                record.routeDurationSeconds ??
                record.duration,
            ) ?? sumLegMetric(record.legs, 'duration'),
            0,
        ) || 0;

    return {
        coordinates: normalizedCoordinates,
        distanceMeters,
        durationSeconds,
    };
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

const statusLabel = (status: DeliveryStatusValue): string => {
    if (status === 'pending') return 'En attente de livreur';
    if (status === 'assigned') return 'Assignee';
    if (status === 'at_pickup') return 'Au point de retrait';
    if (status === 'picked_up' || status === 'in_transit') return 'En route';
    if (status === 'at_dropoff') return 'Arrive a destination';
    if (status === 'delivered') return 'Livree';
    if (status === 'failed') return 'Echouee';
    if (status === 'cancelled') return 'Annulee';
    return 'En attente';
};

const stepIndex = (status: DeliveryStatusValue): number => {
    if (status === 'assigned') return 1;
    if (status === 'at_pickup') return 2;
    if (status === 'picked_up' || status === 'in_transit' || status === 'at_dropoff') return 3;
    if (status === 'delivered') return 4;
    return 0;
};

const formatDistance = (meters: number): string => {
    if (!Number.isFinite(meters) || meters <= 0) return '--';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '--';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return remain ? `${hours}h ${remain}m` : `${hours}h`;
};

const normalizePhone = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const openPhoneCall = async (phone: string | null, label: string) => {
    if (!phone) {
        Alert.alert('Contact indisponible', `Aucun numero ${label} disponible.`);
        return;
    }
    const telUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (!canOpen) {
        Alert.alert('Erreur', `Impossible d'appeler le ${label}.`);
        return;
    }
    await Linking.openURL(telUrl);
};

export default function DriverDeliveryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();
    const { user, isAuthenticated, requireAuth } = useAuth();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        requireAuth('Vous devez etre connecte pour suivre une livraison.');
    }, [requireAuth]);

    const hasDriverRole = Boolean(
        user?.roles?.some((role) => DRIVER_ROLE_KEYS.includes((role || '').toLowerCase())),
    );

    const { data: delivery, isLoading, refetch: refetchDelivery } = useGetDeliveryQuery(deliveryId, {
        skip: !deliveryId,
    });
    const { data: tracking, refetch: refetchTracking } = useGetDeliveryTrackingQuery(deliveryId, {
        skip: !deliveryId,
    });
    const { data: deliveryProfile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !hasDriverRole,
    });

    const [acceptDelivery, { isLoading: isAccepting }] = useAcceptDeliveryMutation();
    const [driverArrivePickup, { isLoading: isArrivingPickup }] = useDriverArrivePickupMutation();
    const [scanPickupQr, { isLoading: isScanningPickupQr }] = useScanPickupQrMutation();
    const [driverArriveDropoff, { isLoading: isArrivingDropoff }] = useDriverArriveDropoffMutation();
    const [generateDropoffQr, { isLoading: isGeneratingDropoffQr }] = useGenerateDropoffQrMutation();
    const [fetchDirections, { isLoading: isRouting }] = useGetDirectionsMutation();
    const [triggerReverseGeocode, { isFetching: isResolvingAddresses }] = useLazyReverseGeocodeQuery();


    const [qrModalVisible, setQrModalVisible] = React.useState(false);
    const [qrMode, setQrMode] = React.useState<'scan' | 'display'>('scan');
    const [qrTitle, setQrTitle] = React.useState('Verification QR');
    const [qrCaption, setQrCaption] = React.useState('Scannez puis validez le QR.');
    const [qrInput, setQrInput] = React.useState('');
    const [qrInputPlaceholder, setQrInputPlaceholder] = React.useState('Code QR');
    const [qrDisplayToken, setQrDisplayToken] = React.useState('');
    const [qrAction, setQrAction] = React.useState<null | ((qrData: string) => Promise<any>)>(null);
    const [journeyModalVisible, setJourneyModalVisible] = React.useState(false);
    const [journeyModalStepIndex, setJourneyModalStepIndex] = React.useState(0);
    const [isCameraVisible, setIsCameraVisible] = React.useState(false);
    const [isRequestingCamera, setIsRequestingCamera] = React.useState(false);
    const [isScanLocked, setIsScanLocked] = React.useState(false);
    const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);
    const [routeDistanceMeters, setRouteDistanceMeters] = React.useState(0);
    const [routeDurationSeconds, setRouteDurationSeconds] = React.useState(0);
    const [isMapExpanded, setIsMapExpanded] = React.useState(true);
    const [shouldTrackMarkerViews, setShouldTrackMarkerViews] = React.useState(true);
    const [resolvedPickupAddress, setResolvedPickupAddress] = React.useState('');
    const [resolvedDropoffAddress, setResolvedDropoffAddress] = React.useState('');
    const [pickupAddressLookupDone, setPickupAddressLookupDone] = React.useState(false);
    const [dropoffAddressLookupDone, setDropoffAddressLookupDone] = React.useState(false);
    const mapHeightAnim = React.useRef(new Animated.Value(MAP_EXPANDED_HEIGHT)).current;
    const mapHeightRef = React.useRef(MAP_EXPANDED_HEIGHT);
    const panStartHeightRef = React.useRef(MAP_EXPANDED_HEIGHT);

    React.useEffect(() => {
        const listener = mapHeightAnim.addListener(({ value }) => {
            mapHeightRef.current = value;
        });
        return () => {
            mapHeightAnim.removeListener(listener);
        };
    }, [mapHeightAnim]);

    const animateMapExpanded = React.useCallback(
        (expanded: boolean) => {
            setIsMapExpanded(expanded);
            Animated.spring(mapHeightAnim, {
                toValue: expanded ? MAP_EXPANDED_HEIGHT : MAP_COLLAPSED_HEIGHT,
                damping: 20,
                stiffness: 190,
                mass: 0.8,
                useNativeDriver: false,
            }).start();
        },
        [mapHeightAnim],
    );

    const status = (tracking?.status || delivery?.status || 'pending') as DeliveryStatusValue;
    const journeyCurrentStepIndex = getJourneyGuideIndex(status);
    const openJourneyModal = React.useCallback(() => {
        setJourneyModalStepIndex(journeyCurrentStepIndex);
        setJourneyModalVisible(true);
    }, [journeyCurrentStepIndex]);
    const driverPickupConfirmed = Boolean(
        (tracking?.driverPickupConfirmed ?? delivery?.driverPickupConfirmed) === true,
    );
    const buyerDropoffConfirmed = Boolean(
        (tracking?.buyerDropoffConfirmed ?? delivery?.buyerDropoffConfirmed) === true,
    );
    const deliveryPersonRef = getDeliveryPersonRefId(delivery?.deliveryPersonId);
    const isAssignedDriver = Boolean(
        deliveryPersonRef && deliveryProfile?._id && deliveryPersonRef === deliveryProfile._id,
    );

    const canAcceptDelivery = hasDriverRole && status === 'pending';
    const canArrivePickup = isAssignedDriver && status === 'assigned';
    const canScanPickupQr = isAssignedDriver && status === 'at_pickup' && !driverPickupConfirmed;
    const canArriveDropoff = isAssignedDriver && (status === 'picked_up' || status === 'in_transit');
    const canShowDropoffQr = isAssignedDriver && status === 'at_dropoff' && !buyerDropoffConfirmed;

    const pickupPoint =
        parseGeoPoint((tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined) ||
        parseCoordinateLabel(tracking?.pickupLocation || delivery?.pickupLocation);
    const dropoffPoint =
        parseGeoPoint((tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined) ||
        parseCoordinateLabel(tracking?.deliveryLocation || delivery?.deliveryLocation);
    const driverPoint = parseGeoPoint((tracking?.currentLocation || delivery?.currentLocation) as DeliveryGeoPoint | null | undefined);
    const mapCenter = driverPoint || pickupPoint || dropoffPoint || DEFAULT_MAP_CENTER;

    const basePickupLabel = formatLocationLabel(
        tracking?.pickupLocation ?? delivery?.pickupLocation,
        (tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined,
        'Adresse de retrait indisponible',
    );
    const baseDropoffLabel = formatLocationLabel(
        tracking?.deliveryLocation ?? delivery?.deliveryLocation,
        (tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined,
        'Adresse de livraison indisponible',
    );
    const pickupLat = pickupPoint?.latitude ?? null;
    const pickupLng = pickupPoint?.longitude ?? null;
    const dropoffLat = dropoffPoint?.latitude ?? null;
    const dropoffLng = dropoffPoint?.longitude ?? null;
    const pickupBaseIsCoordinates = Boolean(parseCoordinateLabel(basePickupLabel));
    const dropoffBaseIsCoordinates = Boolean(parseCoordinateLabel(baseDropoffLabel));
    const shouldResolvePickupAddress = Boolean(
        pickupLat !== null &&
        pickupLng !== null &&
        (!basePickupLabel || pickupBaseIsCoordinates),
    );
    const shouldResolveDropoffAddress = Boolean(
        dropoffLat !== null &&
        dropoffLng !== null &&
        (!baseDropoffLabel || dropoffBaseIsCoordinates),
    );
    const pickupLabel =
        resolvedPickupAddress ||
        (shouldResolvePickupAddress
            ? pickupAddressLookupDone
                ? 'Adresse de retrait indisponible'
                : "Recherche de l'adresse..."
            : basePickupLabel || 'Adresse de retrait indisponible');
    const dropoffLabel =
        resolvedDropoffAddress ||
        (shouldResolveDropoffAddress
            ? dropoffAddressLookupDone
                ? 'Adresse de livraison indisponible'
                : "Recherche de l'adresse..."
            : baseDropoffLabel || 'Adresse de livraison indisponible');

    const orderPayload = delivery?.orderId && typeof delivery.orderId === 'object' ? (delivery.orderId as Record<string, any>) : null;
    const orderCode = String(orderPayload?._id || deliveryId).slice(-8).toUpperCase();
    const itemsCount = Array.isArray(orderPayload?.items)
        ? orderPayload.items.reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0)
        : 0;

    const route = (tracking?.route || delivery?.route || tracking?.calculatedRoute || delivery?.calculatedRoute || null) as Record<string, any> | null;
    const backendDistanceMeters =
        Math.max(
            parseNumeric(route?.totalDistanceMeters ?? route?.distanceMeters ?? route?.routeDistanceMeters ?? route?.distance) ??
            0,
            0,
        ) || 0;
    const backendDurationSeconds =
        Math.max(
            parseNumeric(route?.totalDurationSeconds ?? route?.durationSeconds ?? route?.routeDurationSeconds ?? route?.duration) ??
            0,
            0,
        ) || 0;
    const distanceMeters = routeDistanceMeters > 0 ? routeDistanceMeters : backendDistanceMeters;
    const durationSeconds = routeDurationSeconds > 0 ? routeDurationSeconds : backendDurationSeconds;
    const earningAmount = Number(orderPayload?.deliveryCost ?? orderPayload?.deliveryFee ?? 0);
    const earningLabel = earningAmount > 0 ? formatCurrencyAmount(earningAmount, orderPayload?.currency || 'CDF') : '--';

    const sellerPhone = normalizePhone((delivery?.sellerId as any)?.phone);
    const buyerPhone = normalizePhone((delivery?.buyerId as any)?.phone);

    const refetchAll = React.useCallback(async () => {
        await Promise.allSettled([refetchDelivery(), refetchTracking()]);
    }, [refetchDelivery, refetchTracking]);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setShouldTrackMarkerViews(false);
        }, 700);
        return () => clearTimeout(timeout);
    }, []);

    const contentTopOffsetAnim = React.useMemo(
        () =>
            mapHeightAnim.interpolate({
                inputRange: [MAP_COLLAPSED_HEIGHT, MAP_EXPANDED_HEIGHT],
                outputRange: [-8, -20],
                extrapolate: 'clamp',
            }),
        [mapHeightAnim],
    );

    const detailsSheetPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gestureState) =>
                    Math.abs(gestureState.dy) > 8 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderGrant: () => {
                    mapHeightAnim.stopAnimation((value: number) => {
                        mapHeightRef.current = value;
                        panStartHeightRef.current = value;
                    });
                },
                onPanResponderMove: (_, gestureState) => {
                    const nextHeight = Math.max(
                        MAP_COLLAPSED_HEIGHT,
                        Math.min(
                            MAP_EXPANDED_HEIGHT,
                            panStartHeightRef.current + gestureState.dy,
                        ),
                    );
                    mapHeightAnim.setValue(nextHeight);
                },
                onPanResponderRelease: (_, gestureState) => {
                    const midpoint = (MAP_EXPANDED_HEIGHT + MAP_COLLAPSED_HEIGHT) / 2;
                    const shouldCollapse =
                        gestureState.dy < -22 ||
                        gestureState.vy < -0.25 ||
                        (Math.abs(gestureState.dy) <= 22 &&
                            Math.abs(gestureState.vy) <= 0.25 &&
                            mapHeightRef.current <= midpoint);
                    animateMapExpanded(!shouldCollapse);
                },
                onPanResponderTerminate: () => {
                    const midpoint = (MAP_EXPANDED_HEIGHT + MAP_COLLAPSED_HEIGHT) / 2;
                    animateMapExpanded(mapHeightRef.current > midpoint);
                },
            }),
        [animateMapExpanded, mapHeightAnim],
    );

    React.useEffect(() => {
        setResolvedPickupAddress(shouldResolvePickupAddress ? '' : basePickupLabel);
        setResolvedDropoffAddress(shouldResolveDropoffAddress ? '' : baseDropoffLabel);
        setPickupAddressLookupDone(!shouldResolvePickupAddress);
        setDropoffAddressLookupDone(!shouldResolveDropoffAddress);

        if (!shouldResolvePickupAddress && !shouldResolveDropoffAddress) return;

        let cancelled = false;
        (async () => {
            const [pickupResponse, dropoffResponse] = await Promise.all([
                shouldResolvePickupAddress
                    ? triggerReverseGeocode({
                        lat: pickupLat as number,
                        lng: pickupLng as number,
                        language: 'fr',
                    })
                        .unwrap()
                        .catch(() => null)
                    : Promise.resolve(null),
                shouldResolveDropoffAddress
                    ? triggerReverseGeocode({
                        lat: dropoffLat as number,
                        lng: dropoffLng as number,
                        language: 'fr',
                    })
                        .unwrap()
                        .catch(() => null)
                    : Promise.resolve(null),
            ]);

            if (cancelled) return;
            if (shouldResolvePickupAddress) setPickupAddressLookupDone(true);
            if (shouldResolveDropoffAddress) setDropoffAddressLookupDone(true);

            const pickupAddress =
                typeof (pickupResponse as any)?.formattedAddress === 'string'
                    ? (pickupResponse as any).formattedAddress.trim()
                    : '';
            const dropoffAddress =
                typeof (dropoffResponse as any)?.formattedAddress === 'string'
                    ? (dropoffResponse as any).formattedAddress.trim()
                    : '';

            if (pickupAddress) setResolvedPickupAddress(pickupAddress);
            if (dropoffAddress) setResolvedDropoffAddress(dropoffAddress);
        })();

        return () => {
            cancelled = true;
        };
    }, [
        baseDropoffLabel,
        basePickupLabel,
        dropoffLat,
        dropoffLng,
        shouldResolveDropoffAddress,
        shouldResolvePickupAddress,
        pickupLat,
        pickupLng,
        triggerReverseGeocode,
    ]);

    React.useEffect(() => {
        if (pickupLat === null || pickupLng === null || dropoffLat === null || dropoffLng === null) {
            setRouteCoordinates([]);
            setRouteDistanceMeters(0);
            setRouteDurationSeconds(0);
            return;
        }

        const fallbackRoute = parseDirectionsRoute(route);
        const fallbackCoordinates = fallbackRoute?.coordinates ?? [];
        setRouteCoordinates(
            fallbackCoordinates.length >= 2
                ? fallbackCoordinates
                : [
                    { latitude: pickupLat, longitude: pickupLng },
                    { latitude: dropoffLat, longitude: dropoffLng },
                ],
        );
        setRouteDistanceMeters(fallbackRoute?.distanceMeters || backendDistanceMeters);
        setRouteDurationSeconds(fallbackRoute?.durationSeconds || backendDurationSeconds);

        let cancelled = false;
        const timeout = setTimeout(async () => {
            try {
                const response = await fetchDirections({
                    origin: { lat: pickupLat, lng: pickupLng },
                    destination: { lat: dropoffLat, lng: dropoffLng },
                    language: 'fr',
                }).unwrap();
                if (cancelled) return;

                const apiRoute = parseDirectionsRoute(
                    response?.routes?.[0] ?? response?.route ?? response,
                );
                const apiCoordinates = apiRoute?.coordinates ?? [];
                setRouteCoordinates(
                    apiCoordinates.length >= 2
                        ? apiCoordinates
                        : [
                            { latitude: pickupLat, longitude: pickupLng },
                            { latitude: dropoffLat, longitude: dropoffLng },
                        ],
                );
                setRouteDistanceMeters(apiRoute?.distanceMeters || backendDistanceMeters);
                setRouteDurationSeconds(apiRoute?.durationSeconds || backendDurationSeconds);
            } catch {
                if (cancelled) return;
            }
        }, 320);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [
        backendDistanceMeters,
        backendDurationSeconds,
        dropoffLat,
        dropoffLng,
        fetchDirections,
        pickupLat,
        pickupLng,
        route,
    ]);

    const lastStreamRefreshRef = React.useRef(0);
    const refreshFromStream = React.useCallback(() => {
        const now = Date.now();
        if (now - lastStreamRefreshRef.current < 1200) return;
        lastStreamRefreshRef.current = now;
        void refetchAll();
    }, [refetchAll]);

    const { connectionState } = useDeliveryStream({
        deliveryId,
        enabled: Boolean(deliveryId && isAuthenticated),
        onMessage: refreshFromStream,
    });

    const runAction = React.useCallback(async (action: () => Promise<any>, successMessage: string) => {
        try {
            await action();
            await refetchAll();
            Alert.alert('Succes', successMessage);
        } catch (error: any) {
            Alert.alert('Erreur', parseError(error, 'Operation impossible.'));
        }
    }, [refetchAll]);

    const openScanModal = (config: QrScanConfig) => {
        setQrMode('scan');
        setQrTitle(config.title);
        setQrCaption(config.caption);
        setQrInputPlaceholder(config.inputPlaceholder);
        setQrInput('');
        setQrDisplayToken('');
        setQrAction(() => config.action);
        setIsCameraVisible(false);
        setIsScanLocked(false);
        setQrModalVisible(true);
    };

    const closeQrModal = () => {
        setQrModalVisible(false);
        setIsCameraVisible(false);
        setIsScanLocked(false);
    };

    const openCameraScanner = async () => {
        if (cameraPermission?.granted) {
            setIsCameraVisible(true);
            setIsScanLocked(false);
            return;
        }
        setIsRequestingCamera(true);
        try {
            const permission = await requestCameraPermission();
            if (!permission?.granted) {
                Alert.alert('Permission camera', 'Autorisez la camera pour scanner le QR.');
                return;
            }
            setIsCameraVisible(true);
            setIsScanLocked(false);
        } finally {
            setIsRequestingCamera(false);
        }
    };

    const onCameraQrScanned = ({ data }: { data?: string }) => {
        if (isScanLocked) return;
        const value = (data || '').trim();
        if (!value) return;
        setIsScanLocked(true);
        setQrInput(value);
        setIsCameraVisible(false);
        Alert.alert('QR detecte', 'Validez pour continuer.');
    };

    const validateQr = async () => {
        if (qrMode !== 'scan' || !qrAction) return;
        const payload = qrInput.trim();
        if (!payload) {
            Alert.alert('QR requis', 'Scannez ou saisissez un QR valide.');
            return;
        }
        try {
            await qrAction(payload);
            await refetchAll();
            closeQrModal();
            Alert.alert('Succes', 'Retrait confirme. La livraison a demarre.');
        } catch (error: any) {
            Alert.alert('Erreur', parseError(error, 'Impossible de valider le QR de retrait.'));
        }
    };

    const onShowDropoffQr = async () => {
        try {
            const payload = await generateDropoffQr(deliveryId).unwrap();
            const expiresAt = payload?.expiresAt
                ? new Date(payload.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : null;
            setQrMode('display');
            setQrTitle('QR livraison');
            setQrCaption(expiresAt ? `Valide jusqu'a ${expiresAt}` : "Montrez ce QR a l'acheteur.");
            setQrDisplayToken(payload.qrPayload);
            setQrModalVisible(true);
        } catch (error: any) {
            Alert.alert('Erreur', parseError(error, 'Impossible de generer le QR livraison.'));
        }
    };

    const primaryAction = canAcceptDelivery
        ? { label: 'Accepter la livraison', loading: isAccepting, onPress: () => void runAction(() => acceptDelivery(deliveryId).unwrap(), 'Livraison acceptee.') }
        : canArrivePickup
            ? { label: 'Confirmer arrivee au retrait', loading: isArrivingPickup, onPress: () => void runAction(() => driverArrivePickup(deliveryId).unwrap(), 'Arrivee au retrait confirmee.') }
            : canScanPickupQr
                ? { label: 'Scanner le QR de retrait', loading: isScanningPickupQr, onPress: () => openScanModal({ title: 'Scanner le QR de retrait', caption: 'Scannez le QR du vendeur pour demarrer la livraison.', inputPlaceholder: 'Code QR de retrait', action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap() }) }
                : canArriveDropoff
                    ? { label: 'Confirmer arrivee a destination', loading: isArrivingDropoff, onPress: () => void runAction(() => driverArriveDropoff(deliveryId).unwrap(), 'Arrivee a destination confirmee.') }
                    : canShowDropoffQr
                        ? { label: 'Afficher le QR de livraison', loading: isGeneratingDropoffQr, onPress: () => void onShowDropoffQr() }
                        : null;
    const journeyModalStep =
        JOURNEY_GUIDE_STEPS[journeyModalStepIndex] || JOURNEY_GUIDE_STEPS[0];
    const canJourneyPrev = journeyModalStepIndex > 0;
    const canJourneyNext = journeyModalStepIndex < JOURNEY_GUIDE_STEPS.length - 1;

    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;

    if (!delivery) {
        return (
            <SafeAreaView style={styles.empty} edges={['top', 'bottom']}>
                <Ionicons name="alert-circle-outline" size={48} color={UI.accent} />
                <Text style={styles.emptyTitle}>Livraison introuvable</Text>
                <Text style={styles.emptySubText}>Verifiez l identifiant ou vos permissions.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
                    <Text style={styles.emptyBtnText}>Retour</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const step = stepIndex(status);
    const liveLabel =
        connectionState === 'connected'
            ? 'En direct'
            : connectionState === 'connecting'
                ? 'Connexion...'
                : 'Actualisation auto';

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.primaryDark, '#1B4C83']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={UI.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>#{orderCode}</Text>
                    <View style={styles.headerLiveBadge}>
                        <View style={[styles.headerLiveDot, connectionState === 'connected' && styles.headerLiveDotActive]} />
                        <Text style={styles.headerLiveText}>{liveLabel}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {earningAmount > 0 ? (
                        <View style={styles.earningBadge}>
                            <Ionicons name="wallet-outline" size={12} color={Colors.primaryDark} />
                            <Text style={styles.earningBadgeText}>{earningLabel}</Text>
                        </View>
                    ) : null}
                    <TouchableOpacity style={styles.iconBtn} onPress={openJourneyModal}>
                        <Ionicons name="help-outline" size={20} color={UI.text} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Map */}
            <Animated.View style={[styles.mapWrap, { height: mapHeightAnim }]}>
                <MapView style={styles.map} {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                    initialRegion={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}>
                    {pickupPoint ? (
                        <Marker
                            coordinate={pickupPoint}
                            title="Point de retrait"
                            description={pickupLabel}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={shouldTrackMarkerViews}
                            tracksInfoWindowChanges={shouldTrackMarkerViews}
                        >
                            <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.accentDark }]}>
                                <Ionicons name="storefront" size={15} color={Colors.white} />
                            </View>
                        </Marker>
                    ) : null}
                    {dropoffPoint ? (
                        <Marker
                            coordinate={dropoffPoint}
                            title="Point de livraison"
                            description={dropoffLabel}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={shouldTrackMarkerViews}
                            tracksInfoWindowChanges={shouldTrackMarkerViews}
                        >
                            <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.info }]}>
                                <Ionicons name="location" size={16} color={Colors.white} />
                            </View>
                        </Marker>
                    ) : null}
                    {driverPoint ? (
                        <Marker
                            coordinate={driverPoint}
                            title="Position livreur"
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={shouldTrackMarkerViews}
                            tracksInfoWindowChanges={shouldTrackMarkerViews}
                        >
                            <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="bicycle" size={15} color={Colors.white} />
                            </View>
                        </Marker>
                    ) : null}
                    {routeCoordinates.length >= 2 ? (
                        <>
                            <Polyline coordinates={routeCoordinates} strokeColor={Colors.white + 'CC'} strokeWidth={7} />
                            <Polyline coordinates={routeCoordinates} strokeColor={Colors.primaryLight} strokeWidth={4} />
                        </>
                    ) : null}
                </MapView>
                <TouchableOpacity
                    style={styles.mapGoButton}
                    onPress={() => router.push(`/delivery/deliver-persons/navigation/${deliveryId}` as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="navigate" size={14} color={Colors.primary} />
                    <Text style={styles.mapGoButtonText}>Navigation Go</Text>
                </TouchableOpacity>
                {!isMapExpanded ? (
                    <View style={styles.mapCollapsedHint}>
                        <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
                        <Text style={styles.mapCollapsedHintText} numberOfLines={1}>
                            {statusLabel(status)}
                        </Text>
                    </View>
                ) : null}
                {isRouting && isMapExpanded ? (
                    <View style={styles.mapLoadingBadge}>
                        <Ionicons name="navigate-outline" size={13} color={Colors.primary} />
                        <Text style={styles.mapLoadingText}>{"Calcul d'itineraire..."}</Text>
                    </View>
                ) : null}
            </Animated.View>

            <Animated.View style={[styles.detailsSheet, { marginTop: contentTopOffsetAnim }]}>
                <View style={styles.detailsDragZone} {...detailsSheetPanResponder.panHandlers}>
                    <View style={styles.detailsDragHandle} />
                    <Text style={styles.detailsDragHint}>Glissez vers le haut ou le bas</Text>
                </View>
                <ScrollView
                    style={styles.detailsScroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    alwaysBounceVertical={false}
                    overScrollMode="never"
                >
                {/* Stepper */}
                <View style={styles.stepperCard}>
                    <View style={styles.stepperHeaderRow}>
                        <Text style={styles.stepperTitle}>{statusLabel(status)}</Text>
                        <View style={styles.stepperStatusBadge}>
                            <Text style={styles.stepperStatusText}>
                                Etape {Math.min(step, STEPS.length)}/{STEPS.length}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.stepperRow}>
                        {STEPS.map((s, index) => {
                            const isActive = step >= index + 1;
                            const isCurrent = step === index + 1;
                            return (
                                <React.Fragment key={s.key}>
                                    {index > 0 && (
                                        <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
                                    )}
                                    <View style={styles.stepItem}>
                                        <View style={[
                                            styles.stepCircle,
                                            isActive && styles.stepCircleActive,
                                            isCurrent && styles.stepCircleCurrent,
                                        ]}>
                                            <Ionicons
                                                name={s.icon}
                                                size={14}
                                                color={isActive ? Colors.primaryDark : UI.muted}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.stepLabel,
                                            isActive && styles.stepLabelActive,
                                        ]}>
                                            {s.label}
                                        </Text>
                                    </View>
                                </React.Fragment>
                            );
                        })}
                    </View>
                </View>

                {/* Metrics */}
                <View style={styles.metrics}>
                    <View style={[styles.metric, styles.metricAccent]}>
                        <Ionicons name="wallet-outline" size={20} color={UI.accent} />
                        <Text style={styles.metricValue}>{earningLabel}</Text>
                        <Text style={styles.metricLabel}>GAIN ESTIME</Text>
                    </View>
                    <View style={styles.metric}>
                        <Ionicons name="navigate-outline" size={20} color={UI.muted} />
                        <Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text>
                        <Text style={styles.metricLabel}>DISTANCE</Text>
                    </View>
                    <View style={styles.metric}>
                        <Ionicons name="timer-outline" size={20} color={UI.muted} />
                        <Text style={styles.metricValue}>{formatDuration(durationSeconds)}</Text>
                        <Text style={styles.metricLabel}>DUREE</Text>
                    </View>
                    <View style={styles.metric}>
                        <Ionicons name="cube-outline" size={20} color={UI.muted} />
                        <Text style={styles.metricValue}>{itemsCount || '--'}</Text>
                        <Text style={styles.metricLabel}>ARTICLES</Text>
                    </View>
                </View>

                {/* Addresses Timeline */}
                <View style={styles.addressCard}>
                    <View style={styles.addressRow}>
                        <View style={styles.addressTimeline}>
                            <View style={styles.addressDotPickup} />
                            <View style={styles.addressLine} />
                            <View style={styles.addressDotDropoff} />
                        </View>
                        <View style={styles.addressContent}>
                            <View style={styles.addressBlock}>
                                <Text style={styles.addressLabel}>RETRAIT</Text>
                                {isResolvingAddresses ? <Text style={styles.small}>Resolution des adresses...</Text> : null}
                                <Text style={styles.addressText}>{pickupLabel}</Text>
                                <TouchableOpacity
                                    style={[styles.contactBtn, !sellerPhone && styles.disabled]}
                                    disabled={!sellerPhone}
                                    onPress={() => void openPhoneCall(sellerPhone, 'vendeur')}
                                >
                                    <Ionicons name="call-outline" size={13} color={UI.accent} />
                                    <Text style={styles.contactText}>Vendeur</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.addressDivider} />
                            <View style={styles.addressBlock}>
                                <Text style={styles.addressLabel}>LIVRAISON</Text>
                                <Text style={styles.addressText}>{dropoffLabel}</Text>
                                <TouchableOpacity
                                    style={[styles.contactBtn, !buyerPhone && styles.disabled]}
                                    disabled={!buyerPhone}
                                    onPress={() => void openPhoneCall(buyerPhone, 'acheteur')}
                                >
                                    <Ionicons name="chatbubble-ellipses-outline" size={13} color={UI.accent} />
                                    <Text style={styles.contactText}>Acheteur</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Scan QR Card */}
                <TouchableOpacity
                    style={[styles.scanCard, !canScanPickupQr && styles.scanCardDisabled]}
                    disabled={!canScanPickupQr}
                    activeOpacity={0.7}
                    onPress={() => openScanModal({
                        title: 'Scanner QR de retrait',
                        caption: 'Scannez le QR vendeur pour confirmer la recuperation.',
                        inputPlaceholder: 'Code QR vendeur',
                        action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap(),
                    })}
                >
                    <View style={[styles.scanIconCircle, !canScanPickupQr && styles.scanIconCircleDisabled]}>
                        <Ionicons name="scan-outline" size={20} color={!canScanPickupQr ? UI.muted : Colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.scanTitle, !canScanPickupQr && styles.scanTitleDisabled]}>Scanner le QR de retrait</Text>
                        <Text style={[styles.scanSubtitle, canScanPickupQr && styles.scanSubtitleActive]}>
                            {canScanPickupQr ? '● Disponible maintenant' : 'Disponible apres votre arrivee au retrait'}
                        </Text>
                    </View>
                    <View style={[styles.scanArrowCircle, !canScanPickupQr && styles.scanArrowCircleDisabled]}>
                        <Ionicons name={!canScanPickupQr ? 'lock-closed-outline' : 'arrow-forward'} size={16} color={!canScanPickupQr ? UI.muted : Colors.primaryDark} />
                    </View>
                </TouchableOpacity>
                </ScrollView>
            </Animated.View>

            {/* Bottom CTA */}
            <View style={[styles.bottom, { paddingBottom: Spacing.lg + insets.bottom }]}>
                <TouchableOpacity
                    style={[styles.ctaWrap, (!primaryAction || primaryAction.loading) && styles.disabled]}
                    disabled={!primaryAction || Boolean(primaryAction.loading)}
                    onPress={() => primaryAction?.onPress()}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={primaryAction ? [UI.accent, UI.accentDark] : [UI.card, UI.card]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaGradient}
                    >
                        <Text style={styles.ctaText}>
                            {primaryAction?.loading ? 'Traitement...' : primaryAction?.label || 'Aucune action disponible'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={primaryAction ? Colors.primaryDark : UI.muted} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <Modal visible={journeyModalVisible} transparent animationType="fade" onRequestClose={() => setJourneyModalVisible(false)}>
                <View style={styles.journeyOverlay}>
                    <View style={styles.journeyCard}>
                        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.journeyHeader}>
                            <View style={styles.journeyHeaderRow}>
                                <View style={styles.journeyHeaderIcon}>
                                    <Ionicons name="map-outline" size={20} color={UI.accent} />
                                </View>
                                <View style={styles.journeyHeaderTextWrap}>
                                    <Text style={styles.journeyHeaderTitle}>Parcours de livraison</Text>
                                    <Text style={styles.journeyHeaderSubtitle}>Guide etape par etape</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.journeyCloseBtn}
                                    onPress={() => setJourneyModalVisible(false)}
                                >
                                    <Ionicons name="close" size={18} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        <View style={styles.journeyBody}>
                            <View style={styles.journeyProgressRow}>
                                {JOURNEY_GUIDE_STEPS.map((stepItem, index) => (
                                    <View
                                        key={stepItem.key}
                                        style={[
                                            styles.journeyProgressDot,
                                            index <= journeyModalStepIndex && styles.journeyProgressDotActive,
                                            index === journeyModalStepIndex && styles.journeyProgressDotCurrent,
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={styles.journeyStepCounter}>
                                Etape {journeyModalStepIndex + 1}/{JOURNEY_GUIDE_STEPS.length}
                            </Text>

                            <View style={styles.journeySingleCard}>
                                <View style={styles.journeySingleIcon}>
                                    <Ionicons name={journeyModalStep.icon} size={21} color={Colors.primaryDark} />
                                </View>
                                <Text style={styles.journeySingleTitle}>{journeyModalStep.title}</Text>
                                <Text style={styles.journeySingleDescription}>
                                    {journeyModalStep.description}
                                </Text>
                            </View>

                            <View style={styles.journeyHintBox}>
                                <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                                <Text style={styles.journeyHintText}>
                                    Utilisez Suivant/Precedent pour parcourir le process.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.journeyFooter}>
                            <TouchableOpacity
                                style={styles.journeyNavBtn}
                                onPress={() => {
                                    setJourneyModalVisible(false);
                                    router.push(`/delivery/deliver-persons/navigation/${deliveryId}` as any);
                                }}
                            >
                                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                                <Text style={styles.journeyNavBtnText}>Acceder a la navigation</Text>
                            </TouchableOpacity>
                            <View style={styles.journeyFooterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.journeyGhostBtn,
                                        !canJourneyPrev && styles.journeyGhostBtnDisabled,
                                    ]}
                                    onPress={() => setJourneyModalStepIndex((prev) => Math.max(prev - 1, 0))}
                                    disabled={!canJourneyPrev}
                                >
                                    <Text style={styles.journeyGhostBtnText}>Precedent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.journeyPrimaryBtn}
                                    onPress={() => {
                                        if (canJourneyNext) {
                                            setJourneyModalStepIndex((prev) => Math.min(prev + 1, JOURNEY_GUIDE_STEPS.length - 1));
                                            return;
                                        }
                                        setJourneyModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.journeyPrimaryBtnText}>
                                        {canJourneyNext ? 'Suivant' : 'J ai compris'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* QR Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={closeQrModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <LinearGradient
                            colors={[Colors.primaryDark, Colors.primary]}
                            style={styles.modalHeader}
                        >
                            <Ionicons name={qrMode === 'display' ? 'qr-code' : 'scan'} size={22} color={UI.accent} />
                            <Text style={styles.modalTitle}>{qrTitle}</Text>
                        </LinearGradient>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalCaption}>{qrCaption}</Text>
                            {qrMode === 'display' ? (
                                <>
                                    {qrDisplayToken ? (
                                        <QrCodeMatrix
                                            value={qrDisplayToken}
                                            size={230}
                                            style={styles.qrImage}
                                        />
                                    ) : null}
                                    <Text style={styles.qrToken}>{qrDisplayToken}</Text>
                                    <TouchableOpacity style={styles.modalPrimary} onPress={closeQrModal}>
                                        <Text style={styles.modalPrimaryText}>Fermer</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.cameraBtn} onPress={() => void openCameraScanner()} disabled={isRequestingCamera}>
                                        <Ionicons name="camera-outline" size={16} color={Colors.white} />
                                        <Text style={styles.cameraBtnText}>{isRequestingCamera ? 'Demande camera...' : 'Scanner avec la camera'}</Text>
                                    </TouchableOpacity>
                                    {isCameraVisible ? (
                                        <View style={styles.cameraWrap}>
                                            <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={isScanLocked ? undefined : onCameraQrScanned} />
                                        </View>
                                    ) : null}
                                    <TextInput style={styles.modalInput} value={qrInput} onChangeText={setQrInput} placeholder={qrInputPlaceholder} autoCapitalize="characters" />
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity style={styles.modalGhost} onPress={closeQrModal}>
                                            <Text style={styles.modalGhostText}>Annuler</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.modalPrimary} onPress={() => void validateQr()}>
                                            <Text style={styles.modalPrimaryText}>Valider</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: UI.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: UI.border + '40',
    },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI.card + '80',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    headerTitle: {
        color: UI.text,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },
    headerLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
        backgroundColor: UI.card + '60',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    headerLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: UI.muted,
    },
    headerLiveDotActive: {
        backgroundColor: Colors.success,
    },
    headerLiveText: {
        color: UI.muted,
        fontSize: 10,
        fontWeight: Typography.fontWeight.bold,
    },
    earningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: UI.accent,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        ...Shadows.sm,
    },
    earningBadgeText: {
        color: Colors.primaryDark,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    mapWrap: {
        height: MAP_EXPANDED_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: UI.border + '40',
    },
    map: { width: '100%', height: '100%' },
    mapCollapsedHint: {
        position: 'absolute',
        left: Spacing.sm,
        right: Spacing.sm,
        bottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.white + 'EC',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    mapCollapsedHintText: {
        flex: 1,
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    mapLoadingBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + 'F0',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        ...Shadows.sm,
    },
    mapLoadingText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    mapMarkerBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2.5,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    mapGoButton: {
        position: 'absolute',
        top: Spacing.sm,
        left: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '35',
        backgroundColor: Colors.white + 'F2',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        ...Shadows.sm,
    },
    mapGoButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    detailsSheet: {
        flex: 1,
        backgroundColor: UI.bg,
        borderTopLeftRadius: BorderRadius.xl + 2,
        borderTopRightRadius: BorderRadius.xl + 2,
        borderTopWidth: 1,
        borderTopColor: UI.border + '40',
        overflow: 'hidden',
    },
    detailsScroll: {
        flex: 1,
    },
    detailsDragZone: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.sm,
    },
    detailsDragHandle: {
        width: 54,
        height: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: UI.border + 'B8',
    },
    detailsDragHint: {
        marginTop: 4,
        color: UI.muted,
        fontSize: 10,
        fontWeight: Typography.fontWeight.semibold,
    },
    content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 130 },
    small: { color: UI.muted, fontSize: Typography.fontSize.xs },

    // Stepper
    stepperCard: {
        backgroundColor: UI.card,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: UI.border + '50',
        padding: Spacing.lg,
        ...Shadows.md,
    },
    stepperHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    stepperTitle: {
        color: UI.text,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    stepperStatusBadge: {
        backgroundColor: UI.accent + '28',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    stepperStatusText: {
        color: UI.accent,
        fontSize: 10,
        fontWeight: Typography.fontWeight.extrabold,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepItem: {
        alignItems: 'center',
        gap: 4,
    },
    stepCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#2B649F',
        borderWidth: 2,
        borderColor: UI.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleActive: {
        backgroundColor: UI.accent,
        borderColor: UI.accentDark,
    },
    stepCircleCurrent: {
        borderColor: Colors.white,
        borderWidth: 3,
    },
    stepLine: {
        flex: 1,
        height: 3,
        backgroundColor: '#2B649F',
        borderRadius: 2,
        marginHorizontal: 2,
    },
    stepLineActive: {
        backgroundColor: UI.accent,
    },
    stepLabel: {
        color: UI.muted,
        fontSize: 9,
        fontWeight: Typography.fontWeight.bold,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: UI.accent,
    },

    // Metrics
    metrics: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    metric: {
        width: '47%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI.card,
        borderWidth: 1,
        borderColor: UI.border + '50',
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        gap: 4,
        ...Shadows.sm,
    },
    metricAccent: {
        borderColor: UI.accent + '40',
        backgroundColor: UI.accent + '10',
    },
    metricValue: {
        color: UI.text,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    metricLabel: {
        color: UI.muted,
        fontSize: 9,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },

    // Addresses
    addressCard: {
        backgroundColor: UI.card,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: UI.border + '50',
        padding: Spacing.lg,
        ...Shadows.md,
    },
    addressRow: {
        flexDirection: 'row',
    },
    addressTimeline: {
        alignItems: 'center',
        width: 24,
        marginRight: Spacing.md,
        paddingTop: 3,
    },
    addressDotPickup: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: UI.accent,
    },
    addressLine: {
        width: 2,
        flex: 1,
        backgroundColor: UI.border + '80',
        marginVertical: 4,
    },
    addressDotDropoff: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.success,
    },
    addressContent: {
        flex: 1,
    },
    addressBlock: {
        paddingVertical: Spacing.xs,
    },
    addressLabel: {
        color: UI.muted,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    addressText: {
        color: UI.text,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 20,
    },
    addressDivider: {
        height: 1,
        backgroundColor: UI.border + '40',
        marginVertical: Spacing.sm,
    },
    contactBtn: {
        marginTop: Spacing.sm,
        alignSelf: 'flex-start',
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: UI.accent + '40',
        backgroundColor: UI.accent + '15',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    contactText: {
        color: UI.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },

    // Scan Card
    scanCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: UI.card,
        borderRadius: BorderRadius.xl,
        borderWidth: 1.5,
        borderColor: UI.accent + '50',
        padding: Spacing.lg,
        ...Shadows.md,
    },
    scanCardDisabled: {
        opacity: 0.55,
        borderColor: UI.border + '40',
    },
    scanIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: UI.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanIconCircleDisabled: {
        backgroundColor: '#2B649F',
    },
    scanTitle: {
        color: UI.accent,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    scanTitleDisabled: {
        color: UI.muted,
    },
    scanSubtitle: {
        color: UI.muted,
        fontSize: Typography.fontSize.xs,
        marginTop: 2,
    },
    scanSubtitleActive: {
        color: Colors.success,
    },
    scanArrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: UI.accent + '25',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanArrowCircleDisabled: {
        backgroundColor: '#2B649F',
    },

    // Bottom
    bottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: Spacing.lg,
        backgroundColor: UI.bg + 'F0',
        borderTopWidth: 1,
        borderTopColor: UI.border + '40',
    },
    ctaWrap: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    ctaGradient: {
        minHeight: 58,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    ctaText: {
        color: Colors.primaryDark,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    disabled: { opacity: 0.5 },

    // Journey Guide Modal
    journeyOverlay: {
        flex: 1,
        backgroundColor: '#000000B3',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    journeyCard: {
        width: '100%',
        maxWidth: 430,
        maxHeight: '78%',
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        overflow: 'hidden',
        ...Shadows.xl,
    },
    journeyHeader: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    journeyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    journeyHeaderIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + '18',
        borderWidth: 1,
        borderColor: Colors.white + '30',
    },
    journeyHeaderTextWrap: {
        flex: 1,
    },
    journeyHeaderTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    journeyHeaderSubtitle: {
        marginTop: 2,
        color: Colors.white + 'D0',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    journeyCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.white + '30',
        backgroundColor: Colors.white + '10',
    },
    journeyBody: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    journeyProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    journeyProgressDot: {
        width: 22,
        height: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray200,
    },
    journeyProgressDotActive: {
        backgroundColor: UI.accent + 'A0',
    },
    journeyProgressDotCurrent: {
        backgroundColor: UI.accent,
    },
    journeyStepCounter: {
        marginTop: Spacing.xs,
        textAlign: 'center',
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    journeySingleCard: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '32',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    journeySingleIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1,
        borderColor: Colors.primary + '36',
        backgroundColor: Colors.white + 'C8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    journeySingleTitle: {
        marginTop: 2,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },
    journeySingleDescription: {
        marginTop: 2,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        textAlign: 'center',
    },
    journeyHintBox: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    journeyHintText: {
        flex: 1,
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    journeyFooter: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        padding: Spacing.md,
    },
    journeyNavBtn: {
        minHeight: 44,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '32',
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: Spacing.sm,
    },
    journeyNavBtnText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    journeyFooterRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    journeyGhostBtn: {
        flex: 1,
        minHeight: 46,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    journeyGhostBtnDisabled: {
        opacity: 0.45,
    },
    journeyGhostBtnText: {
        color: Colors.gray700,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    journeyPrimaryBtn: {
        flex: 1.1,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    journeyPrimaryBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000000AA',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        overflow: 'hidden',
        ...Shadows.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    modalTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    modalBody: {
        padding: Spacing.lg,
    },
    modalCaption: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    qrImage: {
        alignSelf: 'center',
        width: 230,
        height: 230,
        borderRadius: BorderRadius.md,
    },
    qrToken: {
        marginTop: Spacing.sm,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        textAlign: 'center',
    },
    cameraBtn: {
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.sm + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    cameraBtnText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    cameraWrap: {
        marginTop: Spacing.sm,
        height: 200,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    camera: { width: '100%', height: '100%' },
    modalInput: {
        marginTop: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        color: Colors.gray900,
        fontSize: Typography.fontSize.sm,
    },
    modalActions: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    modalGhost: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: Colors.gray300,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
    },
    modalGhostText: {
        color: Colors.gray700,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    modalPrimary: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
    },
    modalPrimaryText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },

    // Empty
    empty: {
        flex: 1,
        backgroundColor: UI.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    emptyTitle: {
        color: UI.text,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptySubText: {
        color: UI.muted,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
    emptyBtn: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: UI.border,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    emptyBtnText: {
        color: UI.text,
        fontWeight: Typography.fontWeight.bold,
    },
});
