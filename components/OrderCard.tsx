/**
 * Carte de commande (achat ou vente)
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetCurrenciesQuery } from '@/store/api/currenciesApi';
import {
    Order,
    getOrderItemCurrency,
    getOrderItemImage,
    getOrderItemName,
    getOrderPartyName,
} from '@/types/order';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OrderProgressTimeline, getOrderProgressMeta } from './orders/OrderProgressTimeline';
import { StatusBadge } from './ui/StatusBadge';

interface OrderCardProps {
    order: Order;
    perspective: 'buyer' | 'seller';
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getOrderCurrency = (order: Order) => {
    for (const item of order.items || []) {
        const currency = getOrderItemCurrency(item);
        if (currency) {
            return currency;
        }
    }
    const orderAsRecord = order as Record<string, any>;
    if (orderAsRecord?.currency) return orderAsRecord.currency;
    if (orderAsRecord?.totalCurrency) return orderAsRecord.totalCurrency;
    return undefined;
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, perspective }) => {
    const router = useRouter();
    const { data: currencies = [] } = useGetCurrenciesQuery();
    const orderCurrency = getOrderCurrency(order);
    const actionLabel = perspective === 'seller' ? 'Gerer' : 'Voir details';
    const progressMeta = getOrderProgressMeta(order.status);
    const firstItems = order.items.slice(0, 3);
    const firstImage = getOrderItemImage(order.items[0]);
    const deliveryLabel = order.deliveryAddress?.trim() || 'Adresse de livraison a confirmer';
    const counterpartyLabel =
        perspective === 'seller'
            ? `Client: ${getOrderPartyName(order.userId, 'Client inconnu')}`
            : `Boutique: ${getOrderPartyName(order.sellerId, 'Vendeur inconnu')}`;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() =>
                router.push({
                    pathname: '/order/[id]',
                    params: {
                        id: order._id,
                        view: perspective === 'seller' ? 'sales' : 'purchases',
                    },
                })
            }
            activeOpacity={0.9}
        >
            <View style={styles.header}>
                <View style={[styles.statusIcon, { backgroundColor: progressMeta.accentBackground }]}>
                    <Ionicons
                        name={order.status === 'delivered' ? 'checkmark-done-outline' : 'navigate-outline'}
                        size={18}
                        color={progressMeta.color}
                    />
                </View>
                <View style={styles.headerLeft}>
                    <Text style={styles.orderNumber}>#{order._id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.statusHeadline}>{progressMeta.headline}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status} />
            </View>

            <View style={styles.timelinePanel}>
                <View style={styles.trackingCopyRow}>
                    <Text style={styles.trackingHint}>{progressMeta.helper}</Text>
                    <Text style={styles.trackingPercent}>{progressMeta.progressPercent}%</Text>
                </View>
                <OrderProgressTimeline status={order.status} />
            </View>

            <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={15} color={Colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{deliveryLabel}</Text>
            </View>

            <View style={styles.itemsPanel}>
                <View style={styles.itemThumb}>
                    {firstImage ? (
                        <Image source={{ uri: firstImage }} style={styles.itemThumbImage} />
                    ) : (
                        <Ionicons name="cube-outline" size={22} color={Colors.gray400} />
                    )}
                </View>
                <View style={styles.itemsBody}>
                    <Text style={styles.counterpartyText}>{counterpartyLabel}</Text>
                    <Text style={styles.itemsText}>
                        {order.items.length} article{order.items.length > 1 ? 's' : ''}
                    </Text>
                    {firstItems.map((item, index) => (
                        <Text key={`${order._id}-item-${index}`} style={styles.itemName} numberOfLines={1}>
                            {getOrderItemName(item)}
                        </Text>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>
                        {formatCurrencyAmount(order.totalAmount, orderCurrency, { currencies })}
                    </Text>
                </View>
                <View style={styles.actionPill}>
                    <Text style={styles.actionPillText}>{actionLabel}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    statusIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLeft: {
        flex: 1,
        minWidth: 0,
    },
    orderNumber: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        letterSpacing: 0.4,
    },
    statusHeadline: {
        marginTop: 2,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    date: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    timelinePanel: {
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    trackingCopyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    trackingHint: {
        flex: 1,
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    trackingPercent: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    routeText: {
        flex: 1,
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    counterpartyText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    itemsPanel: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    itemThumb: {
        width: 58,
        height: 58,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    itemThumbImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemsBody: {
        flex: 1,
        minWidth: 0,
    },
    itemsText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray500,
    },
    itemName: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.sm,
    },
    totalLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    totalAmount: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs / 2,
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        ...Shadows.sm,
    },
    actionPillText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
});
