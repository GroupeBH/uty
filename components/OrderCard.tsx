/**
 * Carte de commande (achat ou vente)
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import {
    Order,
    getOrderItemName,
    getOrderItemProduct,
    getOrderPartyName,
} from '@/types/order';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
        const product = getOrderItemProduct(item);
        if (product?.currency) {
            return product.currency;
        }
    }
    return undefined;
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, perspective }) => {
    const router = useRouter();
    const orderCurrency = getOrderCurrency(order);
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
                <View style={styles.headerLeft}>
                    <Text style={styles.orderNumber}>Commande #{order._id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status} />
            </View>

            <Text style={styles.counterpartyText}>{counterpartyLabel}</Text>

            <View style={styles.items}>
                <Text style={styles.itemsText}>
                    {order.items.length} article{order.items.length > 1 ? 's' : ''}
                </Text>
                <View style={styles.itemsPreview}>
                    {order.items.slice(0, 3).map((item, index) => (
                        <Text key={`${order._id}-item-${index}`} style={styles.itemName} numberOfLines={1}>
                            - {getOrderItemName(item)}
                        </Text>
                    ))}
                    {order.items.length > 3 && (
                        <Text style={styles.moreItems}>
                            +{order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>
                        {formatCurrencyAmount(order.totalAmount, orderCurrency)}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    headerLeft: {
        flex: 1,
        paddingRight: Spacing.sm,
    },
    orderNumber: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    date: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    counterpartyText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        marginBottom: Spacing.md,
    },
    items: {
        marginBottom: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.gray100,
    },
    itemsText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    itemsPreview: {
        marginTop: Spacing.xs,
    },
    itemName: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    moreItems: {
        fontSize: Typography.fontSize.xs,
        color: Colors.accentDark,
        fontWeight: Typography.fontWeight.bold,
        marginTop: Spacing.sm,
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
});
