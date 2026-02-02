/**
 * Composant SkeletonLoader - Shimmer effect pour le chargement
 */

import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

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

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Skeleton pour ProductCard
export const ProductCardSkeleton: React.FC = () => {
    return (
        <View style={styles.productCardSkeleton}>
            <SkeletonLoader height={200} borderRadius={BorderRadius.lg} style={styles.imageSkeleton} />
            <View style={styles.contentSkeleton}>
                <SkeletonLoader width="80%" height={16} style={styles.textSkeleton} />
                <SkeletonLoader width="50%" height={14} style={styles.textSkeleton} />
                <SkeletonLoader width="40%" height={20} style={styles.textSkeleton} />
            </View>
        </View>
    );
};

// Skeleton pour les actions rapides
export const QuickActionSkeleton: React.FC = () => {
    return (
        <View style={styles.actionSkeleton}>
            <SkeletonLoader width={64} height={64} borderRadius={BorderRadius.full} />
            <SkeletonLoader width={60} height={12} style={{ marginTop: Spacing.xs }} />
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: Colors.gray200,
    },
    productCardSkeleton: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        flex: 1,
        marginRight: Spacing.md,
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
    actionSkeleton: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: Spacing.xs / 2,
        minWidth: 72,
    },
});

