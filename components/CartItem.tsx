/**
 * Composant CartItem - Item du panier avec incrémentation/décrémentation
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
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
}

export const CartItem: React.FC<CartItemProps> = ({
    item,
    onIncrement,
    onDecrement,
    onRemove,
}) => {
    // Helper to get product details regardless of population status
    // In real app, we should ensure cart is populated or fetch details if missing.
    // Here we assume populated for UI.
    const product = (typeof item.productId === 'object' ? item.productId : {}) as Announcement;
    const productName = product.name || 'Produit indisponible';
    const productPrice = product.price || 0;
    const productImage = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/80';
    const productStock = product.quantity || 0; // quantity is stock in Announcement

    return (
        <View style={styles.container}>
            {/* Image */}
            <Image
                source={{ uri: productImage }}
                style={styles.image}
                resizeMode="cover"
            />

            {/* Informations */}
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={2}>
                        {productName}
                    </Text>
                    <TouchableOpacity onPress={() => onRemove(item)} style={styles.removeButton}>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.price}>{productPrice.toFixed(2)} €</Text>

                {/* Contrôles de quantité */}
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={[styles.quantityButton, item.quantity === 1 && styles.quantityButtonDisabled]}
                        onPress={() => onDecrement(item)}
                        disabled={item.quantity === 1}
                    >
                        <Ionicons
                            name="remove"
                            size={16}
                            color={item.quantity === 1 ? Colors.gray300 : Colors.primary}
                        />
                    </TouchableOpacity>

                    <Text style={styles.quantity}>{item.quantity}</Text>

                    <TouchableOpacity
                        style={[
                            styles.quantityButton,
                            item.quantity >= productStock && styles.quantityButtonDisabled,
                        ]}
                        onPress={() => onIncrement(item)}
                        disabled={item.quantity >= productStock}
                    >
                        <Ionicons
                            name="add"
                            size={16}
                            color={item.quantity >= productStock ? Colors.gray300 : Colors.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Stock disponible */}
                {productStock < 10 && productStock > 0 && (
                    <Text style={styles.stockWarning}>
                        Plus que {productStock} en stock
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
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.sm,
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
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textPrimary,
        marginRight: Spacing.sm,
    },
    removeButton: {
        padding: Spacing.xs,
    },
    price: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonDisabled: {
        backgroundColor: Colors.gray200,
    },
    quantity: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        minWidth: 24,
        textAlign: 'center',
    },
    stockWarning: {
        fontSize: Typography.fontSize.xs,
        color: Colors.warning,
        marginTop: Spacing.xs,
    },
});
