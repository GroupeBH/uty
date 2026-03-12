import { Button } from '@/components/ui/Button';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QrCodeMatrix } from '@/components/ui/QrCodeMatrix';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useAcceptDeliveryMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useGenerateDropoffQrMutation,
    useGeneratePickupQrMutation,
    useGetDeliveryMessagesQuery,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useScanDropoffQrMutation,
    useScanPickupQrMutation,
    useSendDeliveryMessageMutation,
    useUpdateDeliveryLocationMutation,
} from '@/store/api/deliveriesApi';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetDirectionsMutation, useLazyGeocodeQuery, useLazyReverseGeocodeQuery } from '@/store/api/googleMapsApi';
import {
    DELIVERY_STATUS_LABELS,
    DeliveryCalculatedRoute,
    DeliveryGeoPoint,
    DeliveryStatusValue,
    getDeliveryActorId,
    getDeliveryPersonRefId,
} from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

type LatLng = { latitude: number; longitude: number };
type RouteMetrics = { distanceKm: number; durationMin: number; summary?: string };
type NavigationStep = {
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    start: LatLng;
    end: LatLng;
};
type StepActionItem = {
    key: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    onPress: () => void;
};
type DeliveryWorkspaceTab = 'navigation' | 'actions' | 'messages';
type RouteSource = 'none' | 'backend' | 'google' | 'fallback';
type ViewerRole = 'driver' | 'seller' | 'buyer' | 'observer';
type ForcedViewerRole = Exclude<ViewerRole, 'observer'>;
type DeliveryDetailScreenProps = {
    forcedViewerRole?: ForcedViewerRole;
};
type BackendRouteCandidate = {
    coordinates: LatLng[];
    steps: NavigationStep[];
    metrics: RouteMetrics | null;
    provider: 'tracking' | 'delivery';
};

const DEFAULT_MAP_CENTER: LatLng = { latitude: 5.3365, longitude: -4.0244 };
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_DOMINANT_HEIGHT = Math.max(460, Math.round(SCREEN_HEIGHT * 0.7));

const DELIVERY_STAGE_ORDER: {
    key: 'pending' | 'assigned' | 'at_pickup' | 'in_transit' | 'at_dropoff' | 'delivered';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
        { key: 'pending', label: 'Demande', icon: 'time-outline' },
        { key: 'assigned', label: 'Assignee', icon: 'person-outline' },
        { key: 'at_pickup', label: 'Retrait', icon: 'storefront-outline' },
        { key: 'in_transit', label: 'Transit', icon: 'car-outline' },
        { key: 'at_dropoff', label: 'Livraison', icon: 'location-outline' },
        { key: 'delivered', label: 'Livree', icon: 'checkmark-circle-outline' },
    ];

const hasDeliveryRole = (roles?: string[]) =>
    Boolean(
        roles?.some((role) =>
            ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(
                (role || '').toLowerCase(),
            ),
        ),
    );

const parseError = (error: any, fallback: string): string =>
    (Array.isArray(error?.data?.message) && String(error.data.message[0])) ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    fallback;

const parseCoordinateString = (value?: string | null): LatLng | null => {
    if (!value?.trim()) return null;
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { latitude: lat, longitude: lng };
};

const parseGeoPoint = (value?: DeliveryGeoPoint | null): LatLng | null => {
    const coords = value?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
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

const stripHtmlInstruction = (value?: string): string => {
    if (!value) return 'Continuez tout droit';
    const withoutTags = value.replace(/<[^>]*>/g, ' ');
    const decoded = withoutTags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
    return decoded || 'Continuez tout droit';
};

const formatClockTime = (value?: string | null): string => {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const haversineMeters = (from: LatLng, to: LatLng): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLng = toRad(to.longitude - from.longitude);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.latitude)) *
        Math.cos(toRad(to.latitude)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
};

const bearingDegrees = (from: LatLng, to: LatLng): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const toDeg = (x: number) => (x * 180) / Math.PI;
    const dLng = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const instructionIcon = (instruction?: string): keyof typeof Ionicons.glyphMap => {
    const text = (instruction || '').toLowerCase();
    if (text.includes('gauche')) return 'arrow-back-outline';
    if (text.includes('droite')) return 'arrow-forward-outline';
    if (text.includes('demi-tour')) return 'reload-outline';
    if (text.includes('rond-point')) return 'git-compare-outline';
    if (text.includes('arrive')) return 'flag-outline';
    return 'arrow-up-outline';
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

        coordinates.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return coordinates;
};

const parseNumeric = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
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

        // Default to GeoJSON order [lng, lat], fallback to [lat, lng] when obvious.
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

const parseNavigationStep = (value: unknown): NavigationStep | null => {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const start = parseRoutePoint(
        record.start ?? record.startLocation ?? record.origin ?? record.from,
    );
    const end = parseRoutePoint(
        record.end ?? record.endLocation ?? record.destination ?? record.to,
    );
    if (!start || !end) return null;

    const instructionCandidate =
        record.instruction ?? record.htmlInstructions ?? record.text ?? record.maneuver;
    const instruction =
        typeof instructionCandidate === 'string'
            ? stripHtmlInstruction(instructionCandidate)
            : 'Continuez tout droit';

    return {
        instruction,
        distanceMeters: Math.max(
            parseNumeric(record.distanceMeters ?? record.distance ?? record.lengthMeters) ?? 0,
            0,
        ),
        durationSeconds: Math.max(
            parseNumeric(record.durationSeconds ?? record.duration ?? record.travelTimeSeconds) ?? 0,
            0,
        ),
        start,
        end,
    };
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

const parseStepsFromPayload = (payload: Record<string, unknown>): NavigationStep[] => {
    const directRawSteps = Array.isArray(payload.routeSteps)
        ? payload.routeSteps
        : Array.isArray(payload.steps)
            ? payload.steps
            : [];
    if (directRawSteps.length > 0) {
        return directRawSteps
            .map((step) => parseNavigationStep(step))
            .filter((step): step is NavigationStep => Boolean(step));
    }

    if (!Array.isArray(payload.legs)) return [];
    return payload.legs.flatMap((leg) => {
        if (!leg || typeof leg !== 'object') return [];
        const legRecord = leg as Record<string, unknown>;
        if (!Array.isArray(legRecord.steps)) return [];
        return legRecord.steps
            .map((step) => parseNavigationStep(step))
            .filter((step): step is NavigationStep => Boolean(step));
    });
};

const measurePathMeters = (coordinates: LatLng[]): number => {
    if (coordinates.length < 2) return 0;
    let total = 0;
    for (let index = 1; index < coordinates.length; index += 1) {
        total += haversineMeters(coordinates[index - 1], coordinates[index]);
    }
    return total;
};

const parseRoutePayload = (
    payload: unknown,
): Omit<BackendRouteCandidate, 'provider'> | null => {
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;

    const coordinates = parseRouteCoordinates(
        record.coordinates ??
        record.routeCoordinates ??
        record.path ??
        record.routePath ??
        record.points,
    );
    const polylineCandidate =
        record.overviewPolyline ??
        record.encodedPolyline ??
        record.routePolyline ??
        (typeof record.polyline === 'string'
            ? record.polyline
            : (record.polyline as Record<string, unknown> | undefined)?.points);
    const decodedPolyline =
        typeof polylineCandidate === 'string' ? decodePolyline(polylineCandidate) : [];
    const normalizedCoordinates =
        coordinates.length >= 2
            ? coordinates
            : decodedPolyline.length >= 2
                ? decodedPolyline
                : [];

    const normalizedSteps = parseStepsFromPayload(record);

    const distanceMeters =
        parseNumeric(
            record.distanceMeters ??
            record.routeDistanceMeters ??
            record.distance ??
            record.totalDistanceMeters,
        ) ??
        (() => {
            const legDistance = sumLegMetric(record.legs, 'distance');
            if (legDistance > 0) return legDistance;
            const stepsDistance = normalizedSteps.reduce(
                (sum, step) => sum + Math.max(step.distanceMeters, 0),
                0,
            );
            if (stepsDistance > 0) return stepsDistance;
            const lineDistance = measurePathMeters(normalizedCoordinates);
            return lineDistance > 0 ? lineDistance : null;
        })();

    const durationSeconds =
        parseNumeric(
            record.durationSeconds ??
            record.routeDurationSeconds ??
            record.duration ??
            record.totalDurationSeconds,
        ) ??
        (() => {
            const legDuration = sumLegMetric(record.legs, 'duration');
            if (legDuration > 0) return legDuration;
            const stepsDuration = normalizedSteps.reduce(
                (sum, step) => sum + Math.max(step.durationSeconds, 0),
                0,
            );
            return stepsDuration > 0 ? stepsDuration : null;
        })();

    const distanceKmFromField = parseNumeric(
        record.distanceKm ?? record.routeDistanceKm ?? record.totalDistanceKm,
    );
    const durationMinFromField = parseNumeric(
        record.durationMin ?? record.routeDurationMin ?? record.durationMinutes ?? record.etaMinutes,
    );
    const summaryCandidate = record.summary ?? record.routeSummary ?? record.name;
    const summary =
        typeof summaryCandidate === 'string' && summaryCandidate.trim().length > 0
            ? summaryCandidate.trim()
            : undefined;

    const computedDistanceKm =
        distanceKmFromField ?? (distanceMeters !== null ? distanceMeters / 1000 : 0);
    const computedDurationMin =
        durationMinFromField ?? (durationSeconds !== null ? Math.round(durationSeconds / 60) : 0);
    const metrics =
        computedDistanceKm > 0 || computedDurationMin > 0 || summary
            ? {
                distanceKm: Math.max(computedDistanceKm, 0),
                durationMin: Math.max(Math.round(computedDurationMin), 0),
                summary,
            }
            : null;

    if (normalizedCoordinates.length < 2 && normalizedSteps.length === 0 && !metrics) {
        return null;
    }

    return {
        coordinates: normalizedCoordinates,
        steps: normalizedSteps,
        metrics,
    };
};

const extractBackendRoute = (
    container: unknown,
    provider: 'tracking' | 'delivery',
): BackendRouteCandidate | null => {
    if (!container || typeof container !== 'object') return null;
    const record = container as Record<string, unknown>;

    const containerBasedPayload: DeliveryCalculatedRoute = {
        summary:
            (typeof record.routeSummary === 'string' ? record.routeSummary : undefined) ||
            (typeof record.summary === 'string' ? record.summary : undefined),
        routeCoordinates: Array.isArray(record.routeCoordinates)
            ? (record.routeCoordinates as DeliveryCalculatedRoute['routeCoordinates'])
            : undefined,
        routeSteps: Array.isArray(record.routeSteps)
            ? (record.routeSteps as DeliveryCalculatedRoute['routeSteps'])
            : undefined,
        overviewPolyline:
            typeof record.routePolyline === 'string'
                ? record.routePolyline
                : typeof record.overviewPolyline === 'string'
                    ? record.overviewPolyline
                    : undefined,
        distanceKm: parseNumeric(record.routeDistanceKm) ?? undefined,
        distanceMeters: parseNumeric(record.routeDistanceMeters) ?? undefined,
        durationMin: parseNumeric(record.routeDurationMin) ?? undefined,
        durationSeconds: parseNumeric(record.routeDurationSeconds) ?? undefined,
    };

    const candidates: unknown[] = [
        record.calculatedRoute,
        record.route,
        record.navigation,
        record.itinerary,
        record.routeData,
        record.tripRoute,
        record.trajectory,
        containerBasedPayload,
        record,
    ];

    for (const candidate of candidates) {
        const parsed = parseRoutePayload(candidate);
        if (parsed) {
            return {
                provider,
                coordinates: parsed.coordinates,
                steps: parsed.steps,
                metrics: parsed.metrics,
            };
        }
    }
    return null;
};

const getStageProgressIndex = (status: DeliveryStatusValue): number => {
    if (status === 'pending') return 0;
    if (status === 'assigned') return 1;
    if (status === 'at_pickup') return 2;
    if (status === 'picked_up' || status === 'in_transit') return 3;
    if (status === 'at_dropoff') return 4;
    if (status === 'delivered') return 5;
    return 0;
};

const isDriverShareStatus = (status: DeliveryStatusValue): boolean =>
    ['assigned', 'at_pickup', 'picked_up', 'in_transit', 'at_dropoff'].includes(status);

export function DeliveryDetailScreen({ forcedViewerRole }: DeliveryDetailScreenProps = {}) {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();
    const { user } = useAuth();
    const currentUserId = user?._id || '';
    const mapRef = React.useRef<MapView | null>(null);
    const watchRef = React.useRef<Location.LocationSubscription | null>(null);
    const lastGuidanceCameraRef = React.useRef<{
        center: LatLng;
        heading: number;
        at: number;
    } | null>(null);

    const [qrModalVisible, setQrModalVisible] = React.useState(false);
    const [qrMode, setQrMode] = React.useState<'display' | 'scan'>('scan');
    const [qrDisplayToken, setQrDisplayToken] = React.useState('');
    const [qrModalTitle, setQrModalTitle] = React.useState('Verification QR');
    const [qrModalCaption, setQrModalCaption] = React.useState(
        'Scannez le QR du partenaire puis saisissez le code recu.',
    );
    const [qrInputPlaceholder, setQrInputPlaceholder] = React.useState(
        'Coller/saisir le code QR du partenaire',
    );
    const [qrInput, setQrInput] = React.useState('');
    const [qrAction, setQrAction] = React.useState<null | ((qrData: string) => Promise<any>)>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [isCameraScannerVisible, setIsCameraScannerVisible] = React.useState(false);
    const [isRequestingCameraPermission, setIsRequestingCameraPermission] = React.useState(false);
    const [isScanLocked, setIsScanLocked] = React.useState(false);
    const [messageInput, setMessageInput] = React.useState('');
    const [isLiveSharingEnabled, setIsLiveSharingEnabled] = React.useState(false);
    const [deviceLocation, setDeviceLocation] = React.useState<LatLng | null>(null);
    const [pickupPoint, setPickupPoint] = React.useState<LatLng | null>(null);
    const [dropoffPoint, setDropoffPoint] = React.useState<LatLng | null>(null);
    const [isResolvingPoints, setIsResolvingPoints] = React.useState(false);
    const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);
    const [routeSteps, setRouteSteps] = React.useState<NavigationStep[]>([]);
    const [activeStepIndex, setActiveStepIndex] = React.useState(0);
    const [isGuidanceMode, setIsGuidanceMode] = React.useState(true);
    const [routeMetrics, setRouteMetrics] = React.useState<RouteMetrics | null>(null);
    const [routeSource, setRouteSource] = React.useState<RouteSource>('none');
    const [isMapExpanded, setIsMapExpanded] = React.useState(false);
    const [resolvedPickupAddress, setResolvedPickupAddress] = React.useState('');
    const [resolvedDropoffAddress, setResolvedDropoffAddress] = React.useState('');
    const [pickupAddressLookupDone, setPickupAddressLookupDone] = React.useState(false);
    const [dropoffAddressLookupDone, setDropoffAddressLookupDone] = React.useState(false);
    const [routeRefreshKey, setRouteRefreshKey] = React.useState(0);
    const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<DeliveryWorkspaceTab>('actions');
    const [alert, setAlert] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    const {
        data: delivery,
        isLoading,
        error: deliveryError,
        refetch: refetchDelivery,
    } = useGetDeliveryQuery(deliveryId, { skip: !deliveryId });
    const { data: tracking, refetch: refetchTracking } = useGetDeliveryTrackingQuery(deliveryId, {
        skip: !deliveryId,
        pollingInterval: 5000,
    });
    const { data: messages = [], refetch: refetchMessages } = useGetDeliveryMessagesQuery(deliveryId, {
        skip: !deliveryId,
        pollingInterval: 7000,
    });

    const canBeDeliveryPerson = hasDeliveryRole(user?.roles || []);
    const { data: deliveryProfile } = useGetMyDeliveryPersonProfileQuery(undefined, { skip: !canBeDeliveryPerson });
    const [triggerGeocode] = useLazyGeocodeQuery();
    const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();
    const [fetchDirections, { isLoading: isRouting }] = useGetDirectionsMutation();

    const [acceptDelivery, { isLoading: isAccepting }] = useAcceptDeliveryMutation();
    const [generatePickupQr, { isLoading: isGeneratingPickupQr }] = useGeneratePickupQrMutation();
    const [scanPickupQr, { isLoading: isScanningPickupQr }] = useScanPickupQrMutation();
    const [driverArrivePickup, { isLoading: isArrivingPickup }] = useDriverArrivePickupMutation();
    const [driverArriveDropoff, { isLoading: isArrivingDropoff }] = useDriverArriveDropoffMutation();
    const [generateDropoffQr, { isLoading: isGeneratingDropoffQr }] = useGenerateDropoffQrMutation();
    const [scanDropoffQr, { isLoading: isScanningDropoffQr }] = useScanDropoffQrMutation();
    const [updateDeliveryLocation] = useUpdateDeliveryLocationMutation();
    const [sendDeliveryMessage, { isLoading: isSendingMessage }] = useSendDeliveryMessageMutation();

    const buyerId = getDeliveryActorId(delivery?.buyerId);
    const sellerId = getDeliveryActorId(delivery?.sellerId);
    const deliveryPersonRef = getDeliveryPersonRefId(delivery?.deliveryPersonId);
    const isBuyer = Boolean(currentUserId && buyerId === currentUserId);
    const isSeller = Boolean(currentUserId && sellerId === currentUserId);
    const isAssignedDriver = Boolean(
        canBeDeliveryPerson && deliveryProfile?._id && deliveryPersonRef && deliveryProfile._id === deliveryPersonRef,
    );
    const status = (tracking?.status || delivery?.status || 'pending') as DeliveryStatusValue;
    const stageProgressIndex = getStageProgressIndex(status);
    const autoViewerRole: ViewerRole = isAssignedDriver
        ? 'driver'
        : isSeller
            ? 'seller'
            : isBuyer
                ? 'buyer'
                : 'observer';
    const viewerRole: ViewerRole = forcedViewerRole || autoViewerRole;

    const sellerPickupConfirmed = Boolean(
        (tracking?.sellerPickupConfirmed ?? delivery?.sellerPickupConfirmed) === true,
    );
    const driverPickupConfirmed = Boolean(
        (tracking?.driverPickupConfirmed ?? delivery?.driverPickupConfirmed) === true,
    );
    const buyerDropoffConfirmed = Boolean(
        (tracking?.buyerDropoffConfirmed ?? delivery?.buyerDropoffConfirmed) === true,
    );
    const pickupFullyConfirmed = sellerPickupConfirmed && driverPickupConfirmed;

    const canAcceptDelivery = status === 'pending' && canBeDeliveryPerson;
    const canArrivePickup = isAssignedDriver && status === 'assigned';
    const canArriveDropoff = isAssignedDriver && (status === 'picked_up' || status === 'in_transit');
    const isPickupStep = status === 'assigned' || status === 'at_pickup';
    const isDropoffStep = status === 'at_dropoff';
    const canSellerShowPickupQr = isSeller && isPickupStep && !driverPickupConfirmed;
    const canDriverScanPickupQr = isAssignedDriver && isPickupStep && !driverPickupConfirmed;
    const canDriverShowDropoffQr = isAssignedDriver && isDropoffStep && !buyerDropoffConfirmed;
    const canBuyerScanDropoffQr = isBuyer && isDropoffStep && !buyerDropoffConfirmed;

    const pickupCoordinatesSource = (tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined;
    const dropoffCoordinatesSource = (tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined;
    const pickupCoordinatesKey = Array.isArray(pickupCoordinatesSource?.coordinates)
        ? pickupCoordinatesSource.coordinates.join(',')
        : '';
    const dropoffCoordinatesKey = Array.isArray(dropoffCoordinatesSource?.coordinates)
        ? dropoffCoordinatesSource.coordinates.join(',')
        : '';
    const basePickupLabel = formatLocationLabel(
        tracking?.pickupLocation ?? delivery?.pickupLocation,
        pickupCoordinatesSource,
        'Adresse de retrait indisponible',
    );
    const baseDropoffLabel = formatLocationLabel(
        tracking?.deliveryLocation ?? delivery?.deliveryLocation,
        dropoffCoordinatesSource,
        'Adresse de livraison indisponible',
    );
    const pickupBaseIsCoordinates = Boolean(parseCoordinateString(basePickupLabel));
    const dropoffBaseIsCoordinates = Boolean(parseCoordinateString(baseDropoffLabel));
    const pickupResolvePoint =
        parseGeoPoint(pickupCoordinatesSource) ||
        (pickupBaseIsCoordinates ? parseCoordinateString(basePickupLabel) : null);
    const dropoffResolvePoint =
        parseGeoPoint(dropoffCoordinatesSource) ||
        (dropoffBaseIsCoordinates ? parseCoordinateString(baseDropoffLabel) : null);
    const pickupResolveLat = pickupResolvePoint?.latitude ?? null;
    const pickupResolveLng = pickupResolvePoint?.longitude ?? null;
    const dropoffResolveLat = dropoffResolvePoint?.latitude ?? null;
    const dropoffResolveLng = dropoffResolvePoint?.longitude ?? null;
    const shouldResolvePickupAddress = Boolean(
        pickupResolveLat !== null &&
        pickupResolveLng !== null &&
        (!basePickupLabel || pickupBaseIsCoordinates),
    );
    const shouldResolveDropoffAddress = Boolean(
        dropoffResolveLat !== null &&
        dropoffResolveLng !== null &&
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

    const trackedDriverPoint = React.useMemo(() => {
        const coords = tracking?.currentLocation?.coordinates || delivery?.currentLocation?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) return null;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { latitude: lat, longitude: lng };
    }, [delivery?.currentLocation?.coordinates, tracking?.currentLocation?.coordinates]);

    const driverPoint = trackedDriverPoint || (isAssignedDriver ? deviceLocation : null);

    const headingToPickup =
        !pickupFullyConfirmed &&
        (status === 'pending' || status === 'assigned' || status === 'at_pickup' || status === 'in_transit');
    const activeTargetPoint = headingToPickup ? pickupPoint : dropoffPoint;
    const activeTargetLabel = headingToPickup ? pickupLabel : dropoffLabel;
    const backendRouteCandidate = React.useMemo(() => {
        const trackingRoute = extractBackendRoute(tracking, 'tracking');
        if (trackingRoute) return trackingRoute;
        return extractBackendRoute(delivery, 'delivery');
    }, [delivery, tracking]);
    const routePayloadForCost = React.useMemo<unknown>(() => {
        const trackingRecord = (tracking || {}) as Record<string, unknown>;
        const deliveryRecord = (delivery || {}) as Record<string, unknown>;
        return (
            trackingRecord.route ??
            trackingRecord.calculatedRoute ??
            trackingRecord.navigation ??
            deliveryRecord.route ??
            deliveryRecord.calculatedRoute ??
            deliveryRecord.navigation ??
            null
        );
    }, [delivery, tracking]);

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
                        lat: pickupResolveLat as number,
                        lng: pickupResolveLng as number,
                        language: 'fr',
                    })
                        .unwrap()
                        .catch(() => null)
                    : Promise.resolve(null),
                shouldResolveDropoffAddress
                    ? triggerReverseGeocode({
                        lat: dropoffResolveLat as number,
                        lng: dropoffResolveLng as number,
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
        dropoffResolveLat,
        dropoffResolveLng,
        pickupResolveLat,
        pickupResolveLng,
        shouldResolveDropoffAddress,
        shouldResolvePickupAddress,
        triggerReverseGeocode,
    ]);

    const canShareLiveLocation = isAssignedDriver && isDriverShareStatus(status);

    const mapInitialRegion = React.useMemo(() => {
        const base = activeTargetPoint || pickupPoint || dropoffPoint || driverPoint || DEFAULT_MAP_CENTER;
        return {
            latitude: base.latitude,
            longitude: base.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
        };
    }, [activeTargetPoint, dropoffPoint, driverPoint, pickupPoint]);

    const refetchAll = React.useCallback(async () => {
        await Promise.allSettled([refetchDelivery(), refetchTracking(), refetchMessages()]);
    }, [refetchDelivery, refetchMessages, refetchTracking]);

    const runAction = React.useCallback(
        async (action: () => Promise<any>, successMessage: string) => {
            try {
                await action();
                await refetchAll();
                setAlert({ visible: true, title: 'Succes', message: successMessage, type: 'success' });
            } catch (error: any) {
                setAlert({
                    visible: true,
                    title: 'Erreur',
                    message: parseError(error, 'Operation impossible.'),
                    type: 'error',
                });
            }
        },
        [refetchAll],
    );

    const closeQrModal = () => {
        setQrModalVisible(false);
        setIsCameraScannerVisible(false);
        setIsScanLocked(false);
    };

    const openQrDisplayModal = (config: {
        title: string;
        caption: string;
        displayToken: string;
    }) => {
        setQrMode('display');
        setQrModalTitle(config.title);
        setQrModalCaption(config.caption);
        setQrDisplayToken(config.displayToken);
        setQrInputPlaceholder('');
        setQrInput('');
        setQrAction(null);
        setIsCameraScannerVisible(false);
        setIsScanLocked(false);
        setQrModalVisible(true);
    };

    const openQrScanModal = (config: {
        title: string;
        caption: string;
        inputPlaceholder: string;
        action: (qrData: string) => Promise<any>;
    }) => {
        setQrMode('scan');
        setQrModalTitle(config.title);
        setQrModalCaption(config.caption);
        setQrDisplayToken('');
        setQrInputPlaceholder(config.inputPlaceholder);
        setQrInput('');
        setQrAction(() => config.action);
        setIsCameraScannerVisible(false);
        setIsScanLocked(false);
        setQrModalVisible(true);
    };

    const onValidateQr = async () => {
        if (qrMode !== 'scan') {
            closeQrModal();
            return;
        }

        const normalizedInput = qrInput.trim();
        if (!normalizedInput) {
            setAlert({
                visible: true,
                title: 'QR requis',
                message: 'Scannez ou saisissez un code QR valide.',
                type: 'warning',
            });
            return;
        }

        if (qrAction) {
            await runAction(() => qrAction(normalizedInput), 'Confirmation enregistree.');
            closeQrModal();
        }
    };

    const onOpenCameraScanner = async () => {
        if (qrMode !== 'scan') return;

        if (cameraPermission?.granted) {
            setIsScanLocked(false);
            setIsCameraScannerVisible(true);
            return;
        }

        setIsRequestingCameraPermission(true);
        try {
            const permission = await requestCameraPermission();
            if (!permission?.granted) {
                setAlert({
                    visible: true,
                    title: 'Camera refusee',
                    message:
                        permission?.canAskAgain === false
                            ? 'Activez l acces camera dans les parametres du telephone.'
                            : 'Autorisez la camera pour scanner le QR.',
                    type: 'warning',
                });
                return;
            }

            setIsScanLocked(false);
            setIsCameraScannerVisible(true);
        } finally {
            setIsRequestingCameraPermission(false);
        }
    };

    const onCameraQrScanned = ({ data }: { data?: string }) => {
        if (isScanLocked) return;
        const value = (data || '').trim();
        if (!value) return;

        setIsScanLocked(true);
        setQrInput(value);
        setIsCameraScannerVisible(false);
        setAlert({
            visible: true,
            title: 'QR detecte',
            message: 'Code QR capture. Validez pour continuer.',
            type: 'success',
        });
    };

    const onSellerShowPickupQr = async () => {
        if (!deliveryId) return;
        try {
            const payload = await generatePickupQr(deliveryId).unwrap();
            const expiresAt = payload?.expiresAt
                ? new Date(payload.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : null;
            openQrDisplayModal({
                title: 'QR commande',
                caption: expiresAt
                    ? `Montrez ce QR au livreur (valide jusqu a ${expiresAt}).`
                    : 'Montrez ce QR au livreur. Le livreur doit le scanner pour declencher le debut de livraison.',
                displayToken: payload.qrPayload,
            });
        } catch (error: any) {
            setAlert({
                visible: true,
                title: 'Erreur',
                message: parseError(error, 'Impossible de preparer le QR commande.'),
                type: 'error',
            });
        }
    };

    const onDriverShowDropoffQr = async () => {
        if (!deliveryId) return;
        try {
            const payload = await generateDropoffQr(deliveryId).unwrap();
            const expiresAt = payload?.expiresAt
                ? new Date(payload.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : null;
            openQrDisplayModal({
                title: 'QR livraison',
                caption: expiresAt
                    ? `Montrez ce QR a l acheteur (valide jusqu a ${expiresAt}).`
                    : 'Montrez ce QR a l acheteur. L acheteur doit le scanner pour valider la fin de livraison.',
                displayToken: payload.qrPayload,
            });
        } catch (error: any) {
            setAlert({
                visible: true,
                title: 'Erreur',
                message: parseError(error, 'Impossible de preparer le QR livraison.'),
                type: 'error',
            });
        }
    };

    const onSendMessage = async () => {
        const content = messageInput.trim();
        if (!content || !deliveryId) return;
        await runAction(() => sendDeliveryMessage({ id: deliveryId, message: content }).unwrap(), 'Message envoye.');
        setMessageInput('');
    };

    React.useEffect(() => {
        if (!deliveryId) return;
        let cancelled = false;

        const resolvePoint = async (label: string, directPoint?: LatLng | null): Promise<LatLng | null> => {
            if (directPoint) return directPoint;
            const parsed = parseCoordinateString(label);
            if (parsed) return parsed;
            if (!label.trim()) return null;

            try {
                const response = await triggerGeocode({ address: label.trim(), language: 'fr' }).unwrap();
                const lat = Number(response?.lat);
                const lng = Number(response?.lng);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                return { latitude: lat, longitude: lng };
            } catch {
                return null;
            }
        };

        const pickupDirect = parseGeoPoint(pickupCoordinatesSource);
        const dropoffDirect = parseGeoPoint(dropoffCoordinatesSource);

        setIsResolvingPoints(true);
        (async () => {
            const [pickup, dropoff] = await Promise.all([
                resolvePoint(basePickupLabel, pickupDirect),
                resolvePoint(baseDropoffLabel, dropoffDirect),
            ]);
            if (cancelled) return;
            setPickupPoint(pickup);
            setDropoffPoint(dropoff);
            setIsResolvingPoints(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [
        deliveryId,
        baseDropoffLabel,
        basePickupLabel,
        pickupCoordinatesKey,
        dropoffCoordinatesKey,
        triggerGeocode,
        pickupCoordinatesSource,
        dropoffCoordinatesSource,
    ]);

    React.useEffect(() => {
        if (!canShareLiveLocation && isLiveSharingEnabled) {
            setIsLiveSharingEnabled(false);
        }
    }, [canShareLiveLocation, isLiveSharingEnabled]);

    React.useEffect(() => {
        if (!deliveryId || !isLiveSharingEnabled || !canShareLiveLocation) {
            return;
        }

        let cancelled = false;
        watchRef.current?.remove();
        watchRef.current = null;

        const pushLocation = async (point: LatLng) => {
            if (cancelled) return;
            setDeviceLocation(point);
            try {
                await updateDeliveryLocation({
                    id: deliveryId,
                    latitude: point.latitude,
                    longitude: point.longitude,
                }).unwrap();
            } catch {
                // Ignore transient location failures.
            }
        };

        (async () => {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (cancelled) return;
            if (permission.status !== 'granted') {
                setIsLiveSharingEnabled(false);
                setAlert({
                    visible: true,
                    title: 'Permission requise',
                    message: 'Autorisez la localisation pour activer le suivi en temps reel.',
                    type: 'warning',
                });
                return;
            }

            const currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (cancelled) return;
            await pushLocation({
                latitude: currentPosition.coords.latitude,
                longitude: currentPosition.coords.longitude,
            });

            watchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 10,
                    timeInterval: 7000,
                },
                (position) => {
                    void pushLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
            );
        })();

        return () => {
            cancelled = true;
            watchRef.current?.remove();
            watchRef.current = null;
        };
    }, [canShareLiveLocation, deliveryId, isLiveSharingEnabled, updateDeliveryLocation]);
    React.useEffect(() => {
        if (!driverPoint || !activeTargetPoint) {
            setRouteCoordinates([]);
            setRouteMetrics(null);
            setRouteSteps([]);
            setRouteSource('none');
            setActiveStepIndex(0);
            return;
        }

        if (backendRouteCandidate) {
            setRouteCoordinates(
                backendRouteCandidate.coordinates.length >= 2
                    ? backendRouteCandidate.coordinates
                    : [driverPoint, activeTargetPoint],
            );
            setRouteMetrics(backendRouteCandidate.metrics);
            setRouteSteps(backendRouteCandidate.steps);
            setRouteSource('backend');
            setActiveStepIndex(0);
            return;
        }

        let cancelled = false;
        const timeout = setTimeout(async () => {
            try {
                const response = await fetchDirections({
                    origin: { lat: driverPoint.latitude, lng: driverPoint.longitude },
                    destination: { lat: activeTargetPoint.latitude, lng: activeTargetPoint.longitude },
                    language: 'fr',
                }).unwrap();

                if (cancelled) return;

                const firstRoute = response?.routes?.[0];
                const parsedGoogleRoute = parseRoutePayload(firstRoute);
                setRouteCoordinates(
                    parsedGoogleRoute?.coordinates && parsedGoogleRoute.coordinates.length >= 2
                        ? parsedGoogleRoute.coordinates
                        : [driverPoint, activeTargetPoint],
                );
                setRouteMetrics(parsedGoogleRoute?.metrics || null);
                setRouteSteps(parsedGoogleRoute?.steps || []);
                setRouteSource('google');
                setActiveStepIndex(0);
            } catch {
                if (cancelled) return;
                setRouteCoordinates([driverPoint, activeTargetPoint]);
                setRouteMetrics(null);
                setRouteSteps([]);
                setRouteSource('fallback');
                setActiveStepIndex(0);
            }
        }, 450);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [
        activeTargetPoint,
        backendRouteCandidate,
        driverPoint,
        fetchDirections,
        routeRefreshKey,
    ]);

    React.useEffect(() => {
        if (isGuidanceMode) return;
        if (!isMapExpanded) return;
        if (!mapRef.current) return;
        const points = [pickupPoint, dropoffPoint, driverPoint].filter(Boolean) as LatLng[];
        if (points.length === 0) return;

        const timeout = setTimeout(() => {
            mapRef.current?.fitToCoordinates(points, {
                edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
                animated: true,
            });
        }, 250);

        return () => clearTimeout(timeout);
    }, [driverPoint, dropoffPoint, isGuidanceMode, isMapExpanded, pickupPoint, routeCoordinates.length]);

    React.useEffect(() => {
        if (!driverPoint || routeSteps.length === 0) {
            setActiveStepIndex(0);
            return;
        }

        setActiveStepIndex((previous) => {
            let next = Math.min(previous, routeSteps.length - 1);
            while (next < routeSteps.length - 1) {
                const distanceToStepEnd = haversineMeters(driverPoint, routeSteps[next].end);
                if (distanceToStepEnd <= 35) {
                    next += 1;
                } else {
                    break;
                }
            }
            return next;
        });
    }, [driverPoint, routeSteps]);

    React.useEffect(() => {
        if (!isGuidanceMode || !isMapExpanded || !mapRef.current || !driverPoint) {
            return;
        }

        const targetForBearing = activeTargetPoint || routeSteps[activeStepIndex]?.end;
        const heading = targetForBearing ? bearingDegrees(driverPoint, targetForBearing) : 0;
        const now = Date.now();
        const previousCamera = lastGuidanceCameraRef.current;
        if (previousCamera) {
            const movedMeters = haversineMeters(previousCamera.center, driverPoint);
            const rawDelta = Math.abs(heading - previousCamera.heading);
            const headingDelta = Math.min(rawDelta, 360 - rawDelta);
            const elapsed = now - previousCamera.at;
            if (movedMeters < 9 && headingDelta < 12 && elapsed < 1000) {
                return;
            }
        }
        lastGuidanceCameraRef.current = {
            center: driverPoint,
            heading,
            at: now,
        };

        mapRef.current.animateCamera(
            {
                center: driverPoint,
                heading,
                pitch: 50,
                zoom: 17,
            },
            { duration: 700 },
        );
    }, [activeStepIndex, activeTargetPoint, driverPoint, isGuidanceMode, isMapExpanded, routeSteps]);

    React.useEffect(() => {
        if (!isGuidanceMode || !isMapExpanded) {
            lastGuidanceCameraRef.current = null;
        }
    }, [isGuidanceMode, isMapExpanded]);

    const recenterMap = React.useCallback(() => {
        if (!mapRef.current) return;
        const points = [driverPoint, activeTargetPoint, pickupPoint, dropoffPoint].filter(Boolean) as LatLng[];
        if (points.length === 0) return;

        if (isGuidanceMode && driverPoint) {
            const targetForBearing = activeTargetPoint || routeSteps[activeStepIndex]?.end;
            const heading = targetForBearing ? bearingDegrees(driverPoint, targetForBearing) : 0;
            mapRef.current.animateCamera(
                {
                    center: driverPoint,
                    heading,
                    pitch: 50,
                    zoom: 17,
                },
                { duration: 650 },
            );
            return;
        }

        mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
            animated: true,
        });
    }, [
        activeStepIndex,
        activeTargetPoint,
        driverPoint,
        dropoffPoint,
        isGuidanceMode,
        pickupPoint,
        routeSteps,
    ]);

    const openRealtimeNavigation = async () => {
        if (!activeTargetPoint) {
            setAlert({
                visible: true,
                title: 'Navigation indisponible',
                message: 'Destination introuvable pour cette livraison.',
                type: 'warning',
            });
            return;
        }

        const origin = driverPoint ? `${driverPoint.latitude},${driverPoint.longitude}` : undefined;
        const destination = `${activeTargetPoint.latitude},${activeTargetPoint.longitude}`;
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
            if (!supported) throw new Error('unsupported');
            await Linking.openURL(url);
        } catch {
            setAlert({
                visible: true,
                title: 'Ouverture impossible',
                message: 'Impossible d ouvrir la navigation externe pour le moment.',
                type: 'error',
            });
        }
    };

    const distanceLabel = routeMetrics && routeMetrics.distanceKm > 0
        ? `${routeMetrics.distanceKm.toFixed(1)} km`
        : 'Distance -';
    const durationLabel = routeMetrics && routeMetrics.durationMin > 0
        ? `${routeMetrics.durationMin} min`
        : 'Duree -';
    const routeModeLabel = React.useMemo(() => {
        const payload =
            (routePayloadForCost as Record<string, unknown> | null | undefined) || null;
        const rawMode = payload?.mode ?? payload?.travelMode ?? payload?.transportMode;
        const normalizedMode =
            typeof rawMode === 'string' ? rawMode.trim().toLowerCase() : '';
        if (normalizedMode === 'walking') return 'Marche';
        if (normalizedMode === 'bicycling' || normalizedMode === 'bicycle') return 'Velo';
        if (normalizedMode === 'driving' || normalizedMode === 'car') return 'Voiture';
        return 'Standard';
    }, [routePayloadForCost]);
    const routeSourceLabel =
        routeSource === 'backend'
            ? 'Trajet backend'
            : routeSource === 'google'
                ? 'Trajet live'
                : routeSource === 'fallback'
                    ? 'Trajet direct'
                    : 'Trajet en attente';
    const startPointLabel = isAssignedDriver
        ? 'Ma position actuelle'
        : driverPoint
            ? `${driverPoint.latitude.toFixed(5)}, ${driverPoint.longitude.toFixed(5)}`
            : 'Position livreur indisponible';
    const activeInstruction = routeSteps[activeStepIndex];
    const nextInstructions = routeSteps.slice(activeStepIndex + 1, activeStepIndex + 3);
    const instructionDistanceLabel =
        activeInstruction && activeInstruction.distanceMeters > 0
            ? `${Math.round(activeInstruction.distanceMeters)} m`
            : null;
    const availableActionsCount = [
        canAcceptDelivery,
        canArrivePickup,
        canSellerShowPickupQr,
        canDriverScanPickupQr,
        canArriveDropoff,
        canDriverShowDropoffQr,
        canBuyerScanDropoffQr,
    ].filter(Boolean).length;
    const prioritizedStepActions: StepActionItem[] = (() => {
        const actions: StepActionItem[] = [];

        if (canAcceptDelivery) {
            actions.push({
                key: 'accept-delivery',
                title: 'Accepter la livraison',
                subtitle: 'Attribuer cette course',
                icon: 'checkmark-circle-outline',
                loading: isAccepting,
                onPress: () =>
                    void runAction(
                        () => acceptDelivery(deliveryId).unwrap(),
                        'Livraison acceptee.',
                    ),
            });
        }

        if (canArrivePickup) {
            actions.push({
                key: 'arrive-pickup',
                title: 'Confirmer arrivee au retrait',
                subtitle: 'Le livreur est chez le vendeur',
                icon: 'storefront-outline',
                loading: isArrivingPickup,
                onPress: () =>
                    void runAction(
                        () => driverArrivePickup(deliveryId).unwrap(),
                        'Arrivee au retrait confirmee.',
                    ),
            });
        }

        if (canSellerShowPickupQr) {
            actions.push({
                key: 'show-pickup-qr',
                title: 'Afficher QR de retrait',
                subtitle: 'A montrer au livreur',
                icon: 'qr-code-outline',
                loading: isGeneratingPickupQr,
                onPress: () => void onSellerShowPickupQr(),
            });
        }

        if (canDriverScanPickupQr) {
            actions.push({
                key: 'scan-pickup-qr',
                title: 'Scanner QR vendeur',
                subtitle: 'Valide le retrait',
                icon: 'scan-outline',
                loading: isScanningPickupQr,
                onPress: () =>
                    openQrScanModal({
                        title: 'Scan QR commande',
                        caption: 'Scannez le QR montre par le vendeur pour lancer la livraison.',
                        inputPlaceholder: 'Code QR commande du vendeur',
                        action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap(),
                    }),
            });
        }

        if (canArriveDropoff) {
            actions.push({
                key: 'arrive-dropoff',
                title: 'Confirmer arrivee a destination',
                subtitle: 'Le livreur est chez l acheteur',
                icon: 'location-outline',
                loading: isArrivingDropoff,
                onPress: () =>
                    void runAction(
                        () => driverArriveDropoff(deliveryId).unwrap(),
                        'Arrivee a destination confirmee.',
                    ),
            });
        }

        if (canDriverShowDropoffQr) {
            actions.push({
                key: 'show-dropoff-qr',
                title: 'Afficher QR livraison',
                subtitle: 'A montrer a l acheteur',
                icon: 'qr-code-outline',
                loading: isGeneratingDropoffQr,
                onPress: () => void onDriverShowDropoffQr(),
            });
        }

        if (canBuyerScanDropoffQr) {
            actions.push({
                key: 'scan-dropoff-qr',
                title: 'Scanner QR livraison',
                subtitle: 'Confirme la reception',
                icon: 'scan-outline',
                loading: isScanningDropoffQr,
                onPress: () =>
                    openQrScanModal({
                        title: 'Scan QR livraison',
                        caption: 'Scannez le QR montre par le livreur pour valider la fin de livraison.',
                        inputPlaceholder: 'Code QR livraison du livreur',
                        action: (qrData) => scanDropoffQr({ id: deliveryId, qrData }).unwrap(),
                    }),
            });
        }

        return actions;
    })();
    const progressionSummary = `${Math.min(stageProgressIndex + 1, DELIVERY_STAGE_ORDER.length)}/${DELIVERY_STAGE_ORDER.length}`;
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const latestMessagePreview = latestMessage?.message?.trim()
        ? latestMessage.message.trim()
        : 'Aucun message pour le moment.';
    const workspaceTabs: {
        key: DeliveryWorkspaceTab;
        label: string;
        icon: keyof typeof Ionicons.glyphMap;
        badge: string;
    }[] = [
            {
                key: 'navigation',
                label: 'Navigation',
                icon: isGuidanceMode ? 'navigate' : 'map-outline',
                badge: durationLabel,
            },
            { key: 'actions', label: 'Actions', icon: 'flash-outline', badge: `${availableActionsCount}` },
            { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', badge: `${messages.length}` },
        ];
    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;
    if (deliveryError || !delivery) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerBody}>
                        <Text style={styles.headerTitle}>Livraison</Text>
                        <Text style={styles.headerSubtitle}>Chargement impossible</Text>
                    </View>
                    <TouchableOpacity style={styles.headerButton} onPress={refetchAll}>
                        <Ionicons name="refresh" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorWrap}>
                    <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
                    <Text style={styles.errorTitle}>Livraison introuvable</Text>
                    <Text style={styles.errorText}>Verifiez l ID de livraison ou vos permissions d acces.</Text>
                    <Button title="Reessayer" variant="secondary" onPress={refetchAll} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerBody}>
                    <Text style={styles.headerTitle}>Livraison #{deliveryId.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.headerSubtitle}>{DELIVERY_STATUS_LABELS[status] || status}</Text>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={refetchAll}>
                    <Ionicons name="refresh" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.mapExperienceCard, !isMapExpanded && styles.mapExperienceCardCollapsed]}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                        initialRegion={mapInitialRegion}
                        showsUserLocation={isAssignedDriver}
                    >
                        {pickupPoint ? (
                            <Marker
                                coordinate={pickupPoint}
                                title="Point de retrait"
                                description={pickupLabel || undefined}
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={false}
                                tracksInfoWindowChanges={false}
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
                                description={dropoffLabel || undefined}
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={false}
                                tracksInfoWindowChanges={false}
                            >
                                <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.success }]}>
                                    <Ionicons name="location" size={16} color={Colors.white} />
                                </View>
                            </Marker>
                        ) : null}
                        {driverPoint ? (
                            <Marker
                                coordinate={driverPoint}
                                title="Position livreur"
                                anchor={{ x: 0.5, y: 0.5 }}
                                tracksViewChanges={false}
                                tracksInfoWindowChanges={false}
                            >
                                <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.primary }]}>
                                    <Ionicons name="bicycle" size={15} color={Colors.white} />
                                </View>
                            </Marker>
                        ) : null}
                        {routeCoordinates.length >= 2 ? (
                            <>
                                <Polyline coordinates={routeCoordinates} strokeWidth={9} strokeColor={Colors.white + 'EA'} />
                                <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor={Colors.primaryLight} />
                            </>
                        ) : null}
                    </MapView>

                    <TouchableOpacity
                        style={styles.mapExpandToggle}
                        onPress={() => setIsMapExpanded((value) => !value)}
                        activeOpacity={0.9}
                    >
                        <Ionicons
                            name={isMapExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={Colors.primary}
                        />
                        <Text style={styles.mapExpandToggleText}>
                            {isMapExpanded ? 'Replier la carte' : 'Deplier la carte'}
                        </Text>
                    </TouchableOpacity>

                    {isMapExpanded ? (
                        <>
                    <View style={styles.routePlannerCard}>
                        <View style={styles.routePlannerIcons}>
                            <Ionicons name="radio-button-on" size={12} color={Colors.primaryLight} />
                            <View style={styles.routePlannerConnector} />
                            <Ionicons name="location" size={14} color={Colors.primary} />
                        </View>
                        <View style={styles.routePlannerBody}>
                            <Text style={styles.routePlannerLabel}>Point de depart</Text>
                            <Text style={styles.routePlannerValue} numberOfLines={1}>
                                {startPointLabel}
                            </Text>
                            <View style={styles.routePlannerDivider} />
                            <Text style={styles.routePlannerLabel}>
                                {headingToPickup ? 'Point de retrait' : 'Point de livraison'}
                            </Text>
                            <Text style={styles.routePlannerValue} numberOfLines={2}>
                                {activeTargetLabel || 'Destination non definie'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.routePlannerAction}
                            onPress={() => {
                                if (routeSource === 'backend') {
                                    void refetchAll();
                                    return;
                                }
                                setRouteRefreshKey((value) => value + 1);
                            }}
                        >
                            <Ionicons
                                name={routeSource === 'backend' ? 'sync-outline' : 'swap-vertical'}
                                size={18}
                                color={Colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    {isGuidanceMode ? (
                        <View style={styles.guidanceTopCard}>
                            <View style={styles.guidanceInstructionRow}>
                                <View style={styles.guidanceInstructionIconWrap}>
                                    <Ionicons
                                        name={instructionIcon(activeInstruction?.instruction)}
                                        size={18}
                                        color={Colors.white}
                                    />
                                </View>
                                <View style={styles.guidanceInstructionTextWrap}>
                                    <Text style={styles.guidanceInstructionTitle} numberOfLines={2}>
                                        {activeInstruction?.instruction || 'Suivez le trace de navigation'}
                                    </Text>
                                    <Text style={styles.guidanceInstructionMeta}>
                                        {instructionDistanceLabel || 'Instruction en cours de calcul'}
                                    </Text>
                                </View>
                            </View>
                            {nextInstructions[0] ? (
                                <Text style={styles.guidanceNextInstruction} numberOfLines={1}>
                                    Puis: {nextInstructions[0].instruction}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}

                    <TouchableOpacity style={styles.recenterFab} onPress={recenterMap}>
                        <Ionicons name="locate" size={18} color={Colors.primary} />
                    </TouchableOpacity>

                    {isGuidanceMode ? (
                        <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.guidanceBottomCard}>
                            <View style={styles.guidanceBottomMetrics}>
                                <View style={styles.guidanceMetricWrap}>
                                    <Ionicons name="navigate" size={17} color={Colors.white} />
                                    <Text style={styles.guidanceEta}>{durationLabel}</Text>
                                </View>
                                <Text style={styles.guidanceDistance}>{distanceLabel}</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.navLaunchButton,
                                        !activeTargetPoint && styles.mapActionButtonDisabled,
                                    ]}
                                    disabled={!activeTargetPoint}
                                    onPress={openRealtimeNavigation}
                                >
                                    <Ionicons name="compass" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.guidanceDestination} numberOfLines={1}>
                                {activeInstruction?.instruction || `Vers ${activeTargetLabel || 'la destination'}`}
                            </Text>
                        </LinearGradient>
                    ) : null}

                    {isResolvingPoints ? (
                        <View style={styles.mapOverlayInfo}>
                            <Ionicons name="sync-outline" size={14} color={Colors.primary} />
                            <Text style={styles.mapOverlayText}>Resolution des points...</Text>
                        </View>
                    ) : null}
                        </>
                    ) : (
                        <View style={styles.mapCollapsedInfo}>
                            <Ionicons name="pin-outline" size={14} color={Colors.primary} />
                            <Text style={styles.mapCollapsedInfoText} numberOfLines={1}>
                                {activeTargetLabel || 'Carte repliee'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.workspaceCard}>
                    <View style={styles.workspaceHeader}>
                        <View style={styles.workspaceHeaderTextWrap}>
                            <Text style={styles.workspaceTitle}>Pilotage livraison</Text>
                            <Text style={styles.workspaceSubtitle}>
                                {viewerRole === 'driver'
                                    ? 'Vue livreur simplifiee.'
                                    : viewerRole === 'seller'
                                        ? 'Vue vendeur simplifiee.'
                                        : viewerRole === 'buyer'
                                            ? 'Vue acheteur simplifiee.'
                                            : 'Navigation, actions et messages uniquement.'}
                            </Text>
                        </View>
                        <View style={styles.workspaceStatusPill}>
                            <Text style={styles.workspaceStatusText}>
                                {progressionSummary} - {DELIVERY_STATUS_LABELS[status] || status}
                            </Text>
                        </View>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.workspaceTabsRow}
                    >
                        {workspaceTabs.map((tab) => {
                            const isActive = activeWorkspaceTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[
                                        styles.workspaceTabButton,
                                        isActive && styles.workspaceTabButtonActive,
                                    ]}
                                    onPress={() => setActiveWorkspaceTab(tab.key)}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={14}
                                        color={isActive ? Colors.white : Colors.primary}
                                    />
                                    <Text
                                        style={[
                                            styles.workspaceTabText,
                                            isActive && styles.workspaceTabTextActive,
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.workspaceTabBadge,
                                            isActive && styles.workspaceTabBadgeActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.workspaceTabBadgeText,
                                                isActive && styles.workspaceTabBadgeTextActive,
                                            ]}
                                        >
                                            {tab.badge}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {activeWorkspaceTab === 'navigation' ? (
                        <View style={styles.workspacePanel}>
                            <View style={styles.mapHeader}>
                                <View style={styles.mapHeaderActions}>
                                    <TouchableOpacity
                                        style={[styles.mapModeButton, isGuidanceMode && styles.mapModeButtonActive]}
                                        onPress={() => setIsGuidanceMode((value) => !value)}
                                    >
                                        <Ionicons
                                            name={isGuidanceMode ? 'navigate' : 'map-outline'}
                                            size={14}
                                            color={isGuidanceMode ? Colors.white : Colors.primary}
                                        />
                                        <Text
                                            style={[
                                                styles.mapModeButtonText,
                                                isGuidanceMode && styles.mapModeButtonTextActive,
                                            ]}
                                        >
                                            {isGuidanceMode ? 'Guidage' : 'Carte'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.mapRefreshButton}
                                        onPress={() => {
                                            if (routeSource === 'backend') {
                                                void refetchAll();
                                                return;
                                            }
                                            setRouteRefreshKey((value) => value + 1);
                                        }}
                                    >
                                        <Ionicons name="refresh" size={15} color={Colors.primary} />
                                        <Text style={styles.mapRefreshText}>
                                            {routeSource === 'backend'
                                                ? 'Sync backend'
                                                : isRouting
                                                    ? 'Calcul...'
                                                    : 'Recalculer'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.mapFoldButton,
                                            !isMapExpanded && styles.mapFoldButtonCollapsed,
                                        ]}
                                        onPress={() => setIsMapExpanded((value) => !value)}
                                    >
                                        <Ionicons
                                            name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
                                            size={14}
                                            color={isMapExpanded ? Colors.primary : Colors.white}
                                        />
                                        <Text
                                            style={[
                                                styles.mapFoldButtonText,
                                                !isMapExpanded && styles.mapFoldButtonTextCollapsed,
                                            ]}
                                        >
                                            {isMapExpanded ? 'Replier' : 'Deplier'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.mapActionsRow}>
                                <TouchableOpacity
                                    style={[styles.mapActionButton, !activeTargetPoint && styles.mapActionButtonDisabled]}
                                    onPress={openRealtimeNavigation}
                                    disabled={!activeTargetPoint}
                                >
                                    <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                    <Text style={styles.mapActionText}>Ouvrir Google Maps</Text>
                                </TouchableOpacity>
                                {isAssignedDriver ? (
                                    <TouchableOpacity
                                        style={[
                                            styles.mapActionSecondary,
                                            (isLiveSharingEnabled || !canShareLiveLocation) && styles.mapActionSecondaryActive,
                                            !canShareLiveLocation && styles.mapActionButtonDisabled,
                                        ]}
                                        disabled={!canShareLiveLocation}
                                        onPress={() => setIsLiveSharingEnabled((value) => !value)}
                                    >
                                        <Ionicons
                                            name={isLiveSharingEnabled ? 'radio-button-on' : 'radio-button-off'}
                                            size={16}
                                            color={isLiveSharingEnabled ? Colors.white : Colors.primary}
                                        />
                                        <Text
                                            style={[
                                                styles.mapActionSecondaryText,
                                                isLiveSharingEnabled && styles.mapActionSecondaryTextActive,
                                            ]}
                                        >
                                            {isLiveSharingEnabled ? 'Partage actif' : 'Partager position'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.mapActionSecondary} onPress={recenterMap}>
                                        <Ionicons name="locate-outline" size={16} color={Colors.primary} />
                                        <Text style={styles.mapActionSecondaryText}>Recentrer</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.mapHintGrid}>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>Statut</Text>
                                    <Text style={styles.mapHintValue}>
                                        {DELIVERY_STATUS_LABELS[status] || status}
                                    </Text>
                                </View>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>Destination</Text>
                                    <Text style={styles.mapHintValue} numberOfLines={1}>
                                        {activeTargetLabel || '-'}
                                    </Text>
                                </View>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>ETA / Distance</Text>
                                    <Text style={styles.mapHintValue} numberOfLines={1}>
                                        {durationLabel} - {distanceLabel}
                                    </Text>
                                </View>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>Trajet</Text>
                                    <Text style={styles.mapHintValue} numberOfLines={1}>
                                        {routeModeLabel} - {routeSourceLabel}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    {activeWorkspaceTab === 'actions' ? (
                        <View style={styles.workspacePanel}>
                            <View style={styles.priorityActionsHeader}>
                                <View>
                                    <Text style={styles.priorityActionsTitle}>Actions prioritaires</Text>
                                    <Text style={styles.priorityActionsSubtitle}>
                                        Etape actuelle: {DELIVERY_STATUS_LABELS[status] || status}
                                    </Text>
                                </View>
                                <View style={styles.priorityActionsMeta}>
                                    <Text style={styles.priorityActionsMetaText}>
                                        {availableActionsCount} action(s)
                                    </Text>
                                </View>
                            </View>

                            {prioritizedStepActions.length > 0 ? (
                                prioritizedStepActions.map((action, index) => (
                                    <View key={action.key} style={styles.priorityActionRow}>
                                        <View style={styles.priorityActionInfo}>
                                            <View style={styles.priorityActionIcon}>
                                                <Ionicons
                                                    name={action.icon}
                                                    size={16}
                                                    color={Colors.primary}
                                                />
                                            </View>
                                            <View style={styles.priorityActionTextWrap}>
                                                <Text style={styles.priorityActionTitle}>{action.title}</Text>
                                                <Text style={styles.priorityActionSubtitle}>{action.subtitle}</Text>
                                            </View>
                                        </View>
                                        <Button
                                            title={index === 0 ? 'Executer' : 'Lancer'}
                                            variant={index === 0 ? 'secondary' : 'outline'}
                                            size="sm"
                                            loading={action.loading}
                                            onPress={action.onPress}
                                        />
                                    </View>
                                ))
                            ) : (
                                <View style={styles.noActionState}>
                                    <Ionicons name="time-outline" size={18} color={Colors.gray500} />
                                    <Text style={styles.noActionStateText}>
                                        Aucune action immediate. Suivez la progression de livraison.
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {activeWorkspaceTab === 'messages' ? (
                        <View style={styles.workspacePanel}>
                            <View style={styles.workspaceMessagesHeader}>
                                <Text style={styles.priorityActionsTitle}>Messages</Text>
                                <Text style={styles.priorityActionsSubtitle}>{latestMessagePreview}</Text>
                            </View>
                            <ScrollView
                                style={styles.messagesList}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                            >
                                {messages.map((msg, index) => (
                                    <View
                                        key={`${msg.sentAt}-${index}`}
                                        style={[
                                            styles.msgBubble,
                                            getDeliveryActorId(msg.senderId) === currentUserId
                                                ? styles.msgBubbleOwn
                                                : styles.msgBubbleOther,
                                        ]}
                                    >
                                        <View style={styles.msgHead}>
                                            <Text style={styles.msgRole}>
                                                {msg.senderRole.replace('_', ' ')}
                                            </Text>
                                            <Text style={styles.msgTime}>{formatClockTime(msg.sentAt)}</Text>
                                        </View>
                                        <Text style={styles.msgText}>{msg.message}</Text>
                                    </View>
                                ))}
                                {messages.length === 0 ? (
                                    <Text style={styles.infoText}>Aucun message.</Text>
                                ) : null}
                            </ScrollView>
                            <View style={styles.msgComposer}>
                                <TextInput
                                    style={styles.msgInput}
                                    value={messageInput}
                                    onChangeText={setMessageInput}
                                    placeholder="Ecrire un message..."
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.sendBtn,
                                        (!messageInput.trim() || isSendingMessage) && styles.sendBtnDisabled,
                                    ]}
                                    onPress={onSendMessage}
                                    disabled={!messageInput.trim() || isSendingMessage}
                                >
                                    <Ionicons name="send" size={16} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}
                </View>
            </ScrollView>

            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={closeQrModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.modalTopStripe} />
                        <View style={styles.modalIconWrap}>
                            <Ionicons name="qr-code-outline" size={26} color={Colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>{qrModalTitle}</Text>
                        <Text style={styles.modalCaption}>{qrModalCaption}</Text>
                        {qrDisplayToken ? (
                            <View style={styles.qrBlock}>
                                <Text style={styles.qrLabel}>Votre QR a presenter</Text>
                                <QrCodeMatrix
                                    value={qrDisplayToken}
                                    size={170}
                                    style={styles.qrImage}
                                />
                                <Text style={styles.qrCode}>{qrDisplayToken}</Text>
                            </View>
                        ) : null}
                        {qrMode === 'scan' ? (
                            <>
                                <View style={styles.modalHintBox}>
                                    <Ionicons name="scan-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.modalHintText}>Scannez avec la camera ou collez le code QR</Text>
                                </View>
                                {!isCameraScannerVisible ? (
                                    <TouchableOpacity
                                        style={styles.cameraLaunchButton}
                                        onPress={onOpenCameraScanner}
                                        disabled={isRequestingCameraPermission}
                                    >
                                        <Ionicons name="camera-outline" size={16} color={Colors.white} />
                                        <Text style={styles.cameraLaunchButtonText}>
                                            {isRequestingCameraPermission ? 'Autorisation camera...' : 'Scanner avec la camera'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.cameraPreviewWrap}>
                                        <CameraView
                                            style={styles.cameraPreview}
                                            facing="back"
                                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                            onBarcodeScanned={isScanLocked ? undefined : onCameraQrScanned}
                                        />
                                        <View style={styles.cameraGuideBox} />
                                        <TouchableOpacity
                                            style={styles.cameraCloseButton}
                                            onPress={() => setIsCameraScannerVisible(false)}
                                        >
                                            <Ionicons name="close" size={16} color={Colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <TextInput style={styles.modalInput} placeholder={qrInputPlaceholder} value={qrInput} onChangeText={setQrInput} autoCapitalize="characters" />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.modalGhost} onPress={closeQrModal}>
                                        <Text style={styles.modalGhostText}>Annuler</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalPrimary} onPress={onValidateQr}>
                                        <Text style={styles.modalPrimaryText}>Valider</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <TouchableOpacity style={styles.modalSingleAction} onPress={closeQrModal}>
                                <Text style={styles.modalPrimaryText}>Fermer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onConfirm={() => setAlert((prev) => ({ ...prev, visible: false }))} />
        </SafeAreaView>
    );
}

export default function DeliveryDetailRouteScreen() {
    return <DeliveryDetailScreen />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EDF2FC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.white + 'F4',
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary + '15',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    headerBody: { flex: 1 },
    headerTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary, letterSpacing: 0.3 },
    headerSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.gray500, marginTop: 1 },
    content: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
    workspaceCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '14',
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadows.md,
    },
    workspaceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    workspaceHeaderTextWrap: {
        flex: 1,
    },
    workspaceTitle: {
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    workspaceSubtitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    workspaceStatusPill: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '2F',
        backgroundColor: Colors.primary + '12',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    workspaceStatusText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    workspaceTabsRow: {
        paddingVertical: 2,
        gap: Spacing.xs,
    },
    workspaceTabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '1A',
        backgroundColor: Colors.primary + '08',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    workspaceTabButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    workspaceTabText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    workspaceTabTextActive: {
        color: Colors.white,
    },
    workspaceTabBadge: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.white,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    workspaceTabBadgeActive: {
        borderColor: Colors.white + '90',
        backgroundColor: Colors.primaryDark,
    },
    workspaceTabBadgeText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    workspaceTabBadgeTextActive: {
        color: Colors.white,
    },
    workspacePanel: {
        gap: Spacing.sm,
    },
    overviewCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '10',
        padding: Spacing.md,
        ...Shadows.md,
    },
    overviewChip: {
        minWidth: 88,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '1E',
        backgroundColor: Colors.primary + '08',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
    },
    overviewLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    overviewValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    workspaceRouteCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '16',
        backgroundColor: Colors.primary + '05',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    workspaceRouteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    workspaceRouteTextWrap: {
        flex: 1,
    },
    workspaceRouteLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    workspaceRouteValue: {
        marginTop: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    workspaceRouteDivider: {
        marginLeft: 6,
        height: 1,
        backgroundColor: Colors.primary + '15',
    },
    workspaceRouteMeta: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    workspaceRouteMetaSoft: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    workspaceTimelineCard: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    workspaceTimelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    workspaceTimelineTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    workspaceTimelineSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    workspaceTimelineRows: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        overflow: 'hidden',
    },
    workspaceTimelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    workspaceTimelineDot: {
        width: 8,
        height: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray300,
    },
    workspaceTimelineDotDone: {
        backgroundColor: Colors.success,
    },
    workspaceTimelineRowLabel: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        fontWeight: Typography.fontWeight.semibold,
    },
    workspaceTimelineRowValue: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    workspaceMessagesHeader: {
        gap: 2,
    },
    mapExperienceCard: {
        marginTop: Spacing.sm,
        height: MAP_DOMINANT_HEIGHT,
        borderRadius: BorderRadius.xl + 4,
        overflow: 'hidden',
        backgroundColor: '#DCE8FB',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        ...Shadows.lg,
    },
    mapExperienceCardCollapsed: {
        height: 210,
    },
    mapExpandToggle: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        zIndex: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '2C',
        backgroundColor: Colors.white + 'F0',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        ...Shadows.sm,
    },
    mapExpandToggleText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    mapCollapsedInfo: {
        position: 'absolute',
        left: Spacing.sm,
        right: Spacing.sm,
        bottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '24',
        backgroundColor: Colors.white + 'F2',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    mapCollapsedInfoText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    roleStoryboardCard: {
        marginTop: -Spacing.xxl,
        marginHorizontal: Spacing.xs,
        borderRadius: BorderRadius.xl + 2,
        borderWidth: 1.5,
        borderColor: Colors.primary + '38',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
        ...Shadows.lg,
    },
    roleStoryboardDriver: {
        borderColor: Colors.accent + '66',
    },
    roleSellerCard: {
        borderColor: Colors.accent + '55',
    },
    roleBuyerCard: {
        borderColor: Colors.primaryLight + '75',
    },
    roleHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    roleHeaderTextWrap: { flex: 1 },
    roleEyebrow: {
        fontSize: Typography.fontSize.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: Colors.accent,
        fontWeight: Typography.fontWeight.bold,
    },
    roleHeadline: {
        marginTop: 2,
        fontSize: Typography.fontSize.xl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    roleStatusPill: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.accent + '70',
        backgroundColor: Colors.accent + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    roleStatusPillText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.accent,
        fontWeight: Typography.fontWeight.bold,
    },
    roleMetricsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.sm,
    },
    roleMetricTile: {
        flex: 1,
        minHeight: 76,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white + '25',
        backgroundColor: Colors.white + '14',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        justifyContent: 'space-between',
    },
    roleMetricLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.semibold,
    },
    roleMetricValue: {
        marginTop: 4,
        fontSize: Typography.fontSize.lg,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    roleJourneyCard: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.white + '2B',
        backgroundColor: Colors.white + '10',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    roleJourneyPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
    },
    roleJourneyTextWrap: { flex: 1 },
    roleJourneyLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.semibold,
        textTransform: 'uppercase',
    },
    roleJourneyValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    roleJourneyDivider: {
        height: 1,
        backgroundColor: Colors.white + '1F',
    },
    roleContactsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    roleContactChip: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.accent + '66',
        backgroundColor: Colors.accent + '22',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roleContactText: {
        color: Colors.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    rolePrimaryActionBtn: {
        marginTop: Spacing.xs,
    },
    roleSecondaryActionsRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    roleSecondaryActionBtn: {
        flex: 1,
    },
    roleCompletionText: {
        fontSize: Typography.fontSize.xl,
        color: Colors.accent,
        fontWeight: Typography.fontWeight.extrabold,
    },
    roleProgressTrack: {
        marginTop: 2,
        height: 9,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + '2C',
        overflow: 'hidden',
    },
    roleProgressFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.accent,
    },
    roleProgressMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    roleProgressMetaText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'DA',
        fontWeight: Typography.fontWeight.medium,
    },
    roleDriverCard: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.white + '2F',
        backgroundColor: Colors.white + '12',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    roleDriverHeadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    roleDriverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleDriverTextWrap: { flex: 1 },
    roleDriverName: {
        fontSize: Typography.fontSize.md,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    roleDriverMeta: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'D6',
        fontWeight: Typography.fontWeight.medium,
    },
    roleDriverCallButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.accent + '80',
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleCodeCard: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.white + '2F',
        backgroundColor: Colors.white + '12',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    roleCodeTextWrap: { flex: 1 },
    roleCodeLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        textTransform: 'uppercase',
        fontWeight: Typography.fontWeight.semibold,
    },
    roleCodeValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    roleEtaBadge: {
        minWidth: 82,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.accent + '70',
        backgroundColor: Colors.accent + '24',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        alignItems: 'flex-end',
    },
    roleEtaBadgeText: {
        fontSize: Typography.fontSize.lg,
        color: Colors.accent,
        fontWeight: Typography.fontWeight.extrabold,
    },
    roleEtaBadgeSub: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.semibold,
    },
    buyerFlowLabelsRow: {
        marginTop: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    buyerFlowLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: Typography.fontSize.xs,
        color: Colors.white + '9E',
        fontWeight: Typography.fontWeight.semibold,
    },
    buyerFlowLabelActive: {
        color: Colors.accent,
    },
    priorityActionsCard: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '10',
        padding: Spacing.lg,
        gap: Spacing.md,
        ...Shadows.md,
    },
    priorityActionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    priorityActionsTitle: {
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    priorityActionsSubtitle: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    priorityActionsMeta: {
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '28',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    priorityActionsMetaText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    priorityActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        backgroundColor: Colors.primary + '05',
        padding: Spacing.md,
    },
    priorityActionInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    priorityActionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
        backgroundColor: Colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityActionTextWrap: { flex: 1 },
    priorityActionTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    priorityActionSubtitle: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    noActionState: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    noActionStateText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    quickDetailButtons: {
        marginTop: Spacing.xs,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    quickDetailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '26',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    quickDetailButtonText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    rideSheetCard: {
        marginTop: -Spacing.xxl,
        marginHorizontal: Spacing.xs,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    rideSheetGradient: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.white + '2A',
    },
    rideSheetTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    rideSheetEtaBlock: { flex: 1 },
    rideSheetStatusLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.semibold,
        textTransform: 'uppercase',
    },
    rideSheetEtaValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.xxxl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    rideSheetEtaSub: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'D9',
        fontWeight: Typography.fontWeight.medium,
    },
    rideSheetDistanceBlock: {
        minWidth: 92,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.white + '30',
        backgroundColor: Colors.white + '14',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        alignItems: 'flex-end',
    },
    rideSheetDistanceLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'D0',
        fontWeight: Typography.fontWeight.semibold,
    },
    rideSheetDistanceValue: {
        marginTop: 1,
        fontSize: Typography.fontSize.lg,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    rideSheetCostText: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'F0',
        fontWeight: Typography.fontWeight.bold,
    },
    rideSheetDistanceSub: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.medium,
    },
    rideSheetDivider: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
        height: 1,
        backgroundColor: Colors.white + '2D',
    },
    rideStopsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    rideStopsRail: {
        width: 14,
        alignItems: 'center',
        paddingTop: 4,
    },
    rideStopDotStart: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
    },
    rideStopRail: {
        width: 2,
        height: 28,
        marginVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + '70',
    },
    rideStopDotEnd: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.success,
    },
    rideStopsContent: { flex: 1 },
    rideStopLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.semibold,
    },
    rideStopValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    rideStopSeparator: {
        marginVertical: Spacing.sm,
        height: 1,
        backgroundColor: Colors.white + '28',
    },
    rideFooterRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    rideSummaryText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'E5',
        fontWeight: Typography.fontWeight.semibold,
    },
    routeSourcePill: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: Colors.white + '33',
        backgroundColor: Colors.white + '1A',
    },
    routeSourcePillBackend: {
        backgroundColor: Colors.success + '30',
        borderColor: Colors.success + '88',
    },
    routeSourcePillFallback: {
        backgroundColor: Colors.warning + '30',
        borderColor: Colors.warning + '88',
    },
    routeSourcePillText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    map: { width: '100%', height: '100%' },
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
    routePlannerCard: {
        position: 'absolute',
        top: Spacing.sm,
        left: Spacing.sm,
        right: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.white + 'F0',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        ...Shadows.sm,
    },
    routePlannerIcons: {
        width: 18,
        alignItems: 'center',
        paddingTop: 3,
    },
    routePlannerConnector: {
        marginVertical: 5,
        width: 1,
        height: 26,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Colors.gray300,
    },
    routePlannerBody: { flex: 1, paddingHorizontal: Spacing.sm },
    routePlannerLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray500,
    },
    routePlannerValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        lineHeight: 19,
    },
    routePlannerDivider: {
        marginVertical: Spacing.sm,
        height: 1,
        backgroundColor: Colors.gray200,
    },
    routePlannerAction: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    cardTitle: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary, marginBottom: Spacing.sm },
    stagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    stageChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, backgroundColor: Colors.gray50, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
    stageChipDone: { backgroundColor: Colors.primary + 'D9', borderColor: Colors.primary },
    stageChipCurrent: { backgroundColor: Colors.primary },
    stageChipText: { color: Colors.gray500, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
    stageChipTextDone: { color: Colors.white },
    accordionCard: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '10',
        backgroundColor: Colors.white + 'F5',
        overflow: 'hidden',
        ...Shadows.md,
    },
    accordionHeader: {
        minHeight: 74,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        backgroundColor: Colors.white + 'DE',
    },
    accordionHeaderLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    accordionIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '20',
        backgroundColor: Colors.primary + '12',
    },
    accordionTextWrap: {
        flex: 1,
        gap: 1,
    },
    accordionTitle: {
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    accordionSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    accordionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    accordionBadgePill: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
        backgroundColor: Colors.primary + '10',
    },
    accordionBadgeText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    accordionChevron: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    accordionPreviewRow: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    previewPill: {
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
    },
    previewText: {
        maxWidth: 220,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    accordionBody: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
        backgroundColor: Colors.white + 'F2',
    },
    transportRail: {
        position: 'absolute',
        left: Spacing.sm,
        bottom: 114,
        gap: Spacing.xs,
        alignItems: 'center',
    },
    transportPrimary: {
        minWidth: 78,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        backgroundColor: '#1F2937D9',
        alignItems: 'center',
        ...Shadows.sm,
    },
    transportPrimaryTime: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    transportPrimaryMeta: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.white + 'D6',
    },
    transportOption: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + 'E8',
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    transportOptionTime: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
    },
    mapControlsCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    mapHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
    mapModeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '0F' },
    mapModeButtonActive: { backgroundColor: Colors.primary },
    mapModeButtonText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
    mapModeButtonTextActive: { color: Colors.white },
    mapRefreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, backgroundColor: Colors.gray50 },
    mapRefreshText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
    mapFoldButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '35',
        backgroundColor: Colors.primary + '12',
    },
    mapFoldButtonCollapsed: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    mapFoldButtonText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary,
    },
    mapFoldButtonTextCollapsed: {
        color: Colors.white,
    },
    mapOverlayInfo: { position: 'absolute', top: 122, left: Spacing.sm, right: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary + '30', backgroundColor: Colors.white + 'F5', paddingHorizontal: Spacing.sm, paddingVertical: 6 },
    mapOverlayText: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.semibold },
    guidanceTopCard: {
        position: 'absolute',
        top: 126,
        left: Spacing.sm,
        right: Spacing.sm,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.primary + 'E6',
        borderWidth: 1,
        borderColor: Colors.white + '45',
    },
    guidanceInstructionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    guidanceInstructionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white + '24', alignItems: 'center', justifyContent: 'center' },
    guidanceInstructionTextWrap: { flex: 1 },
    guidanceInstructionTitle: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    guidanceInstructionMeta: { marginTop: 2, color: Colors.white + 'D4', fontSize: Typography.fontSize.xs },
    guidanceNextInstruction: { marginTop: Spacing.xs, color: Colors.white + 'D8', fontSize: Typography.fontSize.xs },
    recenterFab: {
        position: 'absolute',
        right: Spacing.sm,
        top: 218,
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1.5,
        borderColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    guidanceBottomCard: {
        position: 'absolute',
        left: Spacing.sm,
        right: Spacing.sm,
        bottom: Spacing.sm,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        ...Shadows.md,
    },
    guidanceBottomMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    guidanceMetricWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    guidanceEta: { color: Colors.white, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold },
    guidanceDistance: { color: Colors.white + 'E5', fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
    navLaunchButton: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guidanceDestination: { marginTop: Spacing.xs, color: Colors.white + 'D8', fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    mapActionsRow: { marginTop: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    mapActionButton: { flex: 1, minHeight: 42, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, ...Shadows.sm },
    mapActionButtonDisabled: { opacity: 0.55 },
    mapActionText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    mapActionSecondary: { flex: 1, minHeight: 42, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    mapActionSecondaryActive: { backgroundColor: Colors.primary },
    mapActionSecondaryText: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    mapActionSecondaryTextActive: { color: Colors.white },
    mapHintGrid: {
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
    },
    mapHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    mapHintLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    mapHintValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.primary + '10', padding: Spacing.lg, ...Shadows.md },
    infoText: { fontSize: Typography.fontSize.sm, color: Colors.gray600, marginBottom: 2 },
    actionBtn: { marginBottom: Spacing.sm },
    qrBlock: { marginTop: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.md, backgroundColor: Colors.gray50, padding: Spacing.sm, width: '100%' },
    qrLabel: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
    qrImage: { width: 170, height: 170, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
    qrCode: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.gray600, textAlign: 'center' },
    messagesList: { maxHeight: 240, paddingRight: 2 },
    msgBubble: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 7,
        marginBottom: Spacing.xs,
    },
    msgBubbleOwn: {
        marginLeft: Spacing.xl,
        borderColor: Colors.primary + '24',
        backgroundColor: Colors.primary + '10',
    },
    msgBubbleOther: {
        marginRight: Spacing.xl,
        backgroundColor: Colors.gray50,
    },
    msgHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    msgRole: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
    },
    msgTime: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    msgText: { fontSize: Typography.fontSize.sm, color: Colors.gray700, marginTop: 4, lineHeight: 19 },
    msgComposer: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    msgInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        color: Colors.gray700,
        backgroundColor: Colors.white,
    },
    sendBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
    sendBtnDisabled: { opacity: 0.45 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(3, 12, 30, 0.64)', justifyContent: 'center', padding: Spacing.xl },
    modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xxl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '18', overflow: 'hidden', ...Shadows.xl },
    modalTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
    modalIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.sm },
    modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary, textAlign: 'center' },
    modalCaption: { marginTop: Spacing.xs, textAlign: 'center', color: Colors.gray600, fontSize: Typography.fontSize.sm },
    modalHintBox: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.gray200 },
    modalHintText: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.semibold },
    cameraLaunchButton: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, ...Shadows.sm },
    cameraLaunchButtonText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    cameraPreviewWrap: { marginTop: Spacing.sm, height: 210, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.black, borderWidth: 1, borderColor: Colors.primary + '35' },
    cameraPreview: { width: '100%', height: '100%' },
    cameraGuideBox: { position: 'absolute', top: '24%', left: '18%', right: '18%', bottom: '24%', borderWidth: 2, borderColor: Colors.white, borderRadius: BorderRadius.sm, backgroundColor: 'transparent' },
    cameraCloseButton: { position: 'absolute', top: Spacing.xs, right: Spacing.xs, width: 28, height: 28, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000099' },
    modalInput: { marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, color: Colors.primary, fontWeight: Typography.fontWeight.semibold, backgroundColor: Colors.gray50 },
    modalActions: { marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
    modalGhost: { flex: 1, borderWidth: 1, borderColor: Colors.gray300, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.gray50 },
    modalGhostText: { color: Colors.gray600, fontWeight: Typography.fontWeight.semibold },
    modalPrimary: { flex: 1, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.primary },
    modalSingleAction: { marginTop: Spacing.md, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.primary },
    modalPrimaryText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    androidDetailsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.38)',
        justifyContent: 'flex-end',
    },
    androidDetailsSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        maxHeight: '58%',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    androidDetailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    androidDetailsTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    androidDetailsCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    androidDetailsBody: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
    },
    androidDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    androidDetailsLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    androidDetailsValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    androidTimelineList: { maxHeight: 300 },
    androidTimelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    androidTimelineDot: {
        marginTop: 3,
        width: 10,
        height: 10,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray300,
    },
    androidTimelineDotDone: {
        backgroundColor: Colors.success,
    },
    androidTimelineContent: { flex: 1 },
    androidTimelineTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    androidTimelineMeta: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    errorTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
    errorText: { textAlign: 'center', fontSize: Typography.fontSize.sm, color: Colors.gray600, marginBottom: Spacing.sm },
});
