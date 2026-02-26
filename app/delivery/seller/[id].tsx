import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QrCodeMatrix } from '@/components/ui/QrCodeMatrix';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    if (!value) return 'Recu recemment';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Recu recemment';
    const diff = Math.max(Math.floor((Date.now() - d.getTime()) / 60000), 0);
    if (diff < 1) return 'Recu a l instant';
    if (diff < 60) return `Recu il y a ${diff} min`;
    return `Recu il y a ${Math.floor(diff / 60)} h`;
};

const STEPS: { key: DeliveryStatusValue; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'pending', label: 'Attente', icon: 'time-outline' },
    { key: 'assigned', label: 'Assigne', icon: 'person-add-outline' },
    { key: 'at_pickup', label: 'Retrait', icon: 'storefront-outline' },
    { key: 'in_transit', label: 'Transit', icon: 'bicycle-outline' },
    { key: 'delivered', label: 'Livre', icon: 'checkmark-circle-outline' },
];

const getStepIndex = (status: DeliveryStatusValue): number => {
    if (status === 'pending') return 0;
    if (status === 'assigned') return 1;
    if (status === 'at_pickup') return 2;
    if (status === 'picked_up' || status === 'in_transit') return 3;
    if (status === 'at_dropoff' || status === 'delivered') return 4;
    return 0;
};

const statusLabel = (status: DeliveryStatusValue): string => {
    if (status === 'at_pickup') return 'Preparation';
    if (status === 'assigned') return 'Livreur assigne';
    if (status === 'picked_up' || status === 'in_transit') return 'En route';
    if (status === 'at_dropoff') return 'Arrive a destination';
    if (status === 'delivered') return 'Livree';
    return 'En attente';
};

const parseError = (error: any, fallback: string): string =>
    (Array.isArray(error?.data?.message) && String(error.data.message[0])) ||
    error?.data?.message ||
    error?.message ||
    fallback;

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
        Alert.alert('Contact indisponible', `Aucun numero ${label} disponible.`);
        return;
    }
    const url = `tel:${phone}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
        Alert.alert('Appel impossible', `Impossible d'appeler le ${label}.`);
        return;
    }
    await Linking.openURL(url);
};

export default function SellerDeliveryDetailScreen() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const deliveryId = (id || '').trim();
    const insets = useSafeAreaInsets();

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
    const currentStepIndex = getStepIndex(status);
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
        'Livreur';
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
            Alert.alert('Erreur', parseError(error, 'Impossible de generer le QR de retrait.'));
        }
    };

    const onMarkReady = async () => {
        if (!deliveryId || !canMarkReady) return;
        try {
            await sellerConfirmPickup(deliveryId).unwrap();
            await onRefreshAll();
            Alert.alert('Succes', 'Commande marquee prete pour le retrait.');
        } catch (error: any) {
            Alert.alert('Erreur', parseError(error, 'Impossible de marquer la commande comme prete.'));
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
            Alert.alert('Erreur', parseError(error, 'Impossible d envoyer le message.'));
        }
    };

    if (!deliveryId || isLoading) return <LoadingSpinner fullScreen />;
    if (!delivery) {
        return (
            <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
                <View style={styles.centerState}>
                    <Ionicons name="alert-circle-outline" size={48} color={UI.accent} />
                    <Text style={styles.errorTitle}>Livraison introuvable</Text>
                    <Text style={styles.errorSub}>Verifiez l identifiant ou vos permissions d acces.</Text>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => router.back()}>
                        <Text style={styles.ghostBtnText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const codeLabel = codeFromPayload(pickupQrPayload, deliveryId);
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
                colors={[Colors.primaryDark, '#1B487F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={UI.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.orderText}>#{deliveryId.slice(-8).toUpperCase()}</Text>
                    <View style={styles.liveBadge}>
                        <View style={[styles.liveDot, connectionState === 'connected' && styles.liveDotActive]} />
                        <Text style={styles.liveText}>{liveLabel}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={onRefreshAll}>
                    <Ionicons name="refresh" size={18} color={UI.text} />
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Stepper */}
                <View style={styles.stepperCard}>
                    <View style={styles.stepperHeader}>
                        <Text style={styles.stepperTitle}>{statusLabel(status)}</Text>
                        <Text style={styles.stepperSub}>{formatSince(delivery.createdAt)}</Text>
                    </View>
                    <View style={styles.stepperRow}>
                        {STEPS.map((step, index) => {
                            const isActive = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            return (
                                <React.Fragment key={step.key}>
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
                                                name={step.icon}
                                                size={14}
                                                color={isActive ? Colors.primaryDark : UI.textSoft}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.stepLabel,
                                            isActive && styles.stepLabelActive,
                                        ]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                </React.Fragment>
                            );
                        })}
                    </View>
                    <View style={styles.stepperMeta}>
                        <Text style={styles.stepperMetaText}>
                            Retrait vendeur: {sellerPickupConfirmed ? '✓ confirme' : '⏳ en attente'}
                        </Text>
                        <Text style={styles.stepperMetaText}>
                            {packedCount}/{Math.max(items.length, 1)} prepares
                        </Text>
                    </View>
                </View>

                {/* Driver Card */}
                <View style={styles.driverCard}>
                    <View style={styles.driverRow}>
                        <View style={styles.driverAvatar}>
                            <Ionicons name="person" size={18} color={Colors.primaryDark} />
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{driverName}</Text>
                            <View style={styles.driverStatusRow}>
                                <View style={styles.driverStatusDot} />
                                <Text style={styles.driverStatusText}>
                                    {status === 'assigned' || status === 'pending' ? 'En attente' : 'En route'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.contactRow}>
                        <TouchableOpacity style={styles.contactBtn} onPress={() => void openCall(driverPhone, 'livreur')}>
                            <Ionicons name="call-outline" size={16} color={UI.accent} />
                            <Text style={styles.contactBtnText}>Livreur</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.contactBtn} onPress={() => void openCall(buyerPhone, 'acheteur')}>
                            <Ionicons name="person-outline" size={16} color={UI.accent} />
                            <Text style={styles.contactBtnText}>Acheteur</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Map */}
                <View style={styles.mapCard}>
                    <MapView
                        style={styles.map}
                        {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                        initialRegion={{ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
                    >
                        {pickupPoint ? (
                            <Marker coordinate={pickupPoint} title="Point de retrait">
                                <View style={[styles.mapMarkerBadge, { backgroundColor: UI.accent }]}>
                                    <Ionicons name="storefront" size={15} color={Colors.white} />
                                </View>
                            </Marker>
                        ) : null}
                        {dropoffPoint ? (
                            <Marker coordinate={dropoffPoint} title="Point de livraison">
                                <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.info }]}>
                                    <Ionicons name="location" size={16} color={Colors.white} />
                                </View>
                            </Marker>
                        ) : null}
                        {driverPoint ? (
                            <Marker coordinate={driverPoint} title="Position livreur">
                                <View style={[styles.mapMarkerBadge, { backgroundColor: Colors.warning }]}>
                                    <Ionicons name="bicycle" size={15} color={Colors.white} />
                                </View>
                            </Marker>
                        ) : null}
                        {pickupPoint && dropoffPoint ? <Polyline coordinates={[pickupPoint, dropoffPoint]} strokeWidth={3} strokeColor={UI.accent + 'C0'} /> : null}
                    </MapView>
                </View>

                {/* Pickup Code Card */}
                <View style={styles.codeCard}>
                    <View style={styles.codeHeader}>
                        <View style={styles.codeIconCircle}>
                            <Ionicons name="qr-code-outline" size={18} color={Colors.primaryDark} />
                        </View>
                        <Text style={styles.codeSectionTitle}>Code de retrait</Text>
                    </View>
                    <Text style={styles.codeValue}>{codeLabel}</Text>
                    <Text style={styles.codeHint}>
                        {pickupQrExpiresAt
                            ? `Valide jusqu a ${formatClock(pickupQrExpiresAt)}`
                            : 'Generez un QR pour verifier le retrait'}
                    </Text>
                    <View style={styles.codeActions}>
                        <TouchableOpacity
                            style={[styles.codePrimaryBtn, (!canGenerateCode || isGeneratingQr) && styles.disabled]}
                            onPress={onGenerateCode}
                            disabled={!canGenerateCode || isGeneratingQr}
                        >
                            <Ionicons name="qr-code" size={14} color={Colors.primaryDark} />
                            <Text style={styles.codePrimaryBtnText}>
                                {isGeneratingQr ? 'Generation...' : pickupQrPayload ? 'Actualiser' : 'Generer QR'}
                            </Text>
                        </TouchableOpacity>
                        {pickupQrPayload ? (
                            <TouchableOpacity style={styles.codeSecondaryBtn} onPress={() => setQrModalVisible(true)}>
                                <Ionicons name="eye-outline" size={14} color={UI.accent} />
                                <Text style={styles.codeSecondaryBtnText}>Voir QR</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Order Checklist */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconCircle}>
                            <Ionicons name="list-outline" size={16} color={Colors.primaryDark} />
                        </View>
                        <Text style={styles.sectionTitle}>Controle commande</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{packedCount}/{items.length}</Text>
                        </View>
                    </View>
                    {items.map((item, index) => {
                        const key = String(index);
                        const checked = Boolean(packedMap[key]);
                        const product = getOrderItemProduct(item);
                        const lineTotal = Number(item.quantity || 0) * Number(item.price || 0);
                        return (
                            <TouchableOpacity
                                key={`${deliveryId}-${index}`}
                                style={[styles.checkRow, checked && styles.checkRowDone]}
                                onPress={() => setPackedMap((p) => ({ ...p, [key]: !p[key] }))}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                                    <Ionicons
                                        name={checked ? 'checkmark' : 'ellipse-outline'}
                                        size={checked ? 14 : 18}
                                        color={checked ? Colors.primaryDark : UI.textSoft}
                                    />
                                </View>
                                <View style={styles.checkBody}>
                                    <Text style={[styles.checkName, checked && styles.checkNameDone]}>
                                        {item.quantity}x {getOrderItemName(item)}
                                    </Text>
                                    <Text style={styles.checkSub}>
                                        {product?.description?.trim() || 'Pret pour le retrait'}
                                    </Text>
                                </View>
                                <Text style={styles.checkPrice}>
                                    {formatCurrencyAmount(lineTotal, product?.currency)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {items.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="cube-outline" size={18} color={UI.textSoft} />
                            <Text style={styles.emptyText}>Aucun article trouve.</Text>
                        </View>
                    ) : null}
                </View>

                {/* Messages */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconCircle}>
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primaryDark} />
                        </View>
                        <Text style={styles.sectionTitle}>Messages</Text>
                        {messages.length > 0 && (
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionBadgeText}>{messages.length}</Text>
                            </View>
                        )}
                    </View>
                    {messages.slice(-5).map((m, i) => {
                        const isSelf = m.senderRole === 'seller';
                        return (
                            <View key={`${m.sentAt}-${i}`} style={[styles.msgBubble, isSelf && styles.msgBubbleSelf]}>
                                <Text style={[styles.msgText, isSelf && styles.msgTextSelf]}>{m.message}</Text>
                                <Text style={[styles.msgTime, isSelf && styles.msgTimeSelf]}>
                                    {m.senderRole.replace('_', ' ')} • {formatClock(m.sentAt)}
                                </Text>
                            </View>
                        );
                    })}
                    {messages.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="chatbubbles-outline" size={18} color={UI.textSoft} />
                            <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
                        </View>
                    ) : null}
                    <View style={styles.composer}>
                        <TextInput
                            value={messageInput}
                            onChangeText={setMessageInput}
                            placeholder="Envoyer une instruction au livreur..."
                            placeholderTextColor={Colors.gray400}
                            style={styles.input}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!messageInput.trim() || isSendingMessage) && styles.disabled]}
                            disabled={!messageInput.trim() || isSendingMessage}
                            onPress={onSendMessage}
                        >
                            <Ionicons name="send" size={16} color={Colors.primaryDark} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={[styles.bottom, { paddingBottom: Spacing.lg + insets.bottom }]}>
                <TouchableOpacity
                    style={[styles.cta, (!canMarkReady || isMarkingReady) && styles.disabled]}
                    disabled={!canMarkReady || isMarkingReady}
                    onPress={onMarkReady}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={canMarkReady ? [UI.accent, UI.accentDark] : [UI.cardSoft, UI.card]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaGradient}
                    >
                        <Ionicons
                            name={canMarkReady ? 'checkmark-circle' : 'checkmark-done-circle'}
                            size={22}
                            color={canMarkReady ? Colors.primaryDark : UI.textSoft}
                        />
                        <Text style={[styles.ctaText, !canMarkReady && styles.ctaTextDone]}>
                            {isMarkingReady ? 'Validation...' : canMarkReady ? 'Marquer comme pret' : 'Pret confirme'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* QR Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <LinearGradient
                            colors={[Colors.primaryDark, Colors.primary]}
                            style={styles.modalHeader}
                        >
                            <Ionicons name="qr-code" size={24} color={UI.accent} />
                            <Text style={styles.modalTitle}>QR de retrait</Text>
                        </LinearGradient>
                        <View style={styles.modalBody}>
                            {pickupQrPayload ? (
                                <QrCodeMatrix value={pickupQrPayload} size={220} style={styles.modalQr} />
                            ) : null}
                            <Text style={styles.modalCodeLabel}>{codeLabel}</Text>
                            <Text style={styles.modalHint}>Presentez ce QR au livreur pour confirmer le retrait.</Text>
                        </View>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setQrModalVisible(false)}>
                            <Text style={styles.modalCloseText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: UI.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: UI.border + '60',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI.cardSoft + '80',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    orderText: {
        color: UI.text,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
        backgroundColor: UI.cardSoft + '60',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: UI.textSoft,
    },
    liveDotActive: {
        backgroundColor: Colors.success,
    },
    liveText: {
        color: UI.textSoft,
        fontSize: 10,
        fontWeight: Typography.fontWeight.bold,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: 130,
    },

    // Stepper
    stepperCard: {
        backgroundColor: UI.card,
        borderWidth: 1,
        borderColor: UI.border + '50',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    stepperHeader: {
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
    stepperSub: {
        color: UI.accent,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    stepItem: {
        alignItems: 'center',
        gap: 4,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: UI.cardSoft,
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
        backgroundColor: UI.cardSoft,
        borderRadius: 2,
        marginHorizontal: 2,
    },
    stepLineActive: {
        backgroundColor: UI.accent,
    },
    stepLabel: {
        color: UI.textSoft,
        fontSize: 9,
        fontWeight: Typography.fontWeight.bold,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: UI.accent,
    },
    stepperMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: UI.border + '40',
        paddingTop: Spacing.sm,
    },
    stepperMetaText: {
        color: UI.textSoft,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },

    // Driver
    driverCard: {
        backgroundColor: UI.card,
        borderWidth: 1,
        borderColor: UI.border + '50',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.md,
        ...Shadows.md,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    driverAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: UI.accent,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        color: UI.text,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    driverStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    driverStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: Colors.success,
    },
    driverStatusText: {
        color: UI.textSoft,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    contactRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: UI.accent + '40',
        backgroundColor: UI.cardSoft + '80',
    },
    contactBtnText: {
        color: UI.accent,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.sm,
    },

    // Map
    mapCard: {
        height: 220,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: UI.border + '50',
        ...Shadows.md,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapMarkerBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2.5,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },

    // Code Card
    codeCard: {
        backgroundColor: UI.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.sm,
        ...Shadows.md,
    },
    codeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    codeIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: UI.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeSectionTitle: {
        color: Colors.gray800,
        fontWeight: Typography.fontWeight.extrabold,
        fontSize: Typography.fontSize.md,
    },
    codeValue: {
        color: Colors.gray900,
        fontWeight: Typography.fontWeight.extrabold,
        fontSize: 36,
        letterSpacing: 2,
        textAlign: 'center',
        marginVertical: Spacing.xs,
    },
    codeHint: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
    codeActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    codePrimaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 42,
        borderRadius: BorderRadius.lg,
        backgroundColor: UI.accent,
    },
    codePrimaryBtnText: {
        color: Colors.primaryDark,
        fontWeight: Typography.fontWeight.extrabold,
        fontSize: Typography.fontSize.sm,
    },
    codeSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 42,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: UI.card,
    },
    codeSecondaryBtnText: {
        color: UI.card,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.sm,
    },

    // Generic card
    card: {
        backgroundColor: UI.card,
        borderWidth: 1,
        borderColor: UI.border + '50',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.sm,
        ...Shadows.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    sectionIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: UI.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        color: UI.text,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        flex: 1,
    },
    sectionBadge: {
        backgroundColor: UI.accent + '30',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    sectionBadgeText: {
        color: UI.accent,
        fontSize: 10,
        fontWeight: Typography.fontWeight.extrabold,
    },

    // Checklist
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: UI.border + '40',
        borderRadius: BorderRadius.lg,
        backgroundColor: UI.cardSoft + '60',
        padding: Spacing.sm,
    },
    checkRowDone: {
        backgroundColor: UI.accent + '15',
        borderColor: UI.accent + '30',
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: UI.cardSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleDone: {
        backgroundColor: UI.accent,
    },
    checkBody: {
        flex: 1,
    },
    checkName: {
        color: UI.text,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    checkNameDone: {
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    checkSub: {
        color: UI.textSoft,
        fontSize: Typography.fontSize.xs,
        marginTop: 1,
    },
    checkPrice: {
        color: UI.accent,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    emptyText: {
        color: UI.textSoft,
        fontSize: Typography.fontSize.sm,
    },

    // Messages
    msgBubble: {
        alignSelf: 'flex-start',
        maxWidth: '80%',
        backgroundColor: UI.cardSoft,
        borderRadius: BorderRadius.lg,
        borderBottomLeftRadius: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    msgBubbleSelf: {
        alignSelf: 'flex-end',
        backgroundColor: UI.accent + '22',
        borderBottomLeftRadius: BorderRadius.lg,
        borderBottomRightRadius: 4,
    },
    msgText: {
        color: UI.text,
        fontSize: Typography.fontSize.sm,
        lineHeight: 18,
    },
    msgTextSelf: {
        color: UI.accent,
    },
    msgTime: {
        color: UI.textSoft + 'AA',
        fontSize: 9,
        marginTop: 3,
    },
    msgTimeSelf: {
        textAlign: 'right',
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: UI.border + '30',
        paddingTop: Spacing.sm,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: UI.border + '60',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        color: Colors.gray800,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: Typography.fontSize.sm,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI.accent,
        ...Shadows.sm,
    },

    // Bottom
    bottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: UI.bg + 'F0',
        borderTopWidth: 1,
        borderTopColor: UI.border + '40',
        padding: Spacing.lg,
    },
    cta: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        height: 58,
        borderRadius: BorderRadius.xl,
    },
    ctaText: {
        color: Colors.primaryDark,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    ctaTextDone: {
        color: UI.textSoft,
    },
    disabled: {
        opacity: 0.5,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000000AA',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
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
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalQr: {
        width: 220,
        height: 220,
        borderRadius: BorderRadius.md,
    },
    modalCodeLabel: {
        marginTop: Spacing.md,
        color: Colors.gray800,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 1,
    },
    modalHint: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
    modalClose: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
    },
    modalCloseText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
        fontSize: Typography.fontSize.md,
    },

    // States
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    errorTitle: {
        color: UI.text,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    errorSub: {
        color: UI.textSoft,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
    ghostBtn: {
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: UI.border,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    ghostBtnText: {
        color: UI.text,
        fontWeight: Typography.fontWeight.bold,
    },
});
