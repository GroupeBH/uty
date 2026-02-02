/**
 * Composant StatsCard - Carte de statistique animée
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    gradient: readonly [string, string, ...string[]];
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon,
    gradient,
    trend,
    trendValue,
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    const getTrendIcon = () => {
        if (trend === 'up') return 'trending-up';
        if (trend === 'down') return 'trending-down';
        return 'remove';
    };

    const getTrendColor = () => {
        if (trend === 'up') return Colors.success;
        if (trend === 'down') return Colors.error;
        return Colors.gray400;
    };

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <LinearGradient
                colors={gradient as any}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={24} color={Colors.white} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.value}>{value}</Text>
                    {trend && trendValue && (
                        <View style={styles.trendContainer}>
                            <Ionicons
                                name={getTrendIcon()}
                                size={14}
                                color={getTrendColor()}
                            />
                            <Text style={[styles.trendValue, { color: getTrendColor() }]}>
                                {trendValue}
                            </Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        marginHorizontal: Spacing.xs / 2,
        minWidth: 150,
    },
    gradient: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.xs,
        color: Colors.white,
        opacity: 0.9,
        fontWeight: Typography.fontWeight.medium,
        marginBottom: Spacing.xs / 2,
    },
    value: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        marginBottom: Spacing.xs / 2,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendValue: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        marginLeft: Spacing.xs / 2,
    },
});

