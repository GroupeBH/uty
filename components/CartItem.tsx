/**
 * Composant CartItem - item du panier avec controles de quantite.
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Announcement } from '@/types/announcement';
import { CartProduct as CartItemType } from '@/types/cart';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CartItemProps {
    item: CartItemType;
    onIncrement: (item: CartItemType) => void;
    onDecrement: (item: CartItemType) => void;
    onRemove: (item: CartItemType) => void;
    currencySymbol?: string;
}

export const CartItem: React.FC<CartItemProps> = ({
    item,
    onIncrement,
    onDecrement,
    onRemove,
    currencySymbol,
}) => {
    const product = (typeof item.productId === 'object' ? item.productId : {}) as Announcement;
    const productName = product.name || 'Produit indisponible';
    const productPrice = product.price || 0;
    const productImage = product.images?.length ? product.images[0] : 'https://via.placeholder.com/80';
    const productStock = typeof product.quantity === 'number' ? product.quantity : undefined;
    const disableIncrement = productStock !== undefined && item.quantity >= productStock;
    const lineTotal = productPrice * item.quantity;

    const resolveCurrency = (currency: any) => {
        if (!currency) return 'EUR';
        if (typeof currency === 'string') return currency;
        if (typeof currency === 'object') return currency.symbol || currency.code || 'EUR';
        return 'EUR';
    };

    const resolvedCurrencySymbol = currencySymbol || resolveCurrency(product.currency);

    return (
        <View style={styles.container}>
            <Image source={{ uri: productImage }} style={styles.image} resizeMode="cover" />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={2}>
                        {productName}
                    </Text>
                    <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeButton}>
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.priceRow}>
                    <Text style={styles.price}>{productPrice.toFixed(2)} {resolvedCurrencySymbol}</Text>
                    <Text style={styles.lineTotal}>{lineTotal.toFixed(2)} {resolvedCurrencySymbol}</Text>
                </View>

                <View style={styles.actionsRow}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                            onPress={() => onDecrement(item)}
                            disabled={item.quantity <= 1}
                        >
                            <Ionicons
                                name="remove"
                                size={16}
                                color={item.quantity <= 1 ? Colors.gray300 : Colors.primary}
                            />
                        </TouchableOpacity>

                        <Text style={styles.quantity}>{item.quantity}</Text>

                        <TouchableOpacity
                            style={[styles.quantityButton, disableIncrement && styles.quantityButtonDisabled]}
                            onPress={() => onIncrement(item)}
                            disabled={disableIncrement}
                        >
                            <Ionicons
                                name="add"
                                size={16}
                                color={disableIncrement ? Colors.gray300 : Colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.quantityBadge}>
                        <Text style={styles.quantityBadgeText}>x{item.quantity}</Text>
                    </View>
                </View>

                {productStock !== undefined && productStock > 0 && productStock - item.quantity < 10 && (
                    <Text style={styles.stockWarning}>
                        {productStock - item.quantity > 0
                            ? `Plus que ${productStock - item.quantity} dispo`
                            : 'Quantite maximale atteinte'}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    image: {
        width: 84,
        height: 84,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray100,
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    name: {
        flex: 1,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginRight: Spacing.sm,
    },
    removeButton: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '12',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    price: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    lineTotal: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accentDark,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quantityButtonDisabled: {
        backgroundColor: Colors.gray100,
        borderColor: Colors.gray200,
    },
    quantity: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        minWidth: 24,
        textAlign: 'center',
    },
    quantityBadge: {
        backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    quantityBadgeText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
    },
    stockWarning: {
        fontSize: Typography.fontSize.xs,
        color: Colors.warning,
        marginTop: Spacing.xs,
    },
});
