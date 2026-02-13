import { Button } from '@/components/ui/Button';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useAcceptDeliveryMutation,
    useBuyerConfirmDropoffMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useDriverConfirmDropoffMutation,
    useDriverConfirmPickupMutation,
    useGetDeliveryMessagesQuery,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useSendDeliveryMessageMutation,
    useSellerConfirmPickupMutation,
    useUpdateDeliveryLocationMutation,
} from '@/store/api/deliveriesApi';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetDirectionsMutation, useLazyGeocodeQuery } from '@/store/api/googleMapsApi';
import { DELIVERY_STATUS_LABELS, DeliveryStatusValue, getDeliveryActorId, getDeliveryPersonRefId } from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React from 'react';
import {
    Image,
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

type QrStep = 'seller_pickup' | 'driver_pickup' | 'buyer_dropoff' | 'driver_dropoff';
type LatLng = { latitude: number; longitude: number };
type RouteMetrics = { distanceKm: number; durationMin: number; summary?: string };
type NavigationStep = {
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    start: LatLng;
    end: LatLng;
};

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

const buildQrToken = (deliveryId: string, step: QrStep): string =>
    `UTY-${step.toUpperCase().replace('_', '-')}-${deliveryId.slice(-8).toUpperCase()}`;

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
    const [qrExpectedToken, setQrExpectedToken] = React.useState('');
    const [qrDisplayToken, setQrDisplayToken] = React.useState('');
    const [qrModalTitle, setQrModalTitle] = React.useState('Verification QR');
    const [qrModalCaption, setQrModalCaption] = React.useState(
        'Scannez le QR du partenaire puis saisissez le code recu.',
    );
    const [qrInputPlaceholder, setQrInputPlaceholder] = React.useState(
        'Coller/saisir le code QR du partenaire',
    );
    const [qrInput, setQrInput] = React.useState('');
    const [qrAction, setQrAction] = React.useState<null | (() => Promise<void>)>(null);
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
    const [driverArrivePickup, { isLoading: isArrivingPickup }] = useDriverArrivePickupMutation();
    const [sellerConfirmPickup, { isLoading: isSellerConfirming }] = useSellerConfirmPickupMutation();
    const [driverConfirmPickup, { isLoading: isDriverConfirmingPickup }] = useDriverConfirmPickupMutation();
    const [driverArriveDropoff, { isLoading: isArrivingDropoff }] = useDriverArriveDropoffMutation();
    const [buyerConfirmDropoff, { isLoading: isBuyerConfirming }] = useBuyerConfirmDropoffMutation();
    const [driverConfirmDropoff, { isLoading: isDriverConfirmingDropoff }] = useDriverConfirmDropoffMutation();
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
    const driverDropoffConfirmed = Boolean(
        (tracking?.driverDropoffConfirmed ?? delivery?.driverDropoffConfirmed) === true,
    );
    const pickupFullyConfirmed = sellerPickupConfirmed && driverPickupConfirmed;

    const canAcceptDelivery = status === 'pending' && canBeDeliveryPerson;
    const canArrivePickup = isAssignedDriver && status === 'assigned';
    const canSellerConfirmPickup =
        isSeller &&
        !sellerPickupConfirmed &&
        (status === 'at_pickup' || (status === 'in_transit' && !pickupFullyConfirmed));
    const canDriverConfirmPickup =
        isAssignedDriver &&
        !driverPickupConfirmed &&
        (status === 'at_pickup' || (status === 'in_transit' && !pickupFullyConfirmed));
    const canArriveDropoff = isAssignedDriver && (status === 'picked_up' || status === 'in_transit');
    const canBuyerConfirmDropoff =
        isBuyer &&
        !buyerDropoffConfirmed &&
        (status === 'at_dropoff' || status === 'delivered');
    const canDriverConfirmDropoff =
        isAssignedDriver &&
        !driverDropoffConfirmed &&
        (status === 'at_dropoff' || status === 'delivered');

    const hasAnyAction = Boolean(
        canAcceptDelivery ||
        canArrivePickup ||
        canSellerConfirmPickup ||
        canDriverConfirmPickup ||
        canArriveDropoff ||
        canBuyerConfirmDropoff ||
        canDriverConfirmDropoff,
    );

    const pickupLabel = tracking?.pickupLocation || delivery?.pickupLocation || '';
    const dropoffLabel = tracking?.deliveryLocation || delivery?.deliveryLocation || '';

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

    const sellerPickupToken = deliveryId ? buildQrToken(deliveryId, 'seller_pickup') : '';
    const driverPickupToken = deliveryId ? buildQrToken(deliveryId, 'driver_pickup') : '';
    const buyerDropoffToken = deliveryId ? buildQrToken(deliveryId, 'buyer_dropoff') : '';
    const driverDropoffToken = deliveryId ? buildQrToken(deliveryId, 'driver_dropoff') : '';

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

    const openQrConfirmModal = (config: {
        title: string;
        caption: string;
        displayToken: string;
        expectedToken: string;
        inputPlaceholder: string;
        action: () => Promise<void>;
    }) => {
        setQrModalTitle(config.title);
        setQrModalCaption(config.caption);
        setQrDisplayToken(config.displayToken);
        setQrExpectedToken(config.expectedToken);
        setQrInputPlaceholder(config.inputPlaceholder);
        setQrInput('');
        setQrAction(() => config.action);
        setQrModalVisible(true);
    };

    const onValidateQr = async () => {
        if (qrInput.trim().toUpperCase() !== qrExpectedToken.trim().toUpperCase()) {
            setAlert({
                visible: true,
                title: 'QR invalide',
                message: 'Le code saisi ne correspond pas.',
                type: 'warning',
            });
            return;
        }

        setQrModalVisible(false);
        if (qrAction) {
            await runAction(qrAction, 'Confirmation enregistree.');
        }
    };

    const onSendMessage = async () => {
        const content = messageInput.trim();
        if (!content || !deliveryId) return;
        await runAction(() => sendDeliveryMessage({ id: deliveryId, message: content }).unwrap(), 'Message envoye.');
        setMessageInput('');
    };

    React.useEffect(() => {
        if (!deliveryId || !delivery) return;
        let cancelled = false;

        const resolvePoint = async (label: string): Promise<LatLng | null> => {
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

        setIsResolvingPoints(true);
        (async () => {
            const [pickup, dropoff] = await Promise.all([resolvePoint(pickupLabel), resolvePoint(dropoffLabel)]);
            if (cancelled) return;
            setPickupPoint(pickup);
            setDropoffPoint(dropoff);
            setIsResolvingPoints(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [delivery, deliveryId, dropoffLabel, pickupLabel, triggerGeocode]);

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
    const activeInstruction = routeSteps[activeStepIndex];
    const nextInstructions = routeSteps.slice(activeStepIndex + 1, activeStepIndex + 3);
    const instructionDistanceLabel =
        activeInstruction && activeInstruction.distanceMeters > 0
            ? `${Math.round(activeInstruction.distanceMeters)} m`
            : null;

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

            <ScrollView contentContainerStyle={styles.content}>
                <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <Text style={styles.heroTitle}>Navigation en temps reel</Text>
                        <View style={styles.heroStatusPill}>
                            <Text style={styles.heroStatusText}>{DELIVERY_STATUS_LABELS[status] || status}</Text>
                        </View>
                    </View>
                    <Text style={styles.heroTargetLabel}>Destination active</Text>
                    <Text style={styles.heroTargetValue} numberOfLines={2}>
                        {activeTargetLabel || 'Destination non definie'}
                    </Text>
                    <View style={styles.heroMetricsRow}>
                        <View style={styles.heroMetric}>
                            <Ionicons name="speedometer-outline" size={14} color={Colors.white} />
                            <Text style={styles.heroMetricText}>{distanceLabel}</Text>
                        </View>
                        <View style={styles.heroMetric}>
                            <Ionicons name="time-outline" size={14} color={Colors.white} />
                            <Text style={styles.heroMetricText}>{durationLabel}</Text>
                        </View>
                        {isRouting ? (
                            <View style={styles.heroMetric}>
                                <Ionicons name="sync-outline" size={14} color={Colors.white} />
                                <Text style={styles.heroMetricText}>Calcul...</Text>
                            </View>
                        ) : null}
                    </View>
                </LinearGradient>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Progression</Text>
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

                <View style={styles.card}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.cardTitle}>Navigation guidee</Text>
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
                                <Text style={styles.mapRefreshText}>Recalculer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.mapWrap, isGuidanceMode && styles.mapWrapGuidance]}>
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
                                    <Polyline coordinates={routeCoordinates} strokeWidth={9} strokeColor={Colors.white + 'F2'} />
                                    <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="#1A73E8" />
                                </>
                            ) : null}
                        </MapView>

                        {isGuidanceMode ? (
                            <>
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

                                <TouchableOpacity style={styles.recenterFab} onPress={recenterMap}>
                                    <Ionicons name="locate" size={18} color={Colors.primary} />
                                </TouchableOpacity>

                                <View style={styles.guidanceBottomCard}>
                                    <View style={styles.guidanceBottomMetrics}>
                                        <Text style={styles.guidanceEta}>{durationLabel}</Text>
                                        <Text style={styles.guidanceDistance}>{distanceLabel}</Text>
                                    </View>
                                    <Text style={styles.guidanceDestination} numberOfLines={2}>
                                        Vers: {activeTargetLabel || 'Destination non definie'}
                                    </Text>
                                    <View style={styles.guidanceBottomActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.mapActionButton,
                                                !activeTargetPoint && styles.mapActionButtonDisabled,
                                            ]}
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
                                                    (isLiveSharingEnabled || !canShareLiveLocation) &&
                                                        styles.mapActionSecondaryActive,
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
                                        ) : null}
                                    </View>
                                </View>
                            </>
                        ) : null}

                        {isResolvingPoints ? (
                            <View style={styles.mapOverlayInfo}>
                                <Ionicons name="sync-outline" size={14} color={Colors.primary} />
                                <Text style={styles.mapOverlayText}>Resolution des points...</Text>
                            </View>
                        ) : null}
                    </View>

                    {!isGuidanceMode ? (
                        <>
                            <View style={styles.mapActionsRow}>
                                <TouchableOpacity
                                    style={[styles.mapActionButton, !activeTargetPoint && styles.mapActionButtonDisabled]}
                                    onPress={openRealtimeNavigation}
                                    disabled={!activeTargetPoint}
                                >
                                    <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                    <Text style={styles.mapActionText}>Navigation externe</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.mapActionSecondary} onPress={recenterMap}>
                                    <Ionicons name="locate-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.mapActionSecondaryText}>Recentrer</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.mapHint}>
                                Pickup: {pickupLabel || '-'}{`\n`}
                                Dropoff: {dropoffLabel || '-'}{`\n`}
                                Position livreur: {driverPoint ? `${driverPoint.latitude.toFixed(5)}, ${driverPoint.longitude.toFixed(5)}` : 'indisponible'}
                            </Text>
                        </>
                    ) : null}
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Actions livraison</Text>
                    {canAcceptDelivery ? (
                        <Button title="Accepter livraison" variant="secondary" loading={isAccepting} onPress={() => runAction(() => acceptDelivery(deliveryId).unwrap(), 'Livraison acceptee.')} style={styles.actionBtn} />
                    ) : null}
                    {canArrivePickup ? (
                        <Button title="Arrive pickup" variant="secondary" loading={isArrivingPickup} onPress={() => runAction(() => driverArrivePickup(deliveryId).unwrap(), 'Arrivee pickup confirmee.')} style={styles.actionBtn} />
                    ) : null}
                    {canSellerConfirmPickup ? (
                        <Button
                            title="Vendeur confirme pickup (QR)"
                            variant="secondary"
                            loading={isSellerConfirming}
                            onPress={() => openQrConfirmModal({
                                title: 'Confirmation pickup vendeur',
                                caption: 'Montrez votre QR au livreur, puis saisissez son code QR.',
                                displayToken: sellerPickupToken,
                                expectedToken: driverPickupToken,
                                inputPlaceholder: 'Code QR du livreur',
                                action: () => sellerConfirmPickup(deliveryId).unwrap(),
                            })}
                            style={styles.actionBtn}
                        />
                    ) : null}
                    {canDriverConfirmPickup ? (
                        <Button
                            title="Livreur confirme pickup (QR)"
                            variant="secondary"
                            loading={isDriverConfirmingPickup}
                            onPress={() => openQrConfirmModal({
                                title: 'Confirmation pickup livreur',
                                caption: 'Montrez votre QR au vendeur, puis saisissez son code QR.',
                                displayToken: driverPickupToken,
                                expectedToken: sellerPickupToken,
                                inputPlaceholder: 'Code QR du vendeur',
                                action: () => driverConfirmPickup(deliveryId).unwrap(),
                            })}
                            style={styles.actionBtn}
                        />
                    ) : null}
                    {canArriveDropoff ? (
                        <Button title="Arrive dropoff" variant="secondary" loading={isArrivingDropoff} onPress={() => runAction(() => driverArriveDropoff(deliveryId).unwrap(), 'Arrivee dropoff confirmee.')} style={styles.actionBtn} />
                    ) : null}
                    {canBuyerConfirmDropoff ? (
                        <Button
                            title="Acheteur confirme depot (QR)"
                            variant="secondary"
                            loading={isBuyerConfirming}
                            onPress={() => openQrConfirmModal({
                                title: 'Confirmation depot acheteur',
                                caption: 'Montrez votre QR au livreur, puis saisissez son code QR.',
                                displayToken: buyerDropoffToken,
                                expectedToken: driverDropoffToken,
                                inputPlaceholder: 'Code QR du livreur',
                                action: () => buyerConfirmDropoff(deliveryId).unwrap(),
                            })}
                            style={styles.actionBtn}
                        />
                    ) : null}
                    {canDriverConfirmDropoff ? (
                        <Button
                            title="Livreur confirme fin (QR)"
                            variant="secondary"
                            loading={isDriverConfirmingDropoff}
                            onPress={() => openQrConfirmModal({
                                title: 'Confirmation fin de livraison',
                                caption: 'Montrez votre QR a l acheteur, puis saisissez son code QR.',
                                displayToken: driverDropoffToken,
                                expectedToken: buyerDropoffToken,
                                inputPlaceholder: 'Code QR de l acheteur',
                                action: () => driverConfirmDropoff(deliveryId).unwrap(),
                            })}
                            style={styles.actionBtn}
                        />
                    ) : null}
                    {!hasAnyAction ? (
                        <Text style={styles.infoText}>Aucune action disponible pour votre role a cette etape.</Text>
                    ) : null}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Messages</Text>
                    {messages.map((msg, index) => (
                        <View key={`${msg.sentAt}-${index}`} style={styles.msgBubble}>
                            <Text style={styles.msgRole}>{msg.senderRole}</Text>
                            <Text style={styles.msgText}>{msg.message}</Text>
                        </View>
                    ))}
                    {messages.length === 0 ? <Text style={styles.infoText}>Aucun message.</Text> : null}
                    <View style={styles.msgComposer}>
                        <TextInput style={styles.msgInput} value={messageInput} onChangeText={setMessageInput} placeholder="Ecrire un message..." />
                        <TouchableOpacity style={styles.sendBtn} onPress={onSendMessage} disabled={isSendingMessage}>
                            <Ionicons name="send" size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <LinearGradient colors={['#004080', '#003366']} style={styles.modalTopStripe} />
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
                        <View style={styles.modalHintBox}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                            <Text style={styles.modalHintText}>Confirmation securisee requise</Text>
                        </View>
                        <TextInput style={styles.modalInput} placeholder={qrInputPlaceholder} value={qrInput} onChangeText={setQrInput} autoCapitalize="characters" />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalGhost} onPress={() => setQrModalVisible(false)}>
                                <Text style={styles.modalGhostText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalPrimary} onPress={onValidateQr}>
                                <Text style={styles.modalPrimaryText}>Valider</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onConfirm={() => setAlert((prev) => ({ ...prev, visible: false }))} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    headerButton: { width: 36, height: 36, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray50 },
    headerBody: { flex: 1 },
    headerTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
    headerSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.gray500 },
    content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
    heroCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.md },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    heroTitle: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, flex: 1 },
    heroStatusPill: { borderRadius: BorderRadius.full, backgroundColor: Colors.white + '2E', borderWidth: 1, borderColor: Colors.white + '4A', paddingHorizontal: Spacing.sm, paddingVertical: 4 },
    heroStatusText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    heroTargetLabel: { marginTop: Spacing.md, color: Colors.white + 'C9', fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
    heroTargetValue: { marginTop: Spacing.xs, color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, lineHeight: 20 },
    heroMetricsRow: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
    heroMetric: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.white + '1D', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.white + '30', paddingHorizontal: Spacing.sm, paddingVertical: 6 },
    heroMetricText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight, padding: Spacing.md, ...Shadows.sm },
    cardTitle: { fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary, marginBottom: Spacing.sm },
    stagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    stageChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, backgroundColor: Colors.gray50, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
    stageChipDone: { backgroundColor: Colors.primary + 'D9', borderColor: Colors.primary },
    stageChipCurrent: { backgroundColor: Colors.primary },
    stageChipText: { color: Colors.gray500, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
    stageChipTextDone: { color: Colors.white },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    mapHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
    mapModeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
    mapModeButtonActive: { backgroundColor: Colors.primary },
    mapModeButtonText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
    mapModeButtonTextActive: { color: Colors.white },
    mapRefreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.gray200, backgroundColor: Colors.gray50 },
    mapRefreshText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
    mapWrap: { marginTop: Spacing.xs, height: 300, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
    mapWrapGuidance: { height: 500 },
    map: { width: '100%', height: '100%' },
    mapOverlayInfo: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, right: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary + '30', backgroundColor: Colors.white + 'F5', paddingHorizontal: Spacing.sm, paddingVertical: 6 },
    mapOverlayText: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.semibold },
    guidanceTopCard: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, right: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.sm, backgroundColor: Colors.primary + 'ED', borderWidth: 1, borderColor: Colors.white + '33' },
    guidanceInstructionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    guidanceInstructionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white + '24', alignItems: 'center', justifyContent: 'center' },
    guidanceInstructionTextWrap: { flex: 1 },
    guidanceInstructionTitle: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    guidanceInstructionMeta: { marginTop: 2, color: Colors.white + 'D4', fontSize: Typography.fontSize.xs },
    guidanceNextInstruction: { marginTop: Spacing.xs, color: Colors.white + 'D8', fontSize: Typography.fontSize.xs },
    recenterFab: { position: 'absolute', right: Spacing.sm, top: 104, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.gray200, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, ...Shadows.sm },
    guidanceBottomCard: { position: 'absolute', left: Spacing.sm, right: Spacing.sm, bottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.sm, backgroundColor: Colors.white + 'F0', borderWidth: 1, borderColor: Colors.borderLight },
    guidanceBottomMetrics: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.md },
    guidanceEta: { color: Colors.primary, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.extrabold },
    guidanceDistance: { color: Colors.gray600, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold },
    guidanceDestination: { marginTop: Spacing.xs, color: Colors.gray700, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    guidanceBottomActions: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.xs },
    mapActionsRow: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    mapActionButton: { flex: 1, minHeight: 40, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, ...Shadows.sm },
    mapActionButtonDisabled: { opacity: 0.55 },
    mapActionText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    mapActionSecondary: { flex: 1, minHeight: 40, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    mapActionSecondaryActive: { backgroundColor: Colors.primary },
    mapActionSecondaryText: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    mapActionSecondaryTextActive: { color: Colors.white },
    mapHint: { marginTop: Spacing.sm, color: Colors.gray600, fontSize: Typography.fontSize.xs, lineHeight: 18 },
    infoText: { fontSize: Typography.fontSize.sm, color: Colors.gray600, marginBottom: 2 },
    actionBtn: { marginBottom: Spacing.sm },
    qrBlock: { marginTop: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.md, backgroundColor: Colors.gray50, padding: Spacing.sm, width: '100%' },
    qrLabel: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
    qrImage: { width: 170, height: 170, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
    qrCode: { marginTop: Spacing.xs, fontSize: Typography.fontSize.xs, color: Colors.gray600, textAlign: 'center' },
    msgBubble: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.xs, backgroundColor: Colors.gray50 },
    msgRole: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase' },
    msgText: { fontSize: Typography.fontSize.sm, color: Colors.gray700, marginTop: 2 },
    msgComposer: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    msgInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, color: Colors.gray700, backgroundColor: Colors.white },
    sendBtn: { width: 36, height: 36, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
    modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden', ...Shadows.lg },
    modalTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
    modalIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.sm },
    modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary, textAlign: 'center' },
    modalCaption: { marginTop: Spacing.xs, textAlign: 'center', color: Colors.gray600, fontSize: Typography.fontSize.sm },
    modalHintBox: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.gray50, borderWidth: 1, borderColor: Colors.gray200 },
    modalHintText: { fontSize: Typography.fontSize.xs, color: Colors.primary, fontWeight: Typography.fontWeight.semibold },
    modalInput: { marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, color: Colors.primary, fontWeight: Typography.fontWeight.semibold, backgroundColor: Colors.gray50 },
    modalActions: { marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
    modalGhost: { flex: 1, borderWidth: 1, borderColor: Colors.gray300, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.gray50 },
    modalGhostText: { color: Colors.gray600, fontWeight: Typography.fontWeight.semibold },
    modalPrimary: { flex: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.primary },
    modalPrimaryText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    errorTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, color: Colors.primary },
    errorText: { textAlign: 'center', fontSize: Typography.fontSize.sm, color: Colors.gray600, marginBottom: Spacing.sm },
});
