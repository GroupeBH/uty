/**
 * Composant Input réutilisable avec validation et design optimisé
 */

import { Colors, ComponentTokens, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

export type InputType = 'text' | 'phone' | 'password' | 'email';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    type?: InputType;
    icon?: keyof typeof Ionicons.glyphMap;
    required?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    type = 'text',
    icon,
    required = false,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getKeyboardType = () => {
        switch (type) {
            case 'phone':
                return 'phone-pad';
            case 'email':
                return 'email-address';
            default:
                return 'default';
        }
    };

    const isPassword = type === 'password';

    return (
        <View style={styles.container}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                ]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={isFocused ? Colors.accent : Colors.gray400}
                        style={styles.icon}
                    />
                )}

                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={Colors.gray400}
                    keyboardType={getKeyboardType()}
                    secureTextEntry={isPassword && !showPassword}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color={Colors.gray400}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: ComponentTokens.input.height,
        backgroundColor: Colors.white,
        borderRadius: ComponentTokens.input.borderRadius,
        borderWidth: ComponentTokens.input.borderWidth,
        borderColor: Colors.border,
        paddingHorizontal: ComponentTokens.input.paddingHorizontal,
    },
    inputContainerFocused: {
        borderColor: Colors.accent,
        borderWidth: 2,
    },
    inputContainerError: {
        borderColor: Colors.error,
    },
    icon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
        paddingVertical: 0,
    },
    eyeIcon: {
        padding: Spacing.xs,
    },
    error: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        marginTop: Spacing.xs,
    },
});
