/**
 * Composant SkeletonLoader - Shimmer effect pour le chargement
 */

import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.sm,
    style,
}) => {
    const shimmerAnimation = useRef(new Animated.Value(0)).current;
    const [layoutWidth, setLayoutWidth] = useState(0);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerAnimation, {
                toValue: 1,
                duration: 1200,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnimation]);

    const handleLayout = (event: LayoutChangeEvent) => {
        const measuredWidth = event.nativeEvent.layout.width;
        if (measuredWidth !== layoutWidth) {
            setLayoutWidth(measuredWidth);
        }
    };

    const shimmerTranslateX = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, layoutWidth * 2],
    });

    return (
        <View
            onLayout={handleLayout}
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                },
                style,
            ]}
        >
            {layoutWidth > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.shimmerOverlay,
                        {
                            width: layoutWidth,
                            left: -layoutWidth,
                            transform: [{ translateX: shimmerTranslateX }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0)',
                            'rgba(255, 255, 255, 0.55)',
                            'rgba(255, 255, 255, 0)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shimmerGradient}
                    />
                </Animated.View>
            )}
        </View>
    );
};

// Skeleton pour ProductCard
export const ProductCardSkeleton: React.FC = () => {
    return (
        <View style={styles.productCardSkeleton}>
            <View style={styles.imageSkeletonWrapper}>
                <SkeletonLoader height={200} borderRadius={BorderRadius.lg} style={styles.imageSkeleton} />
                <View style={styles.wishlistSkeleton}>
                    <SkeletonLoader width={28} height={28} borderRadius={BorderRadius.full} />
                </View>
            </View>
            <View style={styles.contentSkeleton}>
                <SkeletonLoader width="85%" height={16} style={styles.textSkeleton} />
                <SkeletonLoader width="60%" height={12} style={styles.textSkeleton} />
                <View style={styles.ratingSkeletonRow}>
                    <SkeletonLoader width={14} height={14} borderRadius={4} />
                    <SkeletonLoader width={30} height={10} />
                    <SkeletonLoader width={24} height={10} />
                </View>
                <View style={styles.priceSkeletonRow}>
                    <SkeletonLoader width={70} height={18} />
                    <SkeletonLoader width={36} height={36} borderRadius={BorderRadius.full} />
                </View>
            </View>
        </View>
    );
};

// Skeleton pour les actions rapides
export const QuickActionSkeleton: React.FC = () => {
    return (
        <View style={styles.actionSkeleton}>
            <SkeletonLoader width={72} height={72} borderRadius={BorderRadius.xl} />
            <SkeletonLoader width={58} height={12} style={{ marginTop: Spacing.xs }} />
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: Colors.gray200,
        overflow: 'hidden',
        position: 'relative',
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    shimmerGradient: {
        flex: 1,
    },
    productCardSkeleton: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
        flex: 1,
        marginBottom: Spacing.lg,
    },
    imageSkeletonWrapper: {
        position: 'relative',
    },
    imageSkeleton: {
        width: '100%',
    },
    contentSkeleton: {
        padding: Spacing.lg,
    },
    textSkeleton: {
        marginBottom: Spacing.sm,
    },
    ratingSkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    priceSkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    wishlistSkeleton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
    },
    actionSkeleton: {
        alignItems: 'center',
        width: 92,
    },
});

