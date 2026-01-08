/**
 * Composant Button réutilisable avec design optimisé
 * Variantes: primary (jaune), secondary (bleu), outline
 */

import { Colors, ComponentTokens, Shadows, Typography } from '@/constants/theme';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    style,
    ...props
}) => {
    const buttonStyle: ViewStyle[] = [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        ...(fullWidth ? [styles.fullWidth] : []),
        ...((disabled || loading) ? [styles.disabled] : []),
        ...(style ? [style as ViewStyle] : []),
    ];

    const textStyle: TextStyle[] = [
        styles.text,
        styles[`text_${variant}`],
        styles[`text_${size}`],
        ...((disabled || loading) ? [styles.textDisabled] : []),
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? Colors.primary : Colors.accent}
                    size="small"
                />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text style={textStyle}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ComponentTokens.button.borderRadius,
        ...Shadows.sm,
    },

    // Variantes
    primary: {
        backgroundColor: Colors.accent,
        borderWidth: 0,
    },
    secondary: {
        backgroundColor: Colors.primary,
        borderWidth: 0,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary,
    },

    // Tailles
    size_sm: {
        height: ComponentTokens.button.height.sm,
        paddingHorizontal: ComponentTokens.button.paddingHorizontal.sm,
    },
    size_md: {
        height: ComponentTokens.button.height.md,
        paddingHorizontal: ComponentTokens.button.paddingHorizontal.md,
    },
    size_lg: {
        height: ComponentTokens.button.height.lg,
        paddingHorizontal: ComponentTokens.button.paddingHorizontal.lg,
    },

    // États
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },

    // Texte
    text: {
        fontWeight: Typography.fontWeight.semibold,
    },
    text_primary: {
        color: Colors.primary,
    },
    text_secondary: {
        color: Colors.white,
    },
    text_outline: {
        color: Colors.primary,
    },
    text_sm: {
        fontSize: Typography.fontSize.sm,
    },
    text_md: {
        fontSize: Typography.fontSize.md,
    },
    text_lg: {
        fontSize: Typography.fontSize.lg,
    },
    textDisabled: {
        opacity: 0.7,
    },
});
