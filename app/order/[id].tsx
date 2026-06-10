import { CustomAlert } from '@/components/ui/CustomAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MapPickerModal } from '@/components/MapPickerModal';
import { OrderProgressTimeline, getOrderProgressMeta } from '@/components/orders/OrderProgressTimeline';
import {
    RequestDeliveryFormValues,
    RequestDeliveryModal,
} from '@/components/orders/RequestDeliveryModal';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrderQuery, useRequestDeliveryMutation, useUpdateOrderStatusMutation } from '@/store/api/ordersApi';
import {
    OrderStatusValue,
    getNextSellerStatuses,
    getOrderItemImage,
    getOrderItemName,
    getOrderItemProduct,
    getOrderPartyId,
    getOrderPartyName,
} from '@/types/order';
import { formatCurrencyAmount } from '@/utils/currency';
import { deliveryStorage } from '@/utils/deliveryStorage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_ACTION_LABELS: Record<OrderStatusValue, string> = {
    pending: 'Remettre en attente',
    confirmed: 'Confirmer la commande',
    shipped: 'Marquer comme expediee',
    delivered: 'Marquer comme livree',
    cancelled: 'Annuler la commande',
};

const STATUS_ACTION_ICONS: Record<OrderStatusValue, keyof typeof Ionicons.glyphMap> = {
    pending: 'time-outline',
    confirmed: 'checkmark-circle-outline',
    shipped: 'cube-outline',
    delivered: 'checkmark-done-outline',
    cancelled: 'close-circle-outline',
};

const formatAmount = (value: number | undefined, currency?: unknown) =>
    formatCurrencyAmount(value, currency);

const formatDateTime = (value?: string) => {
    if (!value) return 'Date inconnue';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';

    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const parseCoordinateLabel = (
    value?: string | null,
): { latitude: number; longitude: number } | null => {
    if (!value?.trim()) return null;
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { latitude, longitude };
};

const formatGeoPointLabel = (value?: { coordinates?: number[] } | null): string => {
    const coordinates = value?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const getOrderPartyPhone = (party: unknown): string | null => {
    if (!party || typeof party !== 'object') return null;
    const phone = (party as { phone?: string }).phone?.trim();
    return phone || null;
};

const getOrderPartyEmail = (party: unknown): string | null => {
    if (!party || typeof party !== 'object') return null;
    const email = (party as { email?: string }).email?.trim();
    return email || null;
};

const getOrderPartyUsername = (party: unknown): string | null => {
    if (!party || typeof party !== 'object') return null;
    const username = (party as { username?: string }).username?.trim();
    return username || null;
};

const normalizePhoneUrl = (phone: string) => phone.replace(/[^\d+]/g, '');

const INITIAL_DELIVERY_REQUEST_FORM: RequestDeliveryFormValues = {
    pickupLocation: '',
    deliveryLocation: '',
    scheduledPickupAt: '',
    scheduledDeliveryAt: '',
    comment: '',
    deliveryMode: 'auto',
};

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
    const [requestDelivery, { isLoading: isRequestingDelivery }] = useRequestDeliveryMutation();
    const { data: order, isLoading, refetch } = useGetOrderQuery(id || '', { skip: !id });
    const [deliveryId, setDeliveryId] = React.useState<string | null>(null);
    const [deliveryIdInput, setDeliveryIdInput] = React.useState('');
    const [showDeliveryIdInput, setShowDeliveryIdInput] = React.useState(false);
    const [pickupLocationInput, setPickupLocationInput] = React.useState('');
    const [deliveryLocationInput, setDeliveryLocationInput] = React.useState('');
    const [mapPickerField, setMapPickerField] = React.useState<'pickup' | 'delivery' | null>(null);
    const [deliveryRequestModalVisible, setDeliveryRequestModalVisible] = React.useState(false);
    const [profileModalVisible, setProfileModalVisible] = React.useState(false);
    const [routeModalVisible, setRouteModalVisible] = React.useState(false);
    const [itemsModalVisible, setItemsModalVisible] = React.useState(false);
    const [deliveryRequestForm, setDeliveryRequestForm] = React.useState<RequestDeliveryFormValues>(
        INITIAL_DELIVERY_REQUEST_FORM,
    );
    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'OK',
        cancelText: 'Annuler',
        showCancel: false,
    });

    const currentUserId = user?._id || '';
    const buyerId = getOrderPartyId(order?.userId);
    const sellerId = getOrderPartyId(order?.sellerId);
    const isSeller = Boolean(currentUserId && sellerId === currentUserId);
    const isBuyer = Boolean(currentUserId && buyerId === currentUserId);
    const canActAsDriver = Boolean(
        user?.roles?.some((role) =>
            ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(
                (role || '').toLowerCase(),
            ),
        ),
    );
    const resolveDeliveryRoute = React.useCallback(
        (targetDeliveryId: string) => {
            const normalizedId = targetDeliveryId.trim();
            if (!normalizedId) return '/orders';
            if (isSeller) return `/delivery/seller/${normalizedId}`;
            if (isBuyer) return `/delivery/buyer/${normalizedId}`;
            if (canActAsDriver) return `/delivery/deliver-persons/${normalizedId}`;
            return `/delivery/${normalizedId}`;
        },
        [canActAsDriver, isBuyer, isSeller],
    );

    const nextStatuses = React.useMemo(
        () => (order && isSeller ? getNextSellerStatuses(order.status) : []),
        [isSeller, order],
    );
    const mapInitialLocation = React.useMemo(() => {
        if (!mapPickerField) return undefined;
        const sourceValue =
            mapPickerField === 'pickup' ? pickupLocationInput : deliveryLocationInput;
        const coordinates = parseCoordinateLabel(sourceValue);
        if (!coordinates) return undefined;
        return {
            ...coordinates,
            address: sourceValue.trim() || undefined,
        };
    }, [deliveryLocationInput, mapPickerField, pickupLocationInput]);

    React.useEffect(() => {
        const orderId = order?._id;
        if (!orderId) return;

        let cancelled = false;

        (async () => {
            const savedDeliveryId = await deliveryStorage.getDeliveryIdForOrder(orderId);
            if (!cancelled && savedDeliveryId) {
                setDeliveryId(savedDeliveryId);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [order?._id]);

    React.useEffect(() => {
        if (!order) return;
        if (!deliveryLocationInput.trim() && order.deliveryAddress?.trim()) {
            const deliveryAddress = order.deliveryAddress.trim();
            setDeliveryLocationInput(deliveryAddress);
            setDeliveryRequestForm((prev) => ({
                ...prev,
                deliveryLocation: prev.deliveryLocation || deliveryAddress,
            }));
        }
    }, [deliveryLocationInput, order]);

    const closeAlert = React.useCallback(() => {
        setAlertState((prev) => ({
            ...prev,
            visible: false,
            onConfirm: undefined,
            onCancel: undefined,
        }));
    }, []);

    const showAlert = React.useCallback(
        (payload: {
            title: string;
            message: string;
            type?: 'success' | 'error' | 'info' | 'warning';
            confirmText?: string;
            cancelText?: string;
            showCancel?: boolean;
            onConfirm?: () => void;
            onCancel?: () => void;
        }) => {
            setAlertState({
                visible: true,
                title: payload.title,
                message: payload.message,
                type: payload.type || 'info',
                confirmText: payload.confirmText || 'OK',
                cancelText: payload.cancelText || 'Annuler',
                showCancel: payload.showCancel || false,
                onConfirm: payload.onConfirm,
                onCancel: payload.onCancel,
            });
        },
        [],
    );

    const callParty = React.useCallback(
        async (phone: string | null, label: string) => {
            if (!phone) {
                showAlert({
                    title: 'Contact indisponible',
                    message: `Aucun numero ${label} disponible pour cette commande.`,
                    type: 'warning',
                });
                return;
            }

            const url = `tel:${normalizePhoneUrl(phone)}`;
            try {
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) {
                    throw new Error('tel unsupported');
                }
                await Linking.openURL(url);
            } catch {
                showAlert({
                    title: 'Appel impossible',
                    message: `Impossible d'appeler le ${label}.`,
                    type: 'error',
                });
            }
        },
        [showAlert],
    );

    const changeStatus = async (nextStatus: OrderStatusValue) => {
        if (!order?._id) return;

        const isPositiveConfirmation = nextStatus === 'confirmed';
        const isRiskyAction = nextStatus === 'cancelled';
        const modalType: 'success' | 'warning' | 'info' = isPositiveConfirmation
            ? 'success'
            : isRiskyAction
                ? 'warning'
                : 'info';
        const modalTitle = isPositiveConfirmation
            ? 'Confirmer la commande'
            : isRiskyAction
                ? 'Confirmer l annulation'
                : 'Confirmer le changement';
        const modalMessage = isPositiveConfirmation
            ? 'Voulez-vous confirmer cette commande maintenant ?'
            : `Passer la commande au statut "${STATUS_ACTION_LABELS[nextStatus]}" ?`;

        showAlert({
            title: modalTitle,
            message: modalMessage,
            type: modalType,
            showCancel: true,
            confirmText: isPositiveConfirmation ? 'Oui, confirmer' : 'Confirmer',
            cancelText: 'Annuler',
            onConfirm: () => {
                void (async () => {
                    try {
                        await updateOrderStatus({ id: order._id, status: nextStatus }).unwrap();
                        await refetch();
                        const isOrderConfirmed = nextStatus === 'confirmed';
                        const successTitle = isOrderConfirmed ? 'Commande confirmee' : 'Statut mis a jour';
                        const successMessage =
                            isOrderConfirmed
                                ? 'La commande est acceptee. Prochaine etape: demander une livraison.'
                                : 'Le statut de la commande a ete modifie avec succes.';
                        showAlert({
                            title: successTitle,
                            message: successMessage,
                            type: 'success',
                            showCancel: isOrderConfirmed && !deliveryId,
                            confirmText:
                                isOrderConfirmed && !deliveryId
                                    ? 'Demander la livraison'
                                    : 'OK',
                            cancelText: 'Plus tard',
                            onConfirm:
                                isOrderConfirmed && !deliveryId
                                    ? () => {
                                          setDeliveryRequestForm((prev) => ({
                                              ...prev,
                                              pickupLocation:
                                                  prev.pickupLocation ||
                                                  pickupLocationInput.trim() ||
                                                  formatGeoPointLabel((order as any)?.pickupLocation),
                                              deliveryLocation:
                                                  prev.deliveryLocation ||
                                                  deliveryLocationInput.trim() ||
                                                  order.deliveryAddress?.trim() ||
                                                  formatGeoPointLabel(order.deliveryLocation),
                                          }));
                                          setDeliveryRequestModalVisible(true);
                                      }
                                    : undefined,
                        });
                    } catch (error: any) {
                        const apiMessage =
                            (Array.isArray(error?.data?.message) && error.data.message[0]) ||
                            error?.data?.message ||
                            error?.data?.error ||
                            error?.message ||
                            'Impossible de mettre a jour le statut.';
                        showAlert({
                            title: 'Erreur',
                            message: String(apiMessage),
                            type: 'error',
                        });
                    }
                })();
            },
        });
    };

    const onRequestDelivery = async () => {
        if (!order?._id) return;

        try {
            const form = deliveryRequestForm;
            const pickupLocation =
                form.pickupLocation.trim() ||
                pickupLocationInput.trim() ||
                formatGeoPointLabel((order as any)?.pickupLocation);
            const deliveryLocation =
                form.deliveryLocation.trim() ||
                deliveryLocationInput.trim() ||
                order.deliveryAddress?.trim() ||
                formatGeoPointLabel(order.deliveryLocation);
            const payload = {
                pickupLocation: pickupLocation || undefined,
                deliveryLocation: deliveryLocation || undefined,
                scheduledPickupAt: form.scheduledPickupAt.trim() || undefined,
                scheduledDeliveryAt: form.scheduledDeliveryAt.trim() || undefined,
                comment: form.comment.trim() || undefined,
                deliveryMode: form.deliveryMode !== 'auto' ? form.deliveryMode : undefined,
            };
            setPickupLocationInput(pickupLocation);
            setDeliveryLocationInput(deliveryLocation);
            const createdDelivery = await requestDelivery({ id: order._id, data: payload }).unwrap();
            const createdDeliveryId = (createdDelivery as any)?._id?.toString?.() || (createdDelivery as any)?._id;

            if (createdDeliveryId) {
                setDeliveryId(String(createdDeliveryId));
                setShowDeliveryIdInput(false);
                setDeliveryRequestModalVisible(false);
                await deliveryStorage.setDeliveryIdForOrder(order._id, String(createdDeliveryId));
            }
            await refetch();

            showAlert({
                title: 'Livraison demandee',
                message: 'La demande est envoyee aux livreurs disponibles.',
                type: 'success',
                showCancel: Boolean(createdDeliveryId),
                confirmText: createdDeliveryId ? 'Suivre' : 'OK',
                cancelText: 'Fermer',
                onConfirm: () => {
                    if (createdDeliveryId) {
                        router.push(resolveDeliveryRoute(String(createdDeliveryId)) as any);
                    }
                },
            });
        } catch (error: any) {
            const apiMessage =
                (Array.isArray(error?.data?.message) && error.data.message[0]) ||
                error?.data?.message ||
                error?.data?.error ||
                error?.message ||
                'Impossible de demander la livraison.';
            showAlert({
                title: 'Erreur',
                message: String(apiMessage),
                type: 'error',
            });
        }
    };

    const onOpenDeliveryById = async () => {
        const candidate = deliveryIdInput.trim();
        if (!candidate || !order?._id) {
            showAlert({
                title: 'ID requis',
                message: 'Veuillez renseigner un ID de livraison valide.',
                type: 'warning',
            });
            return;
        }
        setDeliveryId(candidate);
        setShowDeliveryIdInput(false);
        await deliveryStorage.setDeliveryIdForOrder(order._id, candidate);
        router.push(resolveDeliveryRoute(candidate) as any);
    };

    const onMapConfirm = React.useCallback(
        (location: { latitude: number; longitude: number; address?: string }) => {
            const formattedLocation =
                location.address?.trim() ||
                `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
            if (mapPickerField === 'pickup') {
                setPickupLocationInput(formattedLocation);
                setDeliveryRequestForm((prev) => ({
                    ...prev,
                    pickupLocation: formattedLocation,
                }));
            } else if (mapPickerField === 'delivery') {
                setDeliveryLocationInput(formattedLocation);
                setDeliveryRequestForm((prev) => ({
                    ...prev,
                    deliveryLocation: formattedLocation,
                }));
            }
            setMapPickerField(null);
        },
        [mapPickerField],
    );

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.emptyContainer} edges={['top', 'bottom']}>
                <Ionicons name="receipt-outline" size={52} color={Colors.gray400} />
                <Text style={styles.emptyTitle}>Commande introuvable</Text>
                <TouchableOpacity style={styles.backGhostButton} onPress={() => router.back()}>
                    <Text style={styles.backGhostButtonText}>Retour</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const orderCurrency = order.items
        .map((item) => getOrderItemProduct(item)?.currency)
        .find(Boolean);
    const progressMeta = getOrderProgressMeta(order.status);
    const showSellerActionsDock = isSeller;
    const canRequestDeliveryNow = isSeller && order.status === 'confirmed' && !deliveryId;
    const canTrackDeliveryNow = isSeller && Boolean(deliveryId);
    const hasSellerStatusActions = nextStatuses.length > 0;
    const pickupLocationLabel =
        pickupLocationInput.trim() ||
        formatGeoPointLabel((order as any)?.pickupLocation) ||
        'Point de retrait a confirmer';
    const deliveryLocationLabel =
        deliveryLocationInput.trim() ||
        order.deliveryAddress?.trim() ||
        formatGeoPointLabel(order.deliveryLocation) ||
        'Adresse de livraison a confirmer';
    const deliveryPanelStatus = deliveryId
        ? 'Livraison creee'
        : canRequestDeliveryNow
            ? 'Pret a demander'
            : order.status === 'pending'
                ? 'Commande a confirmer'
                : 'Livraison non disponible';
    const deliveryPanelHint = deliveryId
        ? `Course #${deliveryId.slice(-8).toUpperCase()} liee a cette commande.`
        : canRequestDeliveryNow
            ? 'Choisissez le mode, les horaires et les consignes avant d envoyer la demande.'
            : order.status === 'pending'
                ? 'Confirmez la commande pour debloquer la demande de livraison.'
                : 'La demande de livraison n est plus disponible pour ce statut.';
    const visibleParties = isSeller
        ? [
              {
                  key: 'buyer',
                  label: 'Acheteur',
                  name: getOrderPartyName(order.userId, 'Client inconnu'),
                  phone: getOrderPartyPhone(order.userId),
                  email: getOrderPartyEmail(order.userId),
                  username: getOrderPartyUsername(order.userId),
                  icon: 'person-outline' as const,
                  callLabel: 'client',
              },
          ]
        : isBuyer
            ? [
                  {
                      key: 'seller',
                      label: 'Vendeur',
                      name: getOrderPartyName(order.sellerId, 'Vendeur inconnu'),
                      phone: getOrderPartyPhone(order.sellerId),
                      email: getOrderPartyEmail(order.sellerId),
                      username: getOrderPartyUsername(order.sellerId),
                      icon: 'storefront-outline' as const,
                      callLabel: 'vendeur',
                  },
              ]
            : [
                  {
                      key: 'buyer',
                      label: 'Acheteur',
                      name: getOrderPartyName(order.userId, 'Client inconnu'),
                      phone: getOrderPartyPhone(order.userId),
                      email: getOrderPartyEmail(order.userId),
                      username: getOrderPartyUsername(order.userId),
                      icon: 'person-outline' as const,
                      callLabel: 'client',
                  },
                  {
                      key: 'seller',
                      label: 'Vendeur',
                      name: getOrderPartyName(order.sellerId, 'Vendeur inconnu'),
                      phone: getOrderPartyPhone(order.sellerId),
                      email: getOrderPartyEmail(order.sellerId),
                      username: getOrderPartyUsername(order.sellerId),
                      icon: 'storefront-outline' as const,
                      callLabel: 'vendeur',
                  },
              ];
    const primaryParty = visibleParties[0];
    const primaryPartyContact =
        primaryParty?.username
            ? `@${primaryParty.username}`
            : primaryParty?.email || primaryParty?.phone || 'Profil public';
    const primaryPartyPhone = primaryParty?.phone || null;
    const primaryPartyCallLabel = primaryParty?.callLabel || 'contact';
    const firstItem = order.items[0];
    const firstItemImage = firstItem ? getOrderItemImage(firstItem) : undefined;
    const firstItemName = firstItem ? getOrderItemName(firstItem) : 'Articles de la commande';
    const itemSummaryText = `${itemCount} article${itemCount > 1 ? 's' : ''}`;
    const openDeliveryRequestModal = () => {
        setDeliveryRequestForm((prev) => ({
            ...prev,
            pickupLocation: prev.pickupLocation || pickupLocationLabel,
            deliveryLocation: prev.deliveryLocation || deliveryLocationLabel,
        }));
        setDeliveryRequestModalVisible(true);
    };
    const sellerDockBottomInset = Math.max(insets.bottom, Spacing.sm);
    const sellerDockEstimatedHeight = hasSellerStatusActions
        ? 176
        : canRequestDeliveryNow
            ? 188
            : canTrackDeliveryNow
                ? 156
                : 122;
    const contentBottomPadding = showSellerActionsDock
        ? sellerDockEstimatedHeight + sellerDockBottomInset + Spacing.lg
        : Spacing.xxxl;
    const modalBottomPadding = Math.max(insets.bottom, Spacing.lg);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={22} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerBody}>
                    <Text style={styles.headerTitle}>Commande #{order._id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.headerSubTitle}>{formatDateTime(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
            >
                <View style={[styles.trackingHero, { backgroundColor: progressMeta.accentBackground }]}>
                    <View style={styles.trackingHeroTop}>
                        <View style={[styles.trackingHeroIcon, { backgroundColor: progressMeta.color + '18' }]}>
                            <Ionicons
                                name={order.status === 'delivered' ? 'checkmark-done-outline' : 'navigate-outline'}
                                size={24}
                                color={progressMeta.color}
                            />
                        </View>
                        <View style={styles.trackingHeroCopy}>
                            <Text style={styles.trackingHeroEyebrow}>Suivi commande</Text>
                            <Text style={styles.trackingHeroTitle}>{progressMeta.headline}</Text>
                            <Text style={styles.trackingHeroText}>{progressMeta.helper}</Text>
                        </View>
                        <Text style={styles.trackingHeroPercent}>{progressMeta.progressPercent}%</Text>
                    </View>
                    <OrderProgressTimeline status={order.status} variant="full" />
                </View>

                <View style={styles.quickCardsGrid}>
                    <TouchableOpacity
                        style={[styles.quickCard, styles.quickCardFeatured]}
                        onPress={() => setProfileModalVisible(true)}
                        activeOpacity={0.88}
                    >
                        <View style={styles.quickCardIconWrap}>
                            <Ionicons
                                name={primaryParty?.icon || 'person-outline'}
                                size={19}
                                color={Colors.white}
                            />
                        </View>
                        <View style={styles.quickCardBody}>
                            <Text style={[styles.quickCardEyebrow, styles.quickCardFeaturedEyebrow]}>Parties</Text>
                            <Text style={[styles.quickCardTitle, styles.quickCardFeaturedTitle]} numberOfLines={1}>
                                {primaryParty?.name || 'Interlocuteur'}
                            </Text>
                            <Text style={[styles.quickCardText, styles.quickCardFeaturedText]} numberOfLines={1}>
                                {primaryParty?.label || 'Profil public'} - {primaryPartyContact}
                            </Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={Colors.white}
                            style={styles.quickCardChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickCard}
                        onPress={() => setRouteModalVisible(true)}
                        activeOpacity={0.88}
                    >
                        <View style={[styles.quickCardIconWrap, styles.quickCardIconSoft]}>
                            <Ionicons name="map-outline" size={19} color={Colors.primary} />
                        </View>
                        <View style={styles.quickCardBody}>
                            <Text style={styles.quickCardEyebrow}>Adresse de livraison</Text>
                            <Text style={styles.quickCardTitle} numberOfLines={1}>
                                Trajet prevu
                            </Text>
                            <Text style={styles.quickCardText} numberOfLines={2}>
                                {deliveryLocationLabel}
                            </Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={Colors.primary}
                            style={styles.quickCardChevron}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickCard}
                        onPress={() => setItemsModalVisible(true)}
                        activeOpacity={0.88}
                    >
                        <View style={styles.quickItemThumb}>
                            {firstItemImage ? (
                                <Image source={{ uri: firstItemImage }} style={styles.quickItemImage} />
                            ) : (
                                <Ionicons name="cube-outline" size={19} color={Colors.primary} />
                            )}
                        </View>
                        <View style={styles.quickCardBody}>
                            <Text style={styles.quickCardEyebrow}>Articles commandes</Text>
                            <Text style={styles.quickCardTitle} numberOfLines={1}>
                                {firstItemName}
                            </Text>
                            <Text style={styles.quickCardText} numberOfLines={1}>
                                {itemSummaryText} - {formatAmount(order.totalAmount, orderCurrency)}
                            </Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={Colors.primary}
                            style={styles.quickCardChevron}
                        />
                    </TouchableOpacity>
                </View>

                {!isSeller ? (
                    <View style={[styles.card, styles.deliveryPanel]}>
                    <View style={styles.deliveryPanelHeader}>
                        <View style={styles.deliveryPanelIcon}>
                            <Ionicons
                                name={deliveryId ? 'navigate-circle-outline' : 'bicycle-outline'}
                                size={20}
                                color={Colors.primary}
                            />
                        </View>
                        <View style={styles.deliveryPanelTitleWrap}>
                            <Text style={styles.cardTitle}>Livraison</Text>
                            <Text style={styles.deliveryPanelHint}>{deliveryPanelHint}</Text>
                        </View>
                        <View style={styles.deliveryStatusPill}>
                            <Text style={styles.deliveryStatusPillText}>{deliveryPanelStatus}</Text>
                        </View>
                    </View>

                    {deliveryId ? (
                        <TouchableOpacity
                            style={styles.deliveryTrackButton}
                            onPress={() => router.push(resolveDeliveryRoute(deliveryId) as any)}
                        >
                            <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                            <Text style={styles.deliveryTrackButtonText}>Suivre la livraison</Text>
                        </TouchableOpacity>
                    ) : isSeller && order.status === 'confirmed' ? (
                        <>
                            <View style={styles.deliveryRoutePreview}>
                                <View style={styles.deliveryPoint}>
                                    <View style={styles.deliveryPointIcon}>
                                        <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                                    </View>
                                    <View style={styles.deliveryPointCopy}>
                                        <Text style={styles.deliveryPointLabel}>Retrait vendeur</Text>
                                        <Text style={styles.deliveryPointValue} numberOfLines={2}>
                                            {pickupLocationLabel}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.deliveryRouteDivider} />

                                <View style={styles.deliveryPoint}>
                                    <View style={styles.deliveryPointIcon}>
                                        <Ionicons name="location-outline" size={16} color={Colors.primary} />
                                    </View>
                                    <View style={styles.deliveryPointCopy}>
                                        <Text style={styles.deliveryPointLabel}>Destination client</Text>
                                        <Text style={styles.deliveryPointValue} numberOfLines={2}>
                                            {deliveryLocationLabel}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.deliveryRequestButton, isRequestingDelivery && styles.disabledButton]}
                                onPress={openDeliveryRequestModal}
                                disabled={isRequestingDelivery}
                            >
                                <Ionicons name="bicycle-outline" size={16} color={Colors.white} />
                                <Text style={styles.deliveryRequestButtonText}>
                                    {isRequestingDelivery ? 'Demande en cours...' : 'Commander une livraison'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.deliveryLockedState}>
                            <Ionicons
                                name={isSeller ? 'lock-closed-outline' : 'time-outline'}
                                size={18}
                                color={Colors.gray500}
                            />
                            <Text style={styles.mutedText}>
                                {isSeller
                                    ? 'Confirmez la commande pour demander une livraison.'
                                    : 'Le suivi de livraison apparaitra ici une fois la demande lancee par le vendeur.'}
                            </Text>
                        </View>
                    )}

                    {!deliveryId ? (
                        <View style={styles.deliveryManualLinkWrap}>
                            <TouchableOpacity
                                style={styles.deliveryManualLink}
                                onPress={() => setShowDeliveryIdInput((prev) => !prev)}
                            >
                                <Text style={styles.deliveryManualLinkText}>
                                    {showDeliveryIdInput ? 'Masquer l ID manuel' : 'J ai deja un ID de livraison'}
                                </Text>
                                <Ionicons
                                    name={showDeliveryIdInput ? 'chevron-up-outline' : 'chevron-down-outline'}
                                    size={16}
                                    color={Colors.primary}
                                />
                            </TouchableOpacity>
                            {showDeliveryIdInput ? (
                                <View style={styles.deliveryManualBox}>
                                    <Text style={styles.fieldLabel}>ID de livraison</Text>
                                    <TextInput
                                        value={deliveryIdInput}
                                        onChangeText={setDeliveryIdInput}
                                        placeholder="Collez l ID recu par notification"
                                        style={styles.fieldInput}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.deliveryTrackButton,
                                            !deliveryIdInput.trim() && styles.disabledButton,
                                        ]}
                                        onPress={onOpenDeliveryById}
                                        disabled={!deliveryIdInput.trim()}
                                    >
                                        <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                        <Text style={styles.deliveryTrackButtonText}>Ouvrir le suivi</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                    </View>
                ) : null}

                {isBuyer && !isSeller ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Suivi client</Text>
                        <Text style={styles.mutedText}>
                            Le vendeur met a jour le statut de votre commande. Vous recevrez les changements ici.
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

            {showSellerActionsDock ? (
                <View style={[styles.sellerActionsDockWrap, { paddingBottom: sellerDockBottomInset }]}>
                    <View style={styles.sellerActionsDock}>
                        <View style={styles.sellerActionsDockHeader}>
                            <Text style={styles.sellerActionsDockTitle}>Actions vendeur</Text>
                            {isUpdatingStatus || isRequestingDelivery ? (
                                <Text style={styles.sellerActionsDockMeta}>
                                    {isUpdatingStatus ? 'Mise a jour...' : 'Demande livraison...'}
                                </Text>
                            ) : null}
                        </View>
                        <Text style={styles.sellerActionsDockHint}>
                            {canRequestDeliveryNow
                                ? 'Commande acceptee. Etape suivante: commander une livraison.'
                                : canTrackDeliveryNow
                                    ? 'Livraison creee. Suivez son avancement.'
                                    : 'Choisissez la prochaine etape de la commande.'}
                        </Text>
                        {hasSellerStatusActions ? (
                            <View style={styles.actionsRow}>
                                {nextStatuses.map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusActionButton,
                                            styles.sellerActionsDockButton,
                                            status === 'cancelled'
                                                ? styles.statusActionCancelButton
                                                : styles.statusActionPrimaryButton,
                                            isUpdatingStatus && styles.disabledButton,
                                        ]}
                                        onPress={() => changeStatus(status)}
                                        disabled={isUpdatingStatus}
                                    >
                                        <View style={styles.statusActionContent}>
                                            <Ionicons
                                                name={STATUS_ACTION_ICONS[status]}
                                                size={14}
                                                color={Colors.white}
                                            />
                                            <Text
                                                style={[
                                                    styles.statusActionText,
                                                    status === 'cancelled'
                                                        ? styles.statusActionCancelText
                                                        : styles.statusActionPrimaryText,
                                                ]}
                                            >
                                                {STATUS_ACTION_LABELS[status]}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : canRequestDeliveryNow ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.deliveryRequestButton, styles.sellerDockPrimaryButton]}
                                    onPress={openDeliveryRequestModal}
                                    disabled={isRequestingDelivery}
                                >
                                    <Ionicons name="bicycle-outline" size={16} color={Colors.white} />
                                    <Text style={styles.deliveryRequestButtonText}>
                                        {isRequestingDelivery ? 'Demande en cours...' : 'Commander une livraison'}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.sellerDockHelperText}>
                                    Horaire, commentaire et mode de livraison dans le formulaire.
                                </Text>
                            </>
                        ) : canTrackDeliveryNow ? (
                            <TouchableOpacity
                                style={[styles.deliveryTrackButton, styles.sellerDockPrimaryButton]}
                                onPress={() => router.push(resolveDeliveryRoute(deliveryId as string) as any)}
                            >
                                <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                <Text style={styles.deliveryTrackButtonText}>Suivre la livraison</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.sellerActionsDockEmptyText}>
                                Cette commande est finalisee. Aucun changement possible.
                            </Text>
                        )}
                    </View>
                </View>
            ) : null}

            <Modal
                visible={profileModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <View style={[styles.modalBackdrop, { paddingBottom: modalBottomPadding }]}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalEyebrow}>Profil public</Text>
                                <Text style={styles.modalTitle}>{primaryParty?.label || 'Interlocuteur'}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setProfileModalVisible(false)}
                            >
                                <Ionicons name="close" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileHero}>
                            <View style={styles.profileAvatar}>
                                <Ionicons
                                    name={primaryParty?.icon || 'person-outline'}
                                    size={28}
                                    color={Colors.white}
                                />
                            </View>
                            <View style={styles.profileHeroCopy}>
                                <Text style={styles.profileName}>{primaryParty?.name || 'Profil indisponible'}</Text>
                                <Text style={styles.profileSubtitle}>{primaryPartyContact}</Text>
                            </View>
                        </View>

                        <View style={styles.profileInfoGrid}>
                            <View style={styles.profileInfoRow}>
                                <Ionicons name="shield-checkmark-outline" size={17} color={Colors.primary} />
                                <View style={styles.profileInfoCopy}>
                                    <Text style={styles.profileInfoLabel}>Role dans la commande</Text>
                                    <Text style={styles.profileInfoValue}>
                                        {primaryParty?.label || 'Participant'}
                                    </Text>
                                </View>
                            </View>
                            {primaryParty?.email ? (
                                <View style={styles.profileInfoRow}>
                                    <Ionicons name="mail-outline" size={17} color={Colors.primary} />
                                    <View style={styles.profileInfoCopy}>
                                        <Text style={styles.profileInfoLabel}>Email</Text>
                                        <Text style={styles.profileInfoValue}>{primaryParty.email}</Text>
                                    </View>
                                </View>
                            ) : null}
                            {primaryParty?.phone ? (
                                <View style={styles.profileInfoRow}>
                                    <Ionicons name="call-outline" size={17} color={Colors.primary} />
                                    <View style={styles.profileInfoCopy}>
                                        <Text style={styles.profileInfoLabel}>Telephone</Text>
                                        <Text style={styles.profileInfoValue}>{primaryParty.phone}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        {primaryPartyPhone ? (
                            <TouchableOpacity
                                style={styles.modalPrimaryButton}
                                onPress={() => void callParty(primaryPartyPhone, primaryPartyCallLabel)}
                            >
                                <Ionicons name="call-outline" size={16} color={Colors.white} />
                                <Text style={styles.modalPrimaryButtonText}>Appeler</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={routeModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setRouteModalVisible(false)}
            >
                <View style={[styles.modalBackdrop, { paddingBottom: modalBottomPadding }]}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalEyebrow}>Livraison</Text>
                                <Text style={styles.modalTitle}>Trajet prevu</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setRouteModalVisible(false)}
                            >
                                <Ionicons name="close" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.routeMapCard}>
                            <View style={styles.routeMapGridLine} />
                            <View style={[styles.routeMapLine, styles.routeMapLineFirst]} />
                            <View style={[styles.routeMapLine, styles.routeMapLineSecond]} />
                            <View style={[styles.routeMapPin, styles.routeMapPinStart]}>
                                <Ionicons name="storefront-outline" size={15} color={Colors.white} />
                            </View>
                            <View style={[styles.routeMapPin, styles.routeMapPinEnd]}>
                                <Ionicons name="location-outline" size={15} color={Colors.white} />
                            </View>
                        </View>

                        <View style={styles.routeSteps}>
                            <View style={styles.routeStep}>
                                <View style={styles.routeStepMarker} />
                                <View style={styles.routeStepCopy}>
                                    <Text style={styles.routeStepLabel}>Retrait vendeur</Text>
                                    <Text style={styles.routeStepValue}>{pickupLocationLabel}</Text>
                                </View>
                            </View>
                            <View style={styles.routeStepConnector} />
                            <View style={styles.routeStep}>
                                <View style={[styles.routeStepMarker, styles.routeStepMarkerEnd]} />
                                <View style={styles.routeStepCopy}>
                                    <Text style={styles.routeStepLabel}>Destination client</Text>
                                    <Text style={styles.routeStepValue}>{deliveryLocationLabel}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={itemsModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setItemsModalVisible(false)}
            >
                <View style={[styles.modalBackdrop, { paddingBottom: modalBottomPadding }]}>
                    <View style={[styles.modalSheet, styles.itemsModalSheet]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalEyebrow}>Commande</Text>
                                <Text style={styles.modalTitle}>Articles commandes</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setItemsModalVisible(false)}
                            >
                                <Ionicons name="close" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {order.items.map((item, index) => {
                                const image = getOrderItemImage(item);
                                const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                                const product = getOrderItemProduct(item);
                                const stock = typeof product?.quantity === 'number' ? product.quantity : undefined;

                                return (
                                    <View key={`${order._id}-modal-line-${index}`} style={styles.modalItemRow}>
                                        <View style={styles.itemImageWrap}>
                                            {image ? (
                                                <Image source={{ uri: image }} style={styles.itemImage} />
                                            ) : (
                                                <View style={styles.itemImagePlaceholder}>
                                                    <Ionicons
                                                        name="image-outline"
                                                        size={18}
                                                        color={Colors.gray400}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.itemBody}>
                                            <Text style={styles.itemName} numberOfLines={2}>
                                                {getOrderItemName(item)}
                                            </Text>
                                            <Text style={styles.itemMeta}>
                                                {Number(item.quantity) || 0} x{' '}
                                                {formatAmount(item.price, product?.currency || orderCurrency)}
                                            </Text>
                                            {typeof stock === 'number' ? (
                                                <Text style={styles.itemStock}>Stock actuel: {stock}</Text>
                                            ) : null}
                                        </View>
                                        <Text style={styles.itemLineTotal}>
                                            {formatAmount(lineTotal, product?.currency || orderCurrency)}
                                        </Text>
                                    </View>
                                );
                            })}
                            <View style={styles.modalTotalRow}>
                                <Text style={styles.modalTotalLabel}>Total</Text>
                                <Text style={styles.modalTotalValue}>
                                    {formatAmount(order.totalAmount, orderCurrency)}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
                showCancel={alertState.showCancel}
                onCancel={() => {
                    const callback = alertState.onCancel;
                    closeAlert();
                    callback?.();
                }}
                onConfirm={() => {
                    const callback = alertState.onConfirm;
                    closeAlert();
                    callback?.();
                }}
            />
            <RequestDeliveryModal
                visible={deliveryRequestModalVisible}
                values={deliveryRequestForm}
                loading={isRequestingDelivery}
                onChange={setDeliveryRequestForm}
                onClose={() => setDeliveryRequestModalVisible(false)}
                onSubmit={onRequestDelivery}
                onPickPickupOnMap={() => setMapPickerField('pickup')}
                onPickDeliveryOnMap={() => setMapPickerField('delivery')}
            />
            <MapPickerModal
                visible={Boolean(mapPickerField)}
                initialLocation={mapInitialLocation}
                onClose={() => setMapPickerField(null)}
                onConfirm={onMapConfirm}
            />
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
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
    },
    headerBody: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    headerSubTitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        gap: Spacing.md,
    },
    trackingHero: {
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        padding: Spacing.lg,
        overflow: 'hidden',
    },
    trackingHeroTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    trackingHeroIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackingHeroCopy: {
        flex: 1,
        minWidth: 0,
    },
    trackingHeroEyebrow: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    trackingHeroTitle: {
        marginTop: 2,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    trackingHeroText: {
        marginTop: Spacing.xs,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    trackingHeroPercent: {
        color: Colors.primary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    cardTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    mutedText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    fieldLabel: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    fieldInput: {
        marginTop: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.gray50,
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
    },
    valueText: {
        fontSize: Typography.fontSize.base,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    totalText: {
        fontSize: Typography.fontSize.xl,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.extrabold,
    },
    quickCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    quickCard: {
        position: 'relative',
        flexGrow: 1,
        flexBasis: 150,
        minWidth: 145,
        minHeight: 96,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    quickCardFeatured: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...Shadows.md,
    },
    quickCardIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + '22',
        borderWidth: 1,
        borderColor: Colors.white + '28',
    },
    quickCardIconSoft: {
        backgroundColor: Colors.primary + '10',
        borderColor: Colors.primary + '16',
    },
    quickCardBody: {
        flex: 1,
        minWidth: 0,
    },
    quickCardEyebrow: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    quickCardTitle: {
        marginTop: 3,
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    quickCardText: {
        marginTop: 3,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        lineHeight: 18,
    },
    quickCardFeaturedEyebrow: {
        color: Colors.accent,
    },
    quickCardFeaturedTitle: {
        color: Colors.white,
    },
    quickCardFeaturedText: {
        color: Colors.white + 'D9',
    },
    quickItemThumb: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
        borderWidth: 1,
        borderColor: Colors.primary + '14',
    },
    quickItemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    quickCardChevron: {
        marginLeft: 'auto',
        flexShrink: 0,
    },
    partyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
        gap: Spacing.sm,
    },
    partyIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    partyTextWrap: {
        flex: 1,
    },
    partyLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    partyValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    partyCallButton: {
        minHeight: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '28',
        backgroundColor: Colors.primary + '08',
        paddingHorizontal: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    partyCallText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    addressText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray700,
        lineHeight: 20,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    itemImageWrap: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        backgroundColor: Colors.gray100,
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemImagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemBody: {
        flex: 1,
    },
    itemName: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.semibold,
    },
    itemMeta: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
    },
    itemStock: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    itemLineTotal: {
        fontSize: Typography.fontSize.sm,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.bold,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(17, 24, 39, 0.44)',
        padding: Spacing.lg,
    },
    modalSheet: {
        maxHeight: '86%',
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        ...Shadows.lg,
    },
    itemsModalSheet: {
        minHeight: 360,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    modalEyebrow: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalTitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xl,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '0D',
    },
    profileHero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary,
        padding: Spacing.md,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + '20',
        borderWidth: 1,
        borderColor: Colors.white + '28',
    },
    profileHeroCopy: {
        flex: 1,
        minWidth: 0,
    },
    profileName: {
        fontSize: Typography.fontSize.lg,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
    },
    profileSubtitle: {
        marginTop: 3,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'CC',
    },
    profileInfoGrid: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    profileInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    profileInfoCopy: {
        flex: 1,
        minWidth: 0,
    },
    profileInfoLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    profileInfoValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    modalPrimaryButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        minHeight: 46,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    modalPrimaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    routeMapCard: {
        height: 168,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        backgroundColor: Colors.primary + '08',
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        marginBottom: Spacing.md,
    },
    routeMapGridLine: {
        position: 'absolute',
        left: -24,
        right: -24,
        top: 78,
        height: 1,
        backgroundColor: Colors.primary + '10',
        transform: [{ rotate: '-18deg' }],
    },
    routeMapLine: {
        position: 'absolute',
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
    },
    routeMapLineFirst: {
        left: 58,
        top: 52,
        width: 118,
        transform: [{ rotate: '18deg' }],
    },
    routeMapLineSecond: {
        right: 62,
        top: 102,
        width: 122,
        transform: [{ rotate: '-24deg' }],
    },
    routeMapPin: {
        position: 'absolute',
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderWidth: 4,
        borderColor: Colors.white,
        ...Shadows.sm,
    },
    routeMapPinStart: {
        left: 36,
        top: 34,
    },
    routeMapPinEnd: {
        right: 36,
        bottom: 30,
        backgroundColor: Colors.accentDark,
    },
    routeSteps: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
    },
    routeStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    routeStepMarker: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 3,
        backgroundColor: Colors.primary,
        borderWidth: 3,
        borderColor: Colors.white,
    },
    routeStepMarkerEnd: {
        backgroundColor: Colors.accentDark,
    },
    routeStepConnector: {
        width: 2,
        height: 24,
        marginLeft: 6,
        backgroundColor: Colors.primary + '20',
    },
    routeStepCopy: {
        flex: 1,
        minWidth: 0,
    },
    routeStepLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    routeStepValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    modalScroll: {
        maxHeight: 440,
    },
    modalScrollContent: {
        paddingBottom: Spacing.sm,
    },
    modalItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    modalTotalRow: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '0D',
        padding: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTotalLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    modalTotalValue: {
        fontSize: Typography.fontSize.lg,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.extrabold,
    },
    deliveryPanel: {
        borderColor: Colors.primary + '24',
    },
    deliveryPanelHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    deliveryPanelIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deliveryPanelTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    deliveryPanelHint: {
        marginTop: -Spacing.xs / 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
    },
    deliveryStatusPill: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        maxWidth: 128,
    },
    deliveryStatusPillText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },
    deliveryRoutePreview: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
    },
    deliveryPoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    deliveryPointIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
    },
    deliveryPointCopy: {
        flex: 1,
        minWidth: 0,
    },
    deliveryPointLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.semibold,
    },
    deliveryPointValue: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    deliveryRouteDivider: {
        width: 1,
        height: 18,
        backgroundColor: Colors.primary + '20',
        marginLeft: 15,
        marginVertical: 4,
    },
    deliveryLockedState: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
    },
    deliveryManualLinkWrap: {
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingTop: Spacing.sm,
    },
    deliveryManualLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    deliveryManualLinkText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    deliveryManualBox: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray50,
        padding: Spacing.md,
    },
    deliveryRequestButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        gap: Spacing.xs,
        minHeight: 44,
        ...Shadows.sm,
    },
    deliveryRequestButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    deliveryTrackButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        gap: Spacing.xs,
        minHeight: 44,
        ...Shadows.sm,
    },
    deliveryTrackButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        alignItems: 'stretch',
    },
    statusActionButton: {
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        minHeight: 44,
        justifyContent: 'center',
    },
    statusActionPrimaryButton: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    statusActionCancelButton: {
        borderColor: Colors.error,
        backgroundColor: Colors.error,
    },
    statusActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs / 2,
    },
    statusActionText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    statusActionPrimaryText: {
        color: Colors.white,
    },
    statusActionCancelText: {
        color: Colors.white,
    },
    disabledButton: {
        opacity: 0.65,
    },
    sellerActionsDockWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        backgroundColor: Colors.backgroundSecondary,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    sellerActionsDock: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
        ...Shadows.md,
    },
    sellerActionsDockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    sellerActionsDockTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    sellerActionsDockMeta: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray500,
    },
    sellerActionsDockHint: {
        marginBottom: Spacing.sm,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
    },
    sellerActionsDockEmptyText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    sellerActionsDockButton: {
        flexBasis: '48%',
        flexGrow: 1,
        alignItems: 'center',
    },
    sellerDockPrimaryButton: {
        marginTop: 0,
        width: '100%',
    },
    sellerDockHelperText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    emptyTitle: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    backGhostButton: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.white,
    },
    backGhostButtonText: {
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
});
