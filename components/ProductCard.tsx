/**
 * Composant ProductCard - Carte produit inspirée des designs
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Announcement } from '@/types/announcement';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProductCardProps {
    product: Announcement;
    onAddToCart?: (product: Announcement) => void;
    onToggleWishlist?: (product: Announcement) => void;
    isInWishlist?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onAddToCart,
    onToggleWishlist,
    isInWishlist = false,
}) => {
    const router = useRouter();

    // Use price as default, no originalPrice field exists on Announcement yet for simple discount calculation
    // but schema has priceRange, etc. Adjusting to display basic price for now.
    const hasDiscount = false;

    const imageUrl = (product.images && product.images.length > 0)
        ? product.images[0]
        : 'https://via.placeholder.com/150';

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({
                pathname: '/(tabs)/product/[id]',
                params: { id: product._id }
            })}
            activeOpacity={0.9}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Badge de stock (using quantity instead of stock) */}
                {product.quantity !== undefined && product.quantity === 0 && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Rupture de stock</Text>
                    </View>
                )}

                {onToggleWishlist && (
                    <TouchableOpacity
                        style={styles.wishlistButton}
                        onPress={() => onToggleWishlist(product)}
                    >
                        <Ionicons
                            name={isInWishlist ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isInWishlist ? Colors.error : Colors.white}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Informations */}
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={2}>
                    {product.name}
                </Text>

                {/* Rating - Defaulting to 0/0 because Announcement schema doesn't have rating fields yet explicitly in TS interface given */}
                <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color={Colors.accent} />
                    <Text style={styles.rating}>0.0</Text>
                    <Text style={styles.reviews}>(0)</Text>
                </View>

                {/* Prix */}
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>{product.price ? product.price.toFixed(2) : 'N/A'} €</Text>
                </View>

                {/* Bouton ajout au panier */}
                {onAddToCart && (product.quantity === undefined || product.quantity > 0) && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => onAddToCart(product)}
                    >
                        <Ionicons name="cart" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
        marginBottom: Spacing.lg,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        backgroundColor: Colors.gray50,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: Spacing.md,
        left: Spacing.md,
        backgroundColor: Colors.error,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
        ...Shadows.sm,
    },
    discountText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    wishlistButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    outOfStockBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    outOfStockText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    content: {
        padding: Spacing.lg,
        minHeight: 120,
    },
    name: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginBottom: Spacing.sm,
        lineHeight: Typography.fontSize.md * 1.4,
        maxHeight: 40, // Limit height for consistency
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    rating: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
        marginLeft: Spacing.xs,
    },
    reviews: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        marginLeft: Spacing.xs,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    price: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    originalPrice: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray400,
        textDecorationLine: 'line-through',
        marginLeft: Spacing.sm,
    },
    addButton: {
        position: 'absolute',
        bottom: Spacing.lg,
        right: Spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
});
