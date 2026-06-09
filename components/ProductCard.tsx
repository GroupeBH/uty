/**
 * Composant ProductCard - Carte produit inspirée des designs
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Announcement } from '@/types/announcement';
import { formatCurrencyAmount } from '@/utils/currency';
import { getAvailableQuantity, isOutOfStockQuantity, requiresSellerContact } from '@/utils/productAvailability';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const imageUrl = (product.images && product.images.length > 0)
        ? product.images[0]
        : 'https://via.placeholder.com/150';
    const availableQuantity = getAvailableQuantity(product.quantity);
    const isOutOfStock = isOutOfStockQuantity(product.quantity);
    const isContactOnly = requiresSellerContact(product);
    const canAddToCart = Boolean(onAddToCart && (availableQuantity === undefined || availableQuantity > 0));

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    return (
        <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push(`/product/${product._id}`)}
            activeOpacity={1}
        >
            <Animated.View
                style={[
                    styles.card,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
            {/* Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
                
                {/* Gradient overlay pour meilleure lisibilité */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.05)']}
                    style={styles.imageOverlay}
                />

                {/* Badge de stock (using quantity instead of stock) */}
                {isOutOfStock && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Rupture de stock</Text>
                    </View>
                )}

                {onToggleWishlist && (
                    <TouchableOpacity
                        style={styles.wishlistButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(product);
                        }}
                    >
                        <Ionicons
                            name={isInWishlist ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isInWishlist ? Colors.error : Colors.gray600}
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
                    <Text
                        style={styles.price}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                    >
                        {formatCurrencyAmount(product.price, product.currency)}
                    </Text>
                </View>

                {/* Action */}
                {(isContactOnly || canAddToCart) && (
                    <View style={styles.actionRow}>
                        {isContactOnly ? (
                            <TouchableOpacity
                                style={[styles.addButton, styles.contactButton]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    router.push({
                                        pathname: '/product/[id]',
                                        params: { id: product._id, contact: '1' },
                                    } as any);
                                }}
                            >
                                <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.white} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onAddToCart?.(product);
                                }}
                            >
                                <Ionicons name="add" size={22} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
            </Animated.View>
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
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    outOfStockBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.error,
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
        marginBottom: Spacing.xs,
        minHeight: 34,
    },
    price: {
        flex: 1,
        minWidth: 0,
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
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        minHeight: 44,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    contactButton: {
        backgroundColor: Colors.accent,
    },
});
