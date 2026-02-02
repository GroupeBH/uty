/**
 * Composant CategoryCard - Carte catégorie avec icône
 */

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface CategoryCardProps {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    gradient: readonly [string, string, ...string[]];
    count?: number;
    onPress?: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
    name,
    icon,
    gradient,
    count,
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={gradient as any}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Ionicons name={icon} size={28} color={Colors.white} />
                {count !== undefined && count > 0 && (
                    <Text style={styles.count}>{count}</Text>
                )}
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        width: 85,
        marginRight: Spacing.md,
    },
    gradient: {
        width: 72,
        height: 72,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
        marginBottom: Spacing.sm,
        position: 'relative',
    },
    count: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.error,
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        minWidth: 20,
        textAlign: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    name: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
});

