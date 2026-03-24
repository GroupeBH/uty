/**
 * Composant CategoryCard - Carte catégorie avec icône
 */

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CategoryIcon } from './CategoryIcon';

interface CategoryCardProps {
    name: string;
    icon: unknown;
    gradient: readonly [string, string, ...string[]];
    count?: number;
    onPress?: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
    name,
    icon,
    count,
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                <CategoryIcon
                    icon={icon}
                    size={54}
                    textStyle={styles.iconText}
                    imageStyle={styles.iconImage}
                />
                {count !== undefined && count > 0 && (
                    <Text style={styles.count}>{count}</Text>
                )}
            </View>
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
    iconText: {
        fontSize: 28,
        color: Colors.white,
    },
    iconImage: {
        borderRadius: 0,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
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

