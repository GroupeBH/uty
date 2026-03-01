/**
 * Composant CartItem — item du panier avec controles de quantite.
 * Design premium avec image agrandie, badges visuels et meilleur contraste.
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Announcement } from '@/types/announcement';
import { CartProduct as CartItemType } from '@/types/cart';
import { formatCurrencyAmount, resolveCurrencyDisplay } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    const productImage = product.images?.length ? product.images[0] : 'https://via.placeholder.com/96';
    const productStock = typeof product.quantity === 'number' ? product.quantity : undefined;
    const disableIncrement = productStock !== undefined && item.quantity >= productStock;
    const lineTotal = productPrice * item.quantity;
    const resolvedCurrencySymbol = currencySymbol || resolveCurrencyDisplay(product.currency);

    const stockRemaining = productStock !== undefined ? productStock - item.quantity : undefined;
    const showStockWarning = stockRemaining !== undefined && stockRemaining >= 0 && stockRemaining < 10;

    return (
        <View style={styles.container}>
            {/* Product Image with overlay */}
            <View style={styles.imageWrap}>
                <Image source={{ uri: productImage }} style={styles.image} resizeMode="cover" />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)']}
                    style={styles.imageOverlay}
                />
                <View style={styles.qtyOverlay}>
                    <Text style={styles.qtyOverlayText}>x{item.quantity}</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Header Row */}
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={2}>
                        {productName}
                    </Text>
                    <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeButton}>
                        <Ionicons name="close" size={14} color={Colors.error} />
                    </TouchableOpacity>
                </View>

                {/* Price Row */}
                <View style={styles.priceRow}>
                    <Text style={styles.unitPrice}>
                        {formatCurrencyAmount(productPrice, resolvedCurrencySymbol)} /u
                    </Text>
                    <Text style={styles.lineTotal}>
                        {formatCurrencyAmount(lineTotal, resolvedCurrencySymbol)}
                    </Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.actionsRow}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                            onPress={() => onDecrement(item)}
                            disabled={item.quantity <= 1}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="remove"
                                size={16}
                                color={item.quantity <= 1 ? Colors.gray300 : Colors.primary}
                            />
                        </TouchableOpacity>

                        <View style={styles.quantityBadge}>
                            <Text style={styles.quantityBadgeText}>{item.quantity}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.quantityButton, styles.quantityButtonAdd, disableIncrement && styles.quantityButtonDisabled]}
                            onPress={() => onIncrement(item)}
                            disabled={disableIncrement}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="add"
                                size={16}
                                color={disableIncrement ? Colors.gray300 : Colors.white}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stock Warning */}
                {showStockWarning && (
                    <View style={styles.stockWarningBadge}>
                        <Ionicons name="alert-circle" size={12} color={Colors.warning} />
                        <Text style={styles.stockWarningText}>
                            {stockRemaining! > 0
                                ? `Plus que ${stockRemaining} en stock`
                                : 'Stock epuise'}
                        </Text>
                    </View>
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
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.md,
    },
    imageWrap: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.gray100,
    },
    imageOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 32,
    },
    qtyOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: Colors.primary + 'E6',
        borderRadius: BorderRadius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    qtyOverlayText: {
        fontSize: 10,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    name: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray800,
        marginRight: Spacing.xs,
        lineHeight: 20,
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '0F',
        borderWidth: 1,
        borderColor: Colors.error + '25',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    unitPrice: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.gray500,
    },
    lineTotal: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accentDark,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 4,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    quantityButtonAdd: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    quantityButtonDisabled: {
        backgroundColor: Colors.gray100,
        borderColor: Colors.gray200,
        opacity: 0.5,
    },
    quantityBadge: {
        minWidth: 36,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
    },
    quantityBadgeText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    stockWarningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.warning + '14',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    stockWarningText: {
        fontSize: 10,
        color: Colors.warning,
        fontWeight: Typography.fontWeight.bold,
    },
});
