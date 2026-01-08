/**
 * Composant Card réutilisable avec design moderne
 */

import { Colors, ComponentTokens, Shadows } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    variant?: 'default' | 'elevated';
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
    variant = 'default',
    noPadding = false,
    style,
    children,
    ...props
}) => {
    return (
        <View
            style={[
                styles.card,
                variant === 'elevated' && styles.elevated,
                noPadding && styles.noPadding,
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: ComponentTokens.card.borderRadius,
        borderWidth: ComponentTokens.card.borderWidth,
        borderColor: Colors.border,
        padding: ComponentTokens.card.padding,
    },
    elevated: {
        ...Shadows.md,
        borderWidth: 0,
    },
    noPadding: {
        padding: 0,
    },
});
