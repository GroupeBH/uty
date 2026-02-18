import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useDeliveryStream } from '@/hooks/useDeliveryStream';
import {
    useGeneratePickupQrMutation,
    useGetDeliveryMessagesQuery,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useSellerConfirmPickupMutation,
    useSendDeliveryMessageMutation,
} from '@/store/api/deliveriesApi';
import { useGetOrderQuery } from '@/store/api/ordersApi';
import { DeliveryGeoPoint, DeliveryStatusValue, getDeliveryActorId } from '@/types/delivery';
import { getOrderItemName, getOrderItemProduct } from '@/types/order';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
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

const UI = {
    bg: Colors.primaryDark,
    card: '#1B487F',
    cardSoft: '#255C9C',
    border: '#3B75B6',
    text: Colors.white,
    textSoft: '#C5D9F1',
    accent: Colors.accent,
    accentDark: Colors.accentDark,
    surface: '#F6F9FF',
};

const DEFAULT_MAP_CENTER: LatLng = { latitude: 5.3365, longitude: -4.0244 };

const parseGeoPoint = (value?: DeliveryGeoPoint | null): LatLng | null => {
    const coords = value?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { latitude: lat, longitude: lng };
};

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

const formatClock = (value?: string | null): string => {
    if (!value) return '--:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatSince = (value?: string): string => {
    if (!value) return 'Received recently';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Received recently';
    const diff = Math.max(Math.floor((Date.now() - d.getTime()) / 60000), 0);
    if (diff < 1) return 'Received just now';
    if (diff < 60) return `Received ${diff} mins ago`;
    return `Received ${Math.floor(diff / 60)}h ago`;
};

const statusProgress = (status: DeliveryStatusValue): number => {
    switch (status) {
        case 'assigned':
            return 40;
        case 'at_pickup':
            return 70;
        case 'picked_up':
        case 'in_transit':
            return 85;
        case 'at_dropoff':
            return 92;
        case 'delivered':
            return 100;
        default:
            return 20;
    }
};

const statusLabel = (status: DeliveryStatusValue): string => {
    if (status === 'at_pickup') return 'Preparing Order';
    if (status === 'assigned') return 'Driver Assigned';
    if (status === 'picked_up' || status === 'in_transit') return 'On The Way';
    if (status === 'at_dropoff') return 'At Dropoff';
    if (status === 'delivered') return 'Delivered';
    return 'Pending';
};

const parseError = (error: any, fallback: string): string =>
    (Array.isArray(error?.data?.message) && String(error.data.message[0])) ||
    error?.data?.message ||
    error?.message ||
    fallback;

const qrImageUrl = (token: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(token)}`;

const codeFromPayload = (payload: string | null, fallbackId: string): string => {
    if (payload?.trim()) {
        const chunks = payload.split('|');
        const token = chunks[chunks.length - 1] || '';
        const compact = token.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
        if (compact.length >= 4) return `UT-${compact}`;
    }
    return `UT-${fallbackId.slice(-4).toUpperCase()}`;
};

const normalizePhone = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const openCall = async (phone: string | null, label: string) => {
    if (!phone) {
        Alert.alert('Contact unavailable', `No ${label} phone number available.`);
        return;
    }
    const url = `tel:${phone}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
        Alert.alert('Call failed', `Unable to call ${label}.`);
        return;
    }
    await Linking.openURL(url);
};

export default function SellerDeliveryDetailScreen() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();

    const { data: delivery, isLoading, refetch } = useGetDeliveryQuery(deliveryId, { skip: !deliveryId });
    const { data: tracking, refetch: refetchTracking } = useGetDeliveryTrackingQuery(deliveryId, {
        skip: !deliveryId,
    });
    const { data: messages = [], refetch: refetchMessages } = useGetDeliveryMessagesQuery(deliveryId, {
        skip: !deliveryId,
    });
    const [generatePickupQr, { isLoading: isGeneratingQr }] = useGeneratePickupQrMutation();
    const [sellerConfirmPickup, { isLoading: isMarkingReady }] = useSellerConfirmPickupMutation();
    const [sendDeliveryMessage, { isLoading: isSendingMessage }] = useSendDeliveryMessageMutation();

    const orderId =
        typeof delivery?.orderId === 'string'
            ? delivery.orderId
            : typeof delivery?.orderId === 'object' && delivery?.orderId?._id
              ? String(delivery.orderId._id)
              : '';
    const { data: order } = useGetOrderQuery(orderId, { skip: !orderId });

    const [pickupQrPayload, setPickupQrPayload] = React.useState<string | null>(null);
    const [pickupQrExpiresAt, setPickupQrExpiresAt] = React.useState<string | null>(null);
    const [qrModalVisible, setQrModalVisible] = React.useState(false);
    const [messageInput, setMessageInput] = React.useState('');
    const [packedMap, setPackedMap] = React.useState<Record<string, boolean>>({});

    const status = (tracking?.status || delivery?.status || 'pending') as DeliveryStatusValue;
    const progress = statusProgress(status);
    const sellerId = getDeliveryActorId(delivery?.sellerId);
    const isSellerOwner = Boolean(user?._id && sellerId && String(user._id) === sellerId);

    const pickupPoint =
        parseGeoPoint((tracking?.pickupCoordinates || delivery?.pickupCoordinates) as DeliveryGeoPoint | null | undefined) ||
        parseCoordinateString(tracking?.pickupLocation || delivery?.pickupLocation);
    const dropoffPoint =
        parseGeoPoint((tracking?.deliveryCoordinates || delivery?.deliveryCoordinates) as DeliveryGeoPoint | null | undefined) ||
        parseCoordinateString(tracking?.deliveryLocation || delivery?.deliveryLocation);
    const driverPoint = parseGeoPoint((tracking?.currentLocation || delivery?.currentLocation) as DeliveryGeoPoint | null | undefined);
    const mapCenter = driverPoint || pickupPoint || dropoffPoint || DEFAULT_MAP_CENTER;

    const driverObj =
        delivery?.deliveryPersonId && typeof delivery.deliveryPersonId === 'object'
            ? (delivery.deliveryPersonId as Record<string, any>)
            : null;
    const driverUser =
        driverObj?.userId && typeof driverObj.userId === 'object'
            ? (driverObj.userId as Record<string, any>)
            : null;
    const buyerObj =
        order?.userId && typeof order.userId === 'object'
            ? (order.userId as Record<string, any>)
            : null;
    const driverName =
        [driverUser?.firstName, driverUser?.lastName].filter(Boolean).join(' ').trim() ||
        driverUser?.username ||
        'Driver';
    const driverPhone = normalizePhone(driverUser?.phone);
    const buyerPhone = normalizePhone(buyerObj?.phone);

    const items = React.useMemo(() => order?.items || [], [order?.items]);
    React.useEffect(() => {
        setPackedMap((prev) => {
            const next: Record<string, boolean> = {};
            items.forEach((_, index) => {
                const key = String(index);
                next[key] = prev[key] ?? ['picked_up', 'in_transit', 'at_dropoff', 'delivered'].includes(status);
            });
            return next;
        });
    }, [items, status]);

    const packedCount = items.reduce((sum, _, i) => (packedMap[String(i)] ? sum + 1 : sum), 0);
    const sellerPickupConfirmed = Boolean((tracking?.sellerPickupConfirmed ?? delivery?.sellerPickupConfirmed) === true);
    const canGenerateCode = isSellerOwner && ['assigned', 'at_pickup', 'in_transit'].includes(status);
    const canMarkReady = isSellerOwner && !sellerPickupConfirmed && ['assigned', 'at_pickup', 'in_transit'].includes(status);

    const onRefreshAll = React.useCallback(async () => {
        await Promise.allSettled([refetch(), refetchTracking(), refetchMessages()]);
    }, [refetch, refetchMessages, refetchTracking]);

    const lastStreamRefreshRef = React.useRef(0);
    const refreshFromStream = React.useCallback(() => {
        const now = Date.now();
        if (now - lastStreamRefreshRef.current < 1200) return;
        lastStreamRefreshRef.current = now;
        void onRefreshAll();
    }, [onRefreshAll]);

    const { connectionState } = useDeliveryStream({
        deliveryId,
        enabled: Boolean(deliveryId && isAuthenticated),
        onMessage: refreshFromStream,
    });

    const onGenerateCode = async () => {
        if (!deliveryId) return;
        try {
            const payload = await generatePickupQr(deliveryId).unwrap();
            setPickupQrPayload(payload?.qrPayload || null);
            setPickupQrExpiresAt(payload?.expiresAt || null);
            setQrModalVisible(Boolean(payload?.qrPayload));
        } catch (error: any) {
            Alert.alert('Error', parseError(error, 'Unable to generate pickup QR.'));
        }
    };

    const onMarkReady = async () => {
        if (!deliveryId || !canMarkReady) return;
        try {
            await sellerConfirmPickup(deliveryId).unwrap();
            await onRefreshAll();
            Alert.alert('Success', 'Order marked as ready for pickup.');
        } catch (error: any) {
            Alert.alert('Error', parseError(error, 'Unable to mark order as ready.'));
        }
    };

    const onSendMessage = async () => {
        const content = messageInput.trim();
        if (!deliveryId || !content) return;
        try {
            await sendDeliveryMessage({ id: deliveryId, message: content }).unwrap();
            setMessageInput('');
            await refetchMessages();
        } catch (error: any) {
            Alert.alert('Error', parseError(error, 'Unable to send message.'));
        }
    };

    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;
    if (!delivery) {
        return (
            <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
                <View style={styles.centerState}>
                    <Text style={styles.title}>Delivery not found</Text>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => router.back()}>
                        <Text style={styles.ghostBtnText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const codeLabel = codeFromPayload(pickupQrPayload, deliveryId);
    const liveLabel =
        connectionState === 'connected'
            ? 'LIVE'
            : connectionState === 'connecting'
              ? 'Connecting...'
              : 'Auto refresh';

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={UI.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.orderText}>Order #{deliveryId.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.subText}>{formatSince(delivery.createdAt)}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={onRefreshAll}>
                    <Ionicons name="refresh" size={20} color={UI.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.title}>Status: {statusLabel(status)}</Text>
                        <Text style={styles.percent}>{progress}%</Text>
                    </View>
                    <Text style={styles.meta}>{liveLabel}</Text>
                    <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
                    <View style={styles.row}>
                        <Text style={styles.meta}>Seller pickup: {sellerPickupConfirmed ? 'confirmed' : 'pending'}</Text>
                        <Text style={styles.meta}>{packedCount}/{Math.max(items.length, 1)} packed</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.title}>Driver: {driverName}</Text>
                        <Text style={styles.meta}>Live active</Text>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => void openCall(driverPhone, 'driver')}>
                            <Ionicons name="call-outline" size={16} color={UI.accent} />
                            <Text style={styles.actionText}>Call Driver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => void openCall(buyerPhone, 'buyer')}>
                            <Ionicons name="person-outline" size={16} color={UI.accent} />
                            <Text style={styles.actionText}>Call Buyer</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.mapCard}>
                    <MapView
                        style={styles.map}
                        {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                        initialRegion={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
                    >
                        {pickupPoint ? <Marker coordinate={pickupPoint} pinColor={UI.accent} title="Pickup" /> : null}
                        {dropoffPoint ? <Marker coordinate={dropoffPoint} pinColor={Colors.info} title="Dropoff" /> : null}
                        {driverPoint ? <Marker coordinate={driverPoint} pinColor={Colors.warning} title="Driver" /> : null}
                        {pickupPoint && dropoffPoint ? <Polyline coordinates={[pickupPoint, dropoffPoint]} strokeWidth={3} strokeColor={UI.accent + 'C0'} /> : null}
                    </MapView>
                </View>

                <View style={styles.surfaceCard}>
                    <Text style={styles.surfaceLabel}>DELIVERY CODE</Text>
                    <Text style={styles.surfaceCode}>{codeLabel}</Text>
                    <Text style={styles.surfaceHint}>{pickupQrExpiresAt ? `Valid until ${formatClock(pickupQrExpiresAt)}` : 'Generate QR for pickup verification'}</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.primarySmall, (!canGenerateCode || isGeneratingQr) && styles.disabled]} onPress={onGenerateCode} disabled={!canGenerateCode || isGeneratingQr}>
                            <Text style={styles.primarySmallText}>{isGeneratingQr ? 'Generating...' : pickupQrPayload ? 'Refresh QR' : 'Generate QR'}</Text>
                        </TouchableOpacity>
                        {pickupQrPayload ? (
                            <TouchableOpacity style={styles.secondarySmall} onPress={() => setQrModalVisible(true)}>
                                <Text style={styles.secondarySmallText}>Show QR</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Order Checklist</Text>
                    {items.map((item, index) => {
                        const key = String(index);
                        const checked = Boolean(packedMap[key]);
                        const product = getOrderItemProduct(item);
                        const lineTotal = Number(item.quantity || 0) * Number(item.price || 0);
                        return (
                            <TouchableOpacity key={`${deliveryId}-${index}`} style={styles.checkRow} onPress={() => setPackedMap((p) => ({ ...p, [key]: !p[key] }))}>
                                <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={checked ? UI.accent : UI.textSoft} />
                                <View style={styles.checkBody}>
                                    <Text style={styles.checkName}>{item.quantity}x {getOrderItemName(item)}</Text>
                                    <Text style={styles.checkSub}>{product?.description?.trim() || 'Packed for pickup'}</Text>
                                </View>
                                <Text style={styles.checkPrice}>{formatCurrencyAmount(lineTotal, product?.currency)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {items.length === 0 ? <Text style={styles.meta}>No items found.</Text> : null}
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Messages</Text>
                    {messages.slice(-3).map((m, i) => (
                        <Text key={`${m.sentAt}-${i}`} style={styles.messageLine}>{m.senderRole.replace('_', ' ')} • {formatClock(m.sentAt)}: {m.message}</Text>
                    ))}
                    {messages.length === 0 ? <Text style={styles.meta}>No messages yet.</Text> : null}
                    <View style={styles.composer}>
                        <TextInput value={messageInput} onChangeText={setMessageInput} placeholder="Send instruction to driver..." placeholderTextColor={Colors.gray500} style={styles.input} />
                        <TouchableOpacity style={[styles.sendBtn, (!messageInput.trim() || isSendingMessage) && styles.disabled]} disabled={!messageInput.trim() || isSendingMessage} onPress={onSendMessage}>
                            <Ionicons name="send" size={16} color={UI.bg} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottom}>
                <TouchableOpacity style={[styles.cta, (!canMarkReady || isMarkingReady) && styles.disabled]} disabled={!canMarkReady || isMarkingReady} onPress={onMarkReady}>
                    <Text style={styles.ctaText}>{isMarkingReady ? 'MARKING...' : canMarkReady ? 'MARK AS READY' : 'READY CONFIRMED'}</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Pickup QR</Text>
                        {pickupQrPayload ? <Image source={{ uri: qrImageUrl(pickupQrPayload) }} style={styles.modalQr} /> : null}
                        <Text style={styles.modalSub}>{codeLabel}</Text>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setQrModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: UI.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: UI.border },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.cardSoft },
    headerCenter: { flex: 1, alignItems: 'center' },
    orderText: { color: UI.text, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold },
    subText: { color: UI.accent, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, marginTop: 2 },
    content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
    card: { backgroundColor: UI.card, borderWidth: 1, borderColor: UI.border, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, ...Shadows.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    title: { color: UI.text, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold, flexShrink: 1 },
    percent: { color: UI.text, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
    meta: { color: UI.textSoft, fontSize: Typography.fontSize.sm, flex: 1 },
    track: { height: 12, borderRadius: 999, backgroundColor: UI.cardSoft, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: UI.accent },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: { flex: 1, minHeight: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: UI.accentDark, backgroundColor: UI.cardSoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    actionText: { color: UI.accent, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
    mapCard: { height: 210, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: UI.border },
    map: { width: '100%', height: '100%' },
    surfaceCard: { backgroundColor: UI.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
    surfaceLabel: { color: Colors.gray700, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.md },
    surfaceCode: { color: Colors.gray900, fontWeight: Typography.fontWeight.extrabold, fontSize: 34, letterSpacing: 1.2 },
    surfaceHint: { color: Colors.gray600, fontSize: Typography.fontSize.sm },
    primarySmall: { borderRadius: BorderRadius.md, backgroundColor: UI.card, paddingHorizontal: Spacing.sm, paddingVertical: 8 },
    primarySmallText: { color: UI.accent, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.xs },
    secondarySmall: { borderRadius: BorderRadius.md, borderWidth: 1, borderColor: UI.card, paddingHorizontal: Spacing.sm, paddingVertical: 8 },
    secondarySmallText: { color: UI.card, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.xs },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: UI.border, borderRadius: BorderRadius.md, backgroundColor: UI.cardSoft, padding: Spacing.sm },
    checkBody: { flex: 1 },
    checkName: { color: UI.text, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold },
    checkSub: { color: UI.textSoft, fontSize: Typography.fontSize.xs, marginTop: 1 },
    checkPrice: { color: UI.accent, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.extrabold },
    messageLine: { color: UI.textSoft, fontSize: Typography.fontSize.xs, lineHeight: 18 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
    input: { flex: 1, borderWidth: 1, borderColor: UI.border, borderRadius: BorderRadius.md, backgroundColor: Colors.white, color: Colors.gray800, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: Typography.fontSize.sm },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.accent },
    bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: UI.bg + 'EA', borderTopWidth: 1, borderTopColor: UI.border, padding: Spacing.lg },
    cta: { height: 56, borderRadius: BorderRadius.lg, backgroundColor: UI.accent, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: UI.bg, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold },
    disabled: { opacity: 0.55 },
    modalOverlay: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
    modalCard: { width: '100%', borderRadius: BorderRadius.xl, backgroundColor: Colors.white, padding: Spacing.lg, alignItems: 'center', ...Shadows.lg },
    modalTitle: { color: Colors.primary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold },
    modalQr: { marginTop: Spacing.md, width: 220, height: 220, borderRadius: BorderRadius.md },
    modalSub: { marginTop: Spacing.sm, color: Colors.gray700, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    modalClose: { marginTop: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    modalCloseText: { color: Colors.white, fontWeight: Typography.fontWeight.bold },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    ghostBtn: { marginTop: Spacing.md, borderWidth: 1, borderColor: UI.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    ghostBtnText: { color: UI.text, fontWeight: Typography.fontWeight.bold },
});
