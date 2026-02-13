import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetOrderQuery, useUpdateOrderStatusMutation } from '@/store/api/ordersApi';
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
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_ACTION_LABELS: Record<OrderStatusValue, string> = {
    pending: 'Mettre en attente',
    confirmed: 'Confirmer',
    shipped: 'Marquer expediee',
    delivered: 'Marquer livree',
    cancelled: 'Annuler la commande',
};

const formatAmount = (value?: number) => `${Number(value || 0).toFixed(2)} EUR`;

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
    const { data: order, isLoading, refetch } = useGetOrderQuery(id || '', { skip: !id });

    const currentUserId = user?._id || '';
    const buyerId = getOrderPartyId(order?.userId);
    const sellerId = getOrderPartyId(order?.sellerId);
    const isSeller = Boolean(currentUserId && sellerId === currentUserId);
    const isBuyer = Boolean(currentUserId && buyerId === currentUserId);

    const nextStatuses = React.useMemo(
        () => (order && isSeller ? getNextSellerStatuses(order.status) : []),
        [isSeller, order],
    );

    const changeStatus = async (nextStatus: OrderStatusValue) => {
        if (!order?._id) return;

        Alert.alert(
            'Confirmer le changement',
            `Voulez-vous passer la commande au statut "${STATUS_ACTION_LABELS[nextStatus]}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: async () => {
                        try {
                            await updateOrderStatus({ id: order._id, status: nextStatus }).unwrap();
                            await refetch();
                        } catch (error: any) {
                            const apiMessage =
                                (Array.isArray(error?.data?.message) && error.data.message[0]) ||
                                error?.data?.message ||
                                error?.data?.error ||
                                error?.message ||
                                'Impossible de mettre a jour le statut.';
                            Alert.alert('Erreur', String(apiMessage));
                        }
                    },
                },
            ],
        );
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
                        <Text style={styles.totalText}>{formatAmount(order.totalAmount)}</Text>
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
                                        {Number(item.quantity) || 0} x {formatAmount(item.price)}
                                    </Text>
                                    {typeof stock === 'number' ? (
                                        <Text style={styles.itemStock}>Stock actuel: {stock}</Text>
                                    ) : null}
                                </View>
                                <Text style={styles.itemLineTotal}>{formatAmount(lineTotal)}</Text>
                            </View>
                        );
                    })}
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

