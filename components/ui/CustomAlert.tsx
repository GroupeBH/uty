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
    const opacityAnim = React.useRef(new Animated.Value(0)).current;
    const translateYAnim = React.useRef(new Animated.Value(24)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 60,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(translateYAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            translateYAnim.setValue(24);
        }
    }, [opacityAnim, scaleAnim, translateYAnim, visible]);

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
    const typeChipStyle = {
        backgroundColor: `${iconConfig.color}1A`,
        borderColor: `${iconConfig.color}36`,
    };
    const typeChipTextStyle = { color: iconConfig.color };
    const typeLabel =
        type === 'success'
            ? 'Succes'
            : type === 'error'
            ? 'Erreur'
            : type === 'warning'
            ? 'Attention'
            : 'Information';

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                        },
                    ]}
                >
                    <LinearGradient colors={iconConfig.gradient} style={styles.topStripe} />

                    <View style={styles.iconContainer}>
                        <View style={[styles.iconGlow, { backgroundColor: `${iconConfig.color}26` }]} />
                        <LinearGradient colors={iconConfig.gradient} style={styles.iconCircle}>
                            <Ionicons name={iconConfig.name} size={36} color={Colors.white} />
                        </LinearGradient>
                    </View>

                    <View style={styles.content}>
                        <View style={[styles.typeChip, typeChipStyle]}>
                            <Text style={[styles.typeChipText, typeChipTextStyle]}>{typeLabel}</Text>
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

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
        backgroundColor: 'rgba(2, 10, 26, 0.62)',
        paddingHorizontal: Spacing.xl,
    },
    alertContainer: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#FCFDFF',
        borderRadius: BorderRadius.xxl + 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        alignItems: 'center',
        ...Shadows.xl,
    },
    topStripe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
    },
    iconContainer: {
        marginBottom: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlow: {
        position: 'absolute',
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    content: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    typeChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    typeChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    title: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
        textAlign: 'center',
        lineHeight: 24,
    },
    message: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttons: {
        flexDirection: 'row',
        gap: Spacing.xs,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.sm + 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    cancelButtonText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textSecondary,
    },
    confirmButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    confirmButtonFull: {
        flex: 1,
    },
    confirmButtonGradient: {
        paddingVertical: Spacing.sm + 1,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});

