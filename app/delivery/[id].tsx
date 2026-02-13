import { Button } from '@/components/ui/Button';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useAcceptDeliveryMutation,
    useGenerateDropoffQrMutation,
    useGeneratePickupQrMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useGetDeliveryMessagesQuery,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useScanDropoffQrMutation,
    useScanPickupQrMutation,
    useSendDeliveryMessageMutation,
    useUpdateDeliveryLocationMutation,
} from '@/store/api/deliveriesApi';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetDirectionsMutation, useLazyGeocodeQuery } from '@/store/api/googleMapsApi';
import { DELIVERY_STATUS_LABELS, DeliveryGeoPoint, DeliveryStatusValue, getDeliveryActorId, getDeliveryPersonRefId } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React from 'react';
import {
    Image,
    LayoutAnimation,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
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
type DeliverySectionKey = 'navigation' | 'progression' | 'actions' | 'messages';

const DEFAULT_MAP_CENTER: LatLng = { latitude: 5.3365, longitude: -4.0244 };

const DELIVERY_STAGE_ORDER: {
    key: 'pending' | 'assigned' | 'at_pickup' | 'in_transit' | 'at_dropoff' | 'delivered';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'pending', label: 'Demande', icon: 'time-outline' },
    { key: 'assigned', label: 'Assignee', icon: 'person-outline' },
    { key: 'at_pickup', label: 'Pickup', icon: 'storefront-outline' },
    { key: 'in_transit', label: 'Transit', icon: 'car-outline' },
    { key: 'at_dropoff', label: 'Dropoff', icon: 'location-outline' },
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

const qrImageUrl = (token: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(token)}`;

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

export default function DeliveryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();
    const { user } = useAuth();
    const currentUserId = user?._id || '';
    const mapRef = React.useRef<MapView | null>(null);
    const watchRef = React.useRef<Location.LocationSubscription | null>(null);

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
    const [routeRefreshKey, setRouteRefreshKey] = React.useState(0);
    const [expandedSections, setExpandedSections] = React.useState<Record<DeliverySectionKey, boolean>>({
        navigation: true,
        progression: true,
        actions: true,
        messages: false,
    });
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

    const hasAnyAction = Boolean(
        canAcceptDelivery ||
        canArrivePickup ||
        canSellerShowPickupQr ||
        canDriverScanPickupQr ||
        canArriveDropoff ||
        canDriverShowDropoffQr ||
        canBuyerScanDropoffQr,
    );

    const pickupCoordinatesSource = (tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined;
    const dropoffCoordinatesSource = (tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined;
    const pickupCoordinatesKey = Array.isArray(pickupCoordinatesSource?.coordinates)
        ? pickupCoordinatesSource.coordinates.join(',')
        : '';
    const dropoffCoordinatesKey = Array.isArray(dropoffCoordinatesSource?.coordinates)
        ? dropoffCoordinatesSource.coordinates.join(',')
        : '';
    const pickupLabel =
        tracking?.pickupLocation ||
        delivery?.pickupLocation ||
        coordinatesToLabel(pickupCoordinatesSource);
    const dropoffLabel =
        tracking?.deliveryLocation ||
        delivery?.deliveryLocation ||
        coordinatesToLabel(dropoffCoordinatesSource);

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

    React.useEffect(() => {
        if (Platform.OS === 'android' && typeof UIManager.setLayoutAnimationEnabledExperimental === 'function') {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const toggleSection = (section: DeliverySectionKey) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

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
                resolvePoint(pickupLabel, pickupDirect),
                resolvePoint(dropoffLabel, dropoffDirect),
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
        dropoffLabel,
        pickupLabel,
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
                const encodedPolyline = firstRoute?.overviewPolyline;
                const decodedPath = typeof encodedPolyline === 'string' ? decodePolyline(encodedPolyline) : [];
                const distanceMeters = Array.isArray(firstRoute?.legs)
                    ? firstRoute.legs.reduce((sum: number, leg: any) => sum + Number(leg?.distance || 0), 0)
                    : 0;
                const durationSeconds = Array.isArray(firstRoute?.legs)
                    ? firstRoute.legs.reduce((sum: number, leg: any) => sum + Number(leg?.duration || 0), 0)
                    : 0;
                const normalizedSteps: NavigationStep[] = Array.isArray(firstRoute?.legs)
                    ? firstRoute.legs.flatMap((leg: any) =>
                          Array.isArray(leg?.steps)
                              ? leg.steps
                                    .map((step: any) => {
                                        const startLat = Number(step?.startLocation?.lat);
                                        const startLng = Number(step?.startLocation?.lng);
                                        const endLat = Number(step?.endLocation?.lat);
                                        const endLng = Number(step?.endLocation?.lng);

                                        if (
                                            !Number.isFinite(startLat) ||
                                            !Number.isFinite(startLng) ||
                                            !Number.isFinite(endLat) ||
                                            !Number.isFinite(endLng)
                                        ) {
                                            return null;
                                        }

                                        return {
                                            instruction: stripHtmlInstruction(step?.htmlInstructions),
                                            distanceMeters: Number(step?.distance || 0),
                                            durationSeconds: Number(step?.duration || 0),
                                            start: { latitude: startLat, longitude: startLng },
                                            end: { latitude: endLat, longitude: endLng },
                                        } as NavigationStep;
                                    })
                                    .filter(Boolean)
                              : [],
                      )
                    : [];

                setRouteCoordinates(decodedPath.length >= 2 ? decodedPath : [driverPoint, activeTargetPoint]);
                setRouteMetrics({
                    distanceKm: distanceMeters > 0 ? distanceMeters / 1000 : 0,
                    durationMin: durationSeconds > 0 ? Math.round(durationSeconds / 60) : 0,
                    summary: firstRoute?.summary || undefined,
                });
                setRouteSteps(normalizedSteps);
                setActiveStepIndex(0);
            } catch {
                if (cancelled) return;
                setRouteCoordinates([driverPoint, activeTargetPoint]);
                setRouteMetrics(null);
                setRouteSteps([]);
                setActiveStepIndex(0);
            }
        }, 450);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [activeTargetPoint, driverPoint, fetchDirections, routeRefreshKey]);

    React.useEffect(() => {
        if (isGuidanceMode) return;
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
    }, [driverPoint, dropoffPoint, isGuidanceMode, pickupPoint, routeCoordinates.length]);

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
        if (!isGuidanceMode || !mapRef.current || !driverPoint) {
            return;
        }

        const targetForBearing = activeTargetPoint || routeSteps[activeStepIndex]?.end;
        const heading = targetForBearing ? bearingDegrees(driverPoint, targetForBearing) : 0;

        mapRef.current.animateCamera(
            {
                center: driverPoint,
                heading,
                pitch: 50,
                zoom: 17,
            },
            { duration: 700 },
        );
    }, [activeStepIndex, activeTargetPoint, driverPoint, isGuidanceMode, routeSteps]);

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
    const bikeDurationLabel =
        routeMetrics && routeMetrics.durationMin > 0
            ? `${Math.max(Math.round(routeMetrics.durationMin * 1.35), routeMetrics.durationMin + 3)} min`
            : '--';
    const walkDurationLabel =
        routeMetrics && routeMetrics.durationMin > 0
            ? `${Math.max(Math.round(routeMetrics.durationMin * 2.2), routeMetrics.durationMin + 8)} min`
            : '--';
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
    const progressionSummary = `${Math.min(stageProgressIndex + 1, DELIVERY_STAGE_ORDER.length)}/${DELIVERY_STAGE_ORDER.length}`;
    const dropoffFullyConfirmed = buyerDropoffConfirmed && Boolean(
        (tracking?.driverDropoffConfirmed ?? delivery?.driverDropoffConfirmed) === true,
    );
    const pickupSummaryLabel = pickupFullyConfirmed ? 'Pickup valide' : 'Pickup en attente';
    const dropoffSummaryLabel = dropoffFullyConfirmed ? 'Dropoff valide' : 'Dropoff en attente';
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const latestMessagePreview = latestMessage?.message?.trim()
        ? latestMessage.message.trim()
        : 'Aucun message pour le moment.';
    const activeSectionCount = Object.values(expandedSections).filter(Boolean).length;

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
                <View style={styles.mapExperienceCard}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                        initialRegion={mapInitialRegion}
                        showsUserLocation={isAssignedDriver}
                    >
                        {pickupPoint ? (
                            <Marker coordinate={pickupPoint} pinColor={Colors.accentDark} title="Point de pickup" description={pickupLabel || undefined} />
                        ) : null}
                        {dropoffPoint ? (
                            <Marker coordinate={dropoffPoint} pinColor={Colors.success} title="Point de livraison" description={dropoffLabel || undefined} />
                        ) : null}
                        {driverPoint ? (
                            <Marker coordinate={driverPoint} pinColor={Colors.primary} title="Livreur" />
                        ) : null}
                        {routeCoordinates.length >= 2 ? (
                            <>
                                <Polyline coordinates={routeCoordinates} strokeWidth={9} strokeColor={Colors.white + 'EA'} />
                                <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor={Colors.primaryLight} />
                            </>
                        ) : null}
                    </MapView>

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
                                {headingToPickup ? 'Point de pickup' : 'Point de livraison'}
                            </Text>
                            <Text style={styles.routePlannerValue} numberOfLines={2}>
                                {activeTargetLabel || 'Destination non definie'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.routePlannerAction}
                            onPress={() => setRouteRefreshKey((value) => value + 1)}
                        >
                            <Ionicons name="swap-vertical" size={18} color={Colors.primary} />
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

                    <View style={styles.transportRail}>
                        <View style={styles.transportPrimary}>
                            <Text style={styles.transportPrimaryTime}>{durationLabel}</Text>
                            <Text style={styles.transportPrimaryMeta}>Trajet principal</Text>
                        </View>
                        <View style={styles.transportOption}>
                            <Ionicons name="car-outline" size={18} color={Colors.primary} />
                            <Text style={styles.transportOptionTime}>{durationLabel}</Text>
                        </View>
                        <View style={styles.transportOption}>
                            <Ionicons name="bicycle-outline" size={18} color={Colors.primary} />
                            <Text style={styles.transportOptionTime}>{bikeDurationLabel}</Text>
                        </View>
                        <View style={styles.transportOption}>
                            <Ionicons name="walk-outline" size={18} color={Colors.primary} />
                            <Text style={styles.transportOptionTime}>{walkDurationLabel}</Text>
                        </View>
                    </View>

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
                </View>

                <View style={styles.overviewCard}>
                    <View style={styles.overviewChip}>
                        <Text style={styles.overviewLabel}>Statut</Text>
                        <Text style={styles.overviewValue}>{DELIVERY_STATUS_LABELS[status] || status}</Text>
                    </View>
                    <View style={styles.overviewChip}>
                        <Text style={styles.overviewLabel}>ETA</Text>
                        <Text style={styles.overviewValue}>{durationLabel}</Text>
                    </View>
                    <View style={styles.overviewChip}>
                        <Text style={styles.overviewLabel}>Distance</Text>
                        <Text style={styles.overviewValue}>{distanceLabel}</Text>
                    </View>
                    <View style={styles.overviewChip}>
                        <Text style={styles.overviewLabel}>Sections</Text>
                        <Text style={styles.overviewValue}>{activeSectionCount}/4</Text>
                    </View>
                </View>

                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('navigation')}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={styles.accordionIconWrap}>
                                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.accordionTextWrap}>
                                <Text style={styles.accordionTitle}>Navigation & Controle</Text>
                                <Text style={styles.accordionSubtitle}>
                                    Guidage live, carte et partage de position
                                </Text>
                            </View>
                        </View>
                        <View style={styles.accordionHeaderRight}>
                            <View style={styles.accordionBadgePill}>
                                <Text style={styles.accordionBadgeText}>
                                    {isGuidanceMode ? 'Guidage actif' : 'Mode carte'}
                                </Text>
                            </View>
                            <View style={styles.accordionChevron}>
                                <Ionicons
                                    name={expandedSections.navigation ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={Colors.primary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!expandedSections.navigation ? (
                        <View style={styles.accordionPreviewRow}>
                            <View style={styles.previewPill}>
                                <Ionicons name="pin-outline" size={13} color={Colors.primary} />
                                <Text style={styles.previewText} numberOfLines={1}>
                                    {activeTargetLabel || 'Destination en attente'}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                    {expandedSections.navigation ? (
                        <View style={styles.accordionBody}>
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
                                        onPress={() => setRouteRefreshKey((value) => value + 1)}
                                    >
                                        <Ionicons name="refresh" size={15} color={Colors.primary} />
                                        <Text style={styles.mapRefreshText}>{isRouting ? 'Calcul...' : 'Recalculer'}</Text>
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
                                    <Text style={styles.mapHintValue}>{DELIVERY_STATUS_LABELS[status] || status}</Text>
                                </View>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>Destination</Text>
                                    <Text style={styles.mapHintValue} numberOfLines={1}>{activeTargetLabel || '-'}</Text>
                                </View>
                                <View style={styles.mapHintRow}>
                                    <Text style={styles.mapHintLabel}>Livreur</Text>
                                    <Text style={styles.mapHintValue} numberOfLines={1}>
                                        {driverPoint
                                            ? `${driverPoint.latitude.toFixed(5)}, ${driverPoint.longitude.toFixed(5)}`
                                            : 'Position indisponible'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : null}
                </View>

                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('progression')}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={styles.accordionIconWrap}>
                                <Ionicons name="git-network-outline" size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.accordionTextWrap}>
                                <Text style={styles.accordionTitle}>Progression</Text>
                                <Text style={styles.accordionSubtitle}>
                                    Etapes de validation pickup/dropoff
                                </Text>
                            </View>
                        </View>
                        <View style={styles.accordionHeaderRight}>
                            <View style={styles.accordionBadgePill}>
                                <Text style={styles.accordionBadgeText}>{progressionSummary}</Text>
                            </View>
                            <View style={styles.accordionChevron}>
                                <Ionicons
                                    name={expandedSections.progression ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={Colors.primary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!expandedSections.progression ? (
                        <View style={styles.accordionPreviewRow}>
                            <View style={styles.previewPill}>
                                <Ionicons name="storefront-outline" size={13} color={Colors.primary} />
                                <Text style={styles.previewText}>{pickupSummaryLabel}</Text>
                            </View>
                            <View style={styles.previewPill}>
                                <Ionicons name="checkmark-done-outline" size={13} color={Colors.primary} />
                                <Text style={styles.previewText}>{dropoffSummaryLabel}</Text>
                            </View>
                        </View>
                    ) : null}
                    {expandedSections.progression ? (
                        <View style={styles.accordionBody}>
                            <View style={styles.stagesRow}>
                                {DELIVERY_STAGE_ORDER.map((stage, index) => {
                                    const isDone = index <= stageProgressIndex;
                                    const isCurrent = index === stageProgressIndex;
                                    return (
                                        <View key={stage.key} style={[styles.stageChip, isDone && styles.stageChipDone, isCurrent && styles.stageChipCurrent]}>
                                            <Ionicons name={stage.icon} size={14} color={isDone ? Colors.white : Colors.gray500} />
                                            <Text style={[styles.stageChipText, isDone && styles.stageChipTextDone]}>{stage.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ) : null}
                </View>

                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('actions')}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={styles.accordionIconWrap}>
                                <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.accordionTextWrap}>
                                <Text style={styles.accordionTitle}>Actions livraison</Text>
                                <Text style={styles.accordionSubtitle}>
                                    Actions disponibles selon votre role
                                </Text>
                            </View>
                        </View>
                        <View style={styles.accordionHeaderRight}>
                            <View style={styles.accordionBadgePill}>
                                <Text style={styles.accordionBadgeText}>
                                    {availableActionsCount} dispo.
                                </Text>
                            </View>
                            <View style={styles.accordionChevron}>
                                <Ionicons
                                    name={expandedSections.actions ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={Colors.primary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!expandedSections.actions ? (
                        <View style={styles.accordionPreviewRow}>
                            <View style={styles.previewPill}>
                                <Ionicons
                                    name={hasAnyAction ? 'checkmark-circle-outline' : 'time-outline'}
                                    size={13}
                                    color={Colors.primary}
                                />
                                <Text style={styles.previewText}>
                                    {hasAnyAction
                                        ? `${availableActionsCount} action(s) prete(s)`
                                        : 'Aucune action a cette etape'}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                    {expandedSections.actions ? (
                        <View style={styles.accordionBody}>
                            {canAcceptDelivery ? (
                                <Button title="Accepter livraison" variant="secondary" loading={isAccepting} onPress={() => runAction(() => acceptDelivery(deliveryId).unwrap(), 'Livraison acceptee.')} style={styles.actionBtn} />
                            ) : null}
                            {canArrivePickup ? (
                                <Button title="Arrive pickup" variant="secondary" loading={isArrivingPickup} onPress={() => runAction(() => driverArrivePickup(deliveryId).unwrap(), 'Arrivee pickup confirmee.')} style={styles.actionBtn} />
                            ) : null}
                            {canSellerShowPickupQr ? (
                                <Button
                                    title="Afficher QR commande"
                                    variant="secondary"
                                    loading={isGeneratingPickupQr}
                                    onPress={onSellerShowPickupQr}
                                    style={styles.actionBtn}
                                />
                            ) : null}
                            {canDriverScanPickupQr ? (
                                <Button
                                    title="Scanner QR commande vendeur"
                                    variant="secondary"
                                    loading={isScanningPickupQr}
                                    onPress={() => openQrScanModal({
                                        title: 'Scan QR commande',
                                        caption: 'Scannez le QR montre par le vendeur pour lancer la livraison.',
                                        inputPlaceholder: 'Code QR commande du vendeur',
                                        action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap(),
                                    })}
                                    style={styles.actionBtn}
                                />
                            ) : null}
                            {canArriveDropoff ? (
                                <Button title="Arrive dropoff" variant="secondary" loading={isArrivingDropoff} onPress={() => runAction(() => driverArriveDropoff(deliveryId).unwrap(), 'Arrivee dropoff confirmee.')} style={styles.actionBtn} />
                            ) : null}
                            {canDriverShowDropoffQr ? (
                                <Button
                                    title="Afficher QR livraison"
                                    variant="secondary"
                                    loading={isGeneratingDropoffQr}
                                    onPress={onDriverShowDropoffQr}
                                    style={styles.actionBtn}
                                />
                            ) : null}
                            {canBuyerScanDropoffQr ? (
                                <Button
                                    title="Scanner QR livraison"
                                    variant="secondary"
                                    loading={isScanningDropoffQr}
                                    onPress={() => openQrScanModal({
                                        title: 'Scan QR livraison',
                                        caption: 'Scannez le QR montre par le livreur pour valider la fin de livraison.',
                                        inputPlaceholder: 'Code QR livraison du livreur',
                                        action: (qrData) => scanDropoffQr({ id: deliveryId, qrData }).unwrap(),
                                    })}
                                    style={styles.actionBtn}
                                />
                            ) : null}
                            {!hasAnyAction ? (
                                <Text style={styles.infoText}>Aucune action disponible pour votre role a cette etape.</Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                <View style={styles.accordionCard}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.accordionHeader}
                        onPress={() => toggleSection('messages')}
                    >
                        <View style={styles.accordionHeaderLeft}>
                            <View style={styles.accordionIconWrap}>
                                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.accordionTextWrap}>
                                <Text style={styles.accordionTitle}>Messages</Text>
                                <Text style={styles.accordionSubtitle}>
                                    Chat rapide entre acheteur, vendeur et livreur
                                </Text>
                            </View>
                        </View>
                        <View style={styles.accordionHeaderRight}>
                            <View style={styles.accordionBadgePill}>
                                <Text style={styles.accordionBadgeText}>{messages.length} msg</Text>
                            </View>
                            <View style={styles.accordionChevron}>
                                <Ionicons
                                    name={expandedSections.messages ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={Colors.primary}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!expandedSections.messages ? (
                        <View style={styles.accordionPreviewRow}>
                            <View style={styles.previewPill}>
                                <Ionicons name="chatbox-outline" size={13} color={Colors.primary} />
                                <Text style={styles.previewText} numberOfLines={1}>
                                    {latestMessagePreview}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                    {expandedSections.messages ? (
                        <View style={styles.accordionBody}>
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
                                            <Text style={styles.msgRole}>{msg.senderRole.replace('_', ' ')}</Text>
                                            <Text style={styles.msgTime}>{formatClockTime(msg.sentAt)}</Text>
                                        </View>
                                        <Text style={styles.msgText}>{msg.message}</Text>
                                    </View>
                                ))}
                                {messages.length === 0 ? <Text style={styles.infoText}>Aucun message.</Text> : null}
                            </ScrollView>
                            <View style={styles.msgComposer}>
                                <TextInput style={styles.msgInput} value={messageInput} onChangeText={setMessageInput} placeholder="Ecrire un message..." />
                                <TouchableOpacity style={styles.sendBtn} onPress={onSendMessage} disabled={isSendingMessage}>
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
                                <Image source={{ uri: qrImageUrl(qrDisplayToken) }} style={styles.qrImage} />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EDF2FC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.white + 'E8',
        borderBottomWidth: 1,
        borderBottomColor: Colors.white + 'CC',
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + 'F2',
    },
    headerBody: { flex: 1 },
    headerTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
    headerSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.gray500 },
    content: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: 112 },
    overviewCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
        backgroundColor: Colors.white + 'E8',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white,
        padding: Spacing.sm,
        ...Shadows.sm,
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
    mapExperienceCard: {
        marginTop: Spacing.sm,
        height: 560,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        backgroundColor: '#DCE8FB',
        ...Shadows.lg,
    },
    map: { width: '100%', height: '100%' },
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
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.white,
        backgroundColor: Colors.white + 'EC',
        overflow: 'hidden',
        ...Shadows.sm,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + 'F5',
        ...Shadows.md,
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
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.white, padding: Spacing.md, ...Shadows.sm },
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
    modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden', ...Shadows.lg },
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
    modalPrimary: { flex: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.primary },
    modalSingleAction: { marginTop: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.primary },
    modalPrimaryText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    errorTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
    errorText: { textAlign: 'center', fontSize: Typography.fontSize.sm, color: Colors.gray600, marginBottom: Spacing.sm },
});
