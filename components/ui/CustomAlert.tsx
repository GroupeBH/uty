import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Annuler',
    showCancel = false,
}) => {
    const scaleAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible, scaleAnim]);

    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return {
                    name: 'checkmark-circle' as const,
                    color: Colors.success,
                    gradient: Gradients.success,
                };
            case 'error':
                return {
                    name: 'close-circle' as const,
                    color: Colors.error,
                    gradient: Gradients.warm,
                };
            case 'warning':
                return {
                    name: 'warning' as const,
                    color: Colors.warning,
                    gradient: Gradients.warm,
                };
            default:
                return {
                    name: 'information-circle' as const,
                    color: Colors.accent,
                    gradient: Gradients.accent,
                };
        }
    };

    const iconConfig = getIconConfig();

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <LinearGradient colors={iconConfig.gradient} style={styles.iconCircle}>
                            <Ionicons name={iconConfig.name} size={48} color={Colors.white} />
                        </LinearGradient>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttons}>
                        {showCancel && (
                            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.confirmButton, !showCancel && styles.confirmButtonFull]}
                            onPress={onConfirm}
                        >
                            <LinearGradient
                                colors={iconConfig.gradient}
                                style={styles.confirmButtonGradient}
                            >
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    alertContainer: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xxl,
        alignItems: 'center',
        ...Shadows.xl,
    },
    iconContainer: {
        marginBottom: Spacing.lg,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    content: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttons: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 2,
        borderColor: Colors.gray200,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    cancelButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textSecondary,
    },
    confirmButton: {
        flex: 1,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    confirmButtonFull: {
        flex: 1,
    },
    confirmButtonGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});

