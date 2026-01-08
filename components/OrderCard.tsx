/**
 * Composant OrderCard - Carte de commande
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Order } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBadge } from './ui/StatusBadge';

interface OrderCardProps {
    order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const router = useRouter();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({
                pathname: '/(client)/order/[id]',
                params: { id: order.id }
            })}
            activeOpacity={0.9}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status} />
            </View>

            {/* Items */}
            <View style={styles.items}>
                <Text style={styles.itemsText}>
                    {order.items.length} article{order.items.length > 1 ? 's' : ''}
                </Text>
                <View style={styles.itemsPreview}>
                    {order.items.slice(0, 3).map((item, index) => (
                        <Text key={index} style={styles.itemName} numberOfLines={1}>
                            • {item.product.name}
                        </Text>
                    ))}
                    {order.items.length > 3 && (
                        <Text style={styles.moreItems}>
                            +{order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>{order.total.toFixed(2)} €</Text>
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
        marginBottom: Spacing.lg,
    },
    headerLeft: {
        flex: 1,
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
    },
    totalLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginRight: Spacing.sm,
    },
    totalAmount: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
});
