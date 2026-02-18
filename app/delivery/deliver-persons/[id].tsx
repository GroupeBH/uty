import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import {
    useAcceptDeliveryMutation,
    useDriverArriveDropoffMutation,
    useDriverArrivePickupMutation,
    useGenerateDropoffQrMutation,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useScanPickupQrMutation,
} from '@/store/api/deliveriesApi';
import {
    DeliveryGeoPoint,
    DeliveryStatusValue,
    getDeliveryPersonRefId,
} from '@/types/delivery';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
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
const STEP_LABELS = ['ASSIGNED', 'AT PICKUP', 'IN TRANSIT', 'DELIVERED'];

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
    return { latitude: lat, longitude: lng };
};

const statusLabel = (status: DeliveryStatusValue): string => {
    if (status === 'pending') return 'Awaiting driver';
    if (status === 'assigned') return 'Assigned';
    if (status === 'at_pickup') return 'At pickup';
    if (status === 'picked_up' || status === 'in_transit') return 'In transit';
    if (status === 'at_dropoff') return 'At dropoff';
    if (status === 'delivered') return 'Delivered';
    if (status === 'failed') return 'Failed';
    if (status === 'cancelled') return 'Cancelled';
    return 'Pending';
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

const qrImageUrl = (token: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(token)}`;

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
    const { user, requireAuth } = useAuth();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
        pollingInterval: 5000,
    });
    const { data: deliveryProfile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !hasDriverRole,
    });

    const [acceptDelivery, { isLoading: isAccepting }] = useAcceptDeliveryMutation();
    const [driverArrivePickup, { isLoading: isArrivingPickup }] = useDriverArrivePickupMutation();
    const [scanPickupQr, { isLoading: isScanningPickupQr }] = useScanPickupQrMutation();
    const [driverArriveDropoff, { isLoading: isArrivingDropoff }] = useDriverArriveDropoffMutation();
    const [generateDropoffQr, { isLoading: isGeneratingDropoffQr }] = useGenerateDropoffQrMutation();

    const [qrModalVisible, setQrModalVisible] = React.useState(false);
    const [qrMode, setQrMode] = React.useState<'scan' | 'display'>('scan');
    const [qrTitle, setQrTitle] = React.useState('Verification QR');
    const [qrCaption, setQrCaption] = React.useState('Scannez puis validez le QR.');
    const [qrInput, setQrInput] = React.useState('');
    const [qrInputPlaceholder, setQrInputPlaceholder] = React.useState('Code QR');
    const [qrDisplayToken, setQrDisplayToken] = React.useState('');
    const [qrAction, setQrAction] = React.useState<null | ((qrData: string) => Promise<any>)>(null);
    const [isCameraVisible, setIsCameraVisible] = React.useState(false);
    const [isRequestingCamera, setIsRequestingCamera] = React.useState(false);
    const [isScanLocked, setIsScanLocked] = React.useState(false);

    const status = (tracking?.status || delivery?.status || 'pending') as DeliveryStatusValue;
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

    const pickupLabel = tracking?.pickupLocation || delivery?.pickupLocation || 'Pickup non renseigne';
    const dropoffLabel = tracking?.deliveryLocation || delivery?.deliveryLocation || 'Dropoff non renseigne';

    const orderPayload = delivery?.orderId && typeof delivery.orderId === 'object' ? (delivery.orderId as Record<string, any>) : null;
    const orderCode = String(orderPayload?._id || deliveryId).slice(-8).toUpperCase();
    const itemsCount = Array.isArray(orderPayload?.items)
        ? orderPayload.items.reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0)
        : 0;

    const route = (tracking?.route || delivery?.route || tracking?.calculatedRoute || delivery?.calculatedRoute || null) as Record<string, any> | null;
    const distanceMeters = Number(route?.totalDistanceMeters ?? route?.distanceMeters ?? 0);
    const durationSeconds = Number(route?.totalDurationSeconds ?? route?.durationSeconds ?? 0);
    const earningAmount = Number(orderPayload?.deliveryCost ?? orderPayload?.deliveryFee ?? 0);
    const earningLabel = earningAmount > 0 ? formatCurrencyAmount(earningAmount, orderPayload?.currency || 'CDF') : '--';

    const sellerPhone = normalizePhone((delivery?.sellerId as any)?.phone);
    const buyerPhone = normalizePhone((delivery?.buyerId as any)?.phone);

    const refetchAll = React.useCallback(async () => {
        await Promise.allSettled([refetchDelivery(), refetchTracking()]);
    }, [refetchDelivery, refetchTracking]);

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
            Alert.alert('Succes', 'Pickup valide. La livraison a demarre.');
        } catch (error: any) {
            Alert.alert('Erreur', parseError(error, 'Impossible de valider le QR pickup.'));
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
        ? { label: 'ACCEPT DELIVERY', loading: isAccepting, onPress: () => void runAction(() => acceptDelivery(deliveryId).unwrap(), 'Course acceptee.') }
        : canArrivePickup
          ? { label: 'I ARRIVED AT PICKUP', loading: isArrivingPickup, onPress: () => void runAction(() => driverArrivePickup(deliveryId).unwrap(), 'Arrivee pickup confirmee.') }
          : canScanPickupQr
            ? { label: 'SCAN PICKUP QR', loading: isScanningPickupQr, onPress: () => openScanModal({ title: 'Scan QR pickup', caption: 'Scannez le QR vendeur. Ce scan lance la livraison.', inputPlaceholder: 'Code QR pickup', action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap() }) }
            : canArriveDropoff
              ? { label: 'I ARRIVED AT DROPOFF', loading: isArrivingDropoff, onPress: () => void runAction(() => driverArriveDropoff(deliveryId).unwrap(), 'Arrivee dropoff confirmee.') }
              : canShowDropoffQr
                ? { label: 'SHOW DELIVERY QR', loading: isGeneratingDropoffQr, onPress: () => void onShowDropoffQr() }
                : null;

    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;

    if (!delivery) {
        return (
            <SafeAreaView style={styles.empty} edges={['top', 'bottom']}>
                <Text style={styles.emptyTitle}>Livraison introuvable</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
                    <Text style={styles.emptyBtnText}>Retour</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const step = stepIndex(status);
    const progress = step <= 0 ? 0 : ((step - 1) / (STEP_LABELS.length - 1)) * 100;

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={UI.text} /></TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTop}>NEW REQUEST</Text>
                    <Text style={styles.headerTitle}>Order #{orderCode}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Workflow', "Arrive au pickup -> scanner QR vendeur -> la livraison demarre.")}><Ionicons name="help-outline" size={20} color={UI.text} /></TouchableOpacity>
            </View>

            <View style={styles.mapWrap}>
                <MapView style={styles.map} {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                    initialRegion={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}>
                    {pickupPoint ? <Marker coordinate={pickupPoint} pinColor={Colors.accentDark} title="Pickup A" /> : null}
                    {dropoffPoint ? <Marker coordinate={dropoffPoint} pinColor={Colors.info} title="Dropoff B" /> : null}
                    {driverPoint ? <Marker coordinate={driverPoint} pinColor={Colors.primaryLight} title="Driver" /> : null}
                    {pickupPoint && dropoffPoint ? <Polyline coordinates={[pickupPoint, dropoffPoint]} strokeColor={Colors.primaryLight} strokeWidth={3} /> : null}
                </MapView>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.row}><Text style={styles.cardTitle}>ORDER STATUS: {statusLabel(status).toUpperCase()}</Text><Text style={styles.small}>Updated just now</Text></View>
                    <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
                    <View style={styles.stepsRow}>
                        {STEP_LABELS.map((label, index) => {
                            const active = step >= index + 1;
                            return <Text key={label} style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>;
                        })}
                    </View>
                </View>

                <View style={styles.metrics}>
                    <View style={styles.metric}><Text style={styles.metricValue}>{earningLabel}</Text><Text style={styles.metricLabel}>EST. EARNINGS</Text></View>
                    <View style={styles.metric}><Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text><Text style={styles.metricLabel}>DISTANCE</Text></View>
                    <View style={styles.metric}><Text style={styles.metricValue}>{formatDuration(durationSeconds)}</Text><Text style={styles.metricLabel}>DURATION</Text></View>
                    <View style={styles.metric}><Text style={styles.metricValue}>{itemsCount || '--'}</Text><Text style={styles.metricLabel}>ITEMS</Text></View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.locationTitle}>PICKUP FROM</Text>
                    <Text style={styles.locationText}>{pickupLabel}</Text>
                    <TouchableOpacity style={[styles.contactBtn, !sellerPhone && styles.disabled]} disabled={!sellerPhone} onPress={() => void openPhoneCall(sellerPhone, 'vendeur')}>
                        <Ionicons name="call-outline" size={14} color={UI.accent} /><Text style={styles.contactText}>Contact Seller</Text>
                    </TouchableOpacity>
                    <Text style={[styles.locationTitle, { marginTop: Spacing.md }]}>DELIVER TO</Text>
                    <Text style={styles.locationText}>{dropoffLabel}</Text>
                    <TouchableOpacity style={[styles.contactBtn, !buyerPhone && styles.disabled]} disabled={!buyerPhone} onPress={() => void openPhoneCall(buyerPhone, 'acheteur')}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={UI.accent} /><Text style={styles.contactText}>Contact Buyer</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.scanCard, !canScanPickupQr && styles.disabled]}
                    disabled={!canScanPickupQr}
                    onPress={() => openScanModal({
                        title: 'Scan QR pickup',
                        caption: 'Scannez le QR vendeur pour confirmer la recuperation et demarrer la livraison.',
                        inputPlaceholder: 'Code QR pickup vendeur',
                        action: (qrData) => scanPickupQr({ id: deliveryId, qrData }).unwrap(),
                    })}
                >
                    <Ionicons name="scan-outline" size={20} color={!canScanPickupQr ? UI.muted : UI.accent} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.scanTitle, !canScanPickupQr && { color: UI.muted }]}>Scan QR at Pickup</Text>
                        <Text style={styles.small}>{canScanPickupQr ? 'Disponible maintenant' : "Disponible apres l'arrivee au pickup"}</Text>
                    </View>
                    <Ionicons name={!canScanPickupQr ? 'lock-closed-outline' : 'arrow-forward'} size={18} color={!canScanPickupQr ? UI.muted : UI.accent} />
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.bottom}>
                <TouchableOpacity style={[styles.cta, (!primaryAction || primaryAction.loading) && styles.disabled]} disabled={!primaryAction || Boolean(primaryAction.loading)} onPress={() => primaryAction?.onPress()}>
                    <Text style={styles.ctaText}>{primaryAction?.loading ? 'PROCESSING...' : primaryAction?.label || 'NO ACTION AVAILABLE'}</Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.primaryDark} />
                </TouchableOpacity>
            </View>

            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={closeQrModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{qrTitle}</Text>
                        <Text style={styles.modalCaption}>{qrCaption}</Text>
                        {qrMode === 'display' ? (
                            <>
                                {qrDisplayToken ? <Image source={{ uri: qrImageUrl(qrDisplayToken) }} style={styles.qrImage} /> : null}
                                <Text style={styles.qrToken}>{qrDisplayToken}</Text>
                                <TouchableOpacity style={styles.modalPrimary} onPress={closeQrModal}><Text style={styles.modalPrimaryText}>Close</Text></TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.cameraBtn} onPress={() => void openCameraScanner()} disabled={isRequestingCamera}>
                                    <Ionicons name="camera-outline" size={16} color={Colors.white} />
                                    <Text style={styles.cameraBtnText}>{isRequestingCamera ? 'Camera permission...' : 'Scan with camera'}</Text>
                                </TouchableOpacity>
                                {isCameraVisible ? (
                                    <View style={styles.cameraWrap}>
                                        <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={isScanLocked ? undefined : onCameraQrScanned} />
                                    </View>
                                ) : null}
                                <TextInput style={styles.modalInput} value={qrInput} onChangeText={setQrInput} placeholder={qrInputPlaceholder} autoCapitalize="characters" />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.modalGhost} onPress={closeQrModal}><Text style={styles.modalGhostText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.modalPrimary} onPress={() => void validateQr()}><Text style={styles.modalPrimaryText}>Validate</Text></TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: UI.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.card, borderWidth: 1, borderColor: UI.border },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTop: { color: UI.accent, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.extrabold, letterSpacing: 0.8 },
    headerTitle: { marginTop: 2, color: UI.text, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.extrabold },
    mapWrap: { height: 260, borderTopWidth: 1, borderTopColor: UI.border, borderBottomWidth: 1, borderBottomColor: UI.border },
    map: { width: '100%', height: '100%' },
    content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120, marginTop: -20 },
    card: { backgroundColor: UI.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: UI.border, padding: Spacing.md, ...Shadows.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    cardTitle: { flex: 1, color: UI.accent, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.extrabold },
    small: { color: UI.muted, fontSize: Typography.fontSize.xs },
    track: { marginTop: Spacing.sm, height: 8, borderRadius: 999, backgroundColor: '#2B649F', overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: UI.accent },
    stepsRow: { marginTop: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
    stepLabel: { color: UI.muted, fontSize: 10, fontWeight: Typography.fontWeight.bold },
    stepLabelActive: { color: UI.accent },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metric: { width: '48%', alignItems: 'center', justifyContent: 'center', backgroundColor: UI.card, borderWidth: 1, borderColor: UI.border, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md },
    metricValue: { color: UI.text, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
    metricLabel: { marginTop: 2, color: UI.muted, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    locationTitle: { color: UI.muted, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    locationText: { marginTop: 2, color: UI.text, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold },
    contactBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: UI.accentDark, backgroundColor: '#2B649F', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactText: { color: UI.accent, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    scanCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: UI.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: UI.border, padding: Spacing.md },
    scanTitle: { color: UI.accent, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
    bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: UI.bg + 'F0', borderTopWidth: 1, borderTopColor: UI.border },
    cta: { minHeight: 56, borderRadius: BorderRadius.lg, backgroundColor: UI.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm },
    ctaText: { color: Colors.primaryDark, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold },
    disabled: { opacity: 0.55 },
    modalOverlay: { flex: 1, backgroundColor: '#00000085', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
    modalCard: { width: '100%', borderRadius: BorderRadius.xl, backgroundColor: Colors.white, padding: Spacing.lg, ...Shadows.lg },
    modalTitle: { color: Colors.primaryDark, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold, textAlign: 'center' },
    modalCaption: { marginTop: Spacing.xs, color: Colors.gray600, fontSize: Typography.fontSize.sm, textAlign: 'center' },
    qrImage: { marginTop: Spacing.md, alignSelf: 'center', width: 230, height: 230, borderRadius: BorderRadius.md },
    qrToken: { marginTop: Spacing.xs, color: Colors.gray700, fontSize: Typography.fontSize.xs, textAlign: 'center' },
    cameraBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    cameraBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    cameraWrap: { marginTop: Spacing.sm, height: 200, borderRadius: BorderRadius.md, overflow: 'hidden' },
    camera: { width: '100%', height: '100%' },
    modalInput: { marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, color: Colors.gray900 },
    modalActions: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm },
    modalGhost: { flex: 1, borderWidth: 1, borderColor: Colors.gray300, borderRadius: BorderRadius.md, backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
    modalGhostText: { color: Colors.gray700, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    modalPrimary: { flex: 1, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
    modalPrimaryText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.extrabold },
    empty: { flex: 1, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: UI.text, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
    emptyBtn: { marginTop: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: UI.border, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    emptyBtnText: { color: UI.text, fontWeight: Typography.fontWeight.bold },
});

