import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrderQuery, useRequestDeliveryMutation, useUpdateOrderStatusMutation } from '@/store/api/ordersApi';
import { formatCurrencyAmount } from '@/utils/currency';
import {
    OrderStatusValue,
    getNextSellerStatuses,
    getOrderItemImage,
    getOrderItemName,
    getOrderItemProduct,
    getOrderPartyId,
    getOrderPartyName,
} from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deliveryStorage } from '@/utils/deliveryStorage';

const STATUS_ACTION_LABELS: Record<OrderStatusValue, string> = {
    pending: 'Mettre en attente',
    confirmed: 'Confirmer',
    shipped: 'Expedier',
    delivered: 'Livrer',
    cancelled: 'Annuler la commande',
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

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
    const [requestDelivery, { isLoading: isRequestingDelivery }] = useRequestDeliveryMutation();
    const { data: order, isLoading, refetch } = useGetOrderQuery(id || '', { skip: !id });
    const [deliveryId, setDeliveryId] = React.useState<string | null>(null);
    const [deliveryIdInput, setDeliveryIdInput] = React.useState('');
    const [pickupLocationInput, setPickupLocationInput] = React.useState('');
    const [deliveryLocationInput, setDeliveryLocationInput] = React.useState('');
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
            setDeliveryLocationInput(order.deliveryAddress.trim());
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

    const changeStatus = async (nextStatus: OrderStatusValue) => {
        if (!order?._id) return;

        showAlert({
            title: 'Confirmer le changement',
            message: `Passer la commande au statut "${STATUS_ACTION_LABELS[nextStatus]}" ?`,
            type: 'warning',
            showCancel: true,
            confirmText: 'Confirmer',
            cancelText: 'Annuler',
            onConfirm: () => {
                void (async () => {
                    try {
                        await updateOrderStatus({ id: order._id, status: nextStatus }).unwrap();
                        await refetch();
                        showAlert({
                            title: 'Statut mis a jour',
                            message: 'Le statut de la commande a ete modifie avec succes.',
                            type: 'success',
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
            const payload = {
                pickupLocation: pickupLocationInput.trim() || undefined,
                deliveryLocation: deliveryLocationInput.trim() || undefined,
            };
            const createdDelivery = await requestDelivery({ id: order._id, data: payload }).unwrap();
            const createdDeliveryId = (createdDelivery as any)?._id?.toString?.() || (createdDelivery as any)?._id;

            if (createdDeliveryId) {
                setDeliveryId(String(createdDeliveryId));
                await deliveryStorage.setDeliveryIdForOrder(order._id, String(createdDeliveryId));
            }

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
        await deliveryStorage.setDeliveryIdForOrder(order._id, candidate);
        router.push(resolveDeliveryRoute(candidate) as any);
    };

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

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Resume</Text>
                    <View style={styles.rowBetween}>
                        <Text style={styles.mutedText}>Articles</Text>
                        <Text style={styles.valueText}>{itemCount}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.mutedText}>Total</Text>
                        <Text style={styles.totalText}>{formatAmount(order.totalAmount, orderCurrency)}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Parties</Text>
                    <View style={styles.partyRow}>
                        <View style={styles.partyIconWrap}>
                            <Ionicons name="person-outline" size={16} color={Colors.primary} />
                        </View>
                        <View style={styles.partyTextWrap}>
                            <Text style={styles.partyLabel}>Acheteur</Text>
                            <Text style={styles.partyValue}>{getOrderPartyName(order.userId, 'Client inconnu')}</Text>
                        </View>
                    </View>
                    <View style={styles.partyRow}>
                        <View style={styles.partyIconWrap}>
                            <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                        </View>
                        <View style={styles.partyTextWrap}>
                            <Text style={styles.partyLabel}>Vendeur</Text>
                            <Text style={styles.partyValue}>{getOrderPartyName(order.sellerId, 'Vendeur inconnu')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Adresse de livraison</Text>
                    <Text style={styles.addressText}>
                        {order.deliveryAddress?.trim() || 'Adresse non renseignee'}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Articles commandes</Text>
                    {order.items.map((item, index) => {
                        const image = getOrderItemImage(item);
                        const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                        const product = getOrderItemProduct(item);
                        const stock = typeof product?.quantity === 'number' ? product.quantity : undefined;

                        return (
                            <View key={`${order._id}-line-${index}`} style={styles.itemRow}>
                                <View style={styles.itemImageWrap}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.itemImage} />
                                    ) : (
                                        <View style={styles.itemImagePlaceholder}>
                                            <Ionicons name="image-outline" size={18} color={Colors.gray400} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.itemBody}>
                                    <Text style={styles.itemName} numberOfLines={2}>
                                        {getOrderItemName(item)}
                                    </Text>
                                    <Text style={styles.itemMeta}>
                                        {Number(item.quantity) || 0} x {formatAmount(item.price, product?.currency || orderCurrency)}
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
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Livraison</Text>
                    {deliveryId ? (
                        <>
                            <Text style={styles.mutedText}>
                                Livraison liee a cette commande: #{deliveryId.slice(-8).toUpperCase()}
                            </Text>
                            <TouchableOpacity
                                style={styles.deliveryTrackButton}
                                onPress={() => router.push(resolveDeliveryRoute(deliveryId) as any)}
                            >
                                <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                <Text style={styles.deliveryTrackButtonText}>Suivre la livraison</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {isSeller ? (
                                order.status === 'confirmed' ? (
                                    <>
                                        <Text style={styles.mutedText}>
                                            Cette commande est confirmee. Vous pouvez maintenant demander un livreur.
                                        </Text>
                                        <Text style={styles.fieldLabel}>Lieu de recuperation (optionnel)</Text>
                                        <TextInput
                                            value={pickupLocationInput}
                                            onChangeText={setPickupLocationInput}
                                            placeholder="Adresse ou point de pickup"
                                            style={styles.fieldInput}
                                        />
                                        <Text style={styles.fieldLabel}>Lieu de livraison (optionnel)</Text>
                                        <TextInput
                                            value={deliveryLocationInput}
                                            onChangeText={setDeliveryLocationInput}
                                            placeholder="Adresse de livraison"
                                            style={styles.fieldInput}
                                        />
                                        <TouchableOpacity
                                            style={[styles.deliveryRequestButton, isRequestingDelivery && styles.disabledButton]}
                                            onPress={onRequestDelivery}
                                            disabled={isRequestingDelivery}
                                        >
                                            <Text style={styles.deliveryRequestButtonText}>
                                                {isRequestingDelivery ? 'Demande en cours...' : 'Commander une livraison'}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <Text style={styles.mutedText}>
                                        Le vendeur peut demander la livraison uniquement apres confirmation de la commande.
                                    </Text>
                                )
                            ) : (
                                <Text style={styles.mutedText}>
                                    Le suivi de livraison apparaitra ici une fois la demande lancee par le vendeur.
                                </Text>
                            )}
                            <Text style={styles.fieldLabel}>ID de livraison (si recu par notification)</Text>
                            <TextInput
                                value={deliveryIdInput}
                                onChangeText={setDeliveryIdInput}
                                placeholder="Collez l ID de livraison"
                                style={styles.fieldInput}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={[styles.deliveryTrackButton, !deliveryIdInput.trim() && styles.disabledButton]}
                                onPress={onOpenDeliveryById}
                                disabled={!deliveryIdInput.trim()}
                            >
                                <Ionicons name="navigate-outline" size={16} color={Colors.white} />
                                <Text style={styles.deliveryTrackButtonText}>Ouvrir le suivi</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {isSeller ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Actions vendeur</Text>
                        {nextStatuses.length === 0 ? (
                            <Text style={styles.mutedText}>
                                Cette commande est finalisee. Aucun changement possible.
                            </Text>
                        ) : (
                            <View style={styles.actionsRow}>
                                {nextStatuses.map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusActionButton,
                                            status === 'cancelled'
                                                ? styles.statusActionCancelButton
                                                : styles.statusActionPrimaryButton,
                                            isUpdatingStatus && styles.disabledButton,
                                        ]}
                                        onPress={() => changeStatus(status)}
                                        disabled={isUpdatingStatus}
                                    >
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
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                ) : isBuyer ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Suivi client</Text>
                        <Text style={styles.mutedText}>
                            Le vendeur met a jour le statut de votre commande. Vous recevrez les changements ici.
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

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
        paddingBottom: 100,
        gap: Spacing.md,
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
    deliveryRequestButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    deliveryRequestButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    deliveryTrackButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        gap: Spacing.xs,
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
    },
    statusActionButton: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
    },
    statusActionPrimaryButton: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '12',
    },
    statusActionCancelButton: {
        borderColor: Colors.error,
        backgroundColor: Colors.error + '10',
    },
    statusActionText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    statusActionPrimaryText: {
        color: Colors.primary,
    },
    statusActionCancelText: {
        color: Colors.error,
    },
    disabledButton: {
        opacity: 0.65,
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
