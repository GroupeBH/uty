import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type KycInfoModalProps = {
    visible: boolean;
    title: string;
    description: string;
    primaryLabel?: string;
    onClose: () => void;
    onStart: () => void;
};

const KYC_POINTS = [
    'Un selfie en direct pour confirmer votre visage.',
    'Une piece d identite lisible.',
    'Une validation avant de publier ou recevoir des missions.',
];

export function KycInfoModal({
    visible,
    title,
    description,
    primaryLabel = 'Lancer le KYC',
    onClose,
    onStart,
}: KycInfoModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="shield-checkmark-outline" size={26} color={Colors.primary} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>

                    <View style={styles.points}>
                        {KYC_POINTS.map((point) => (
                            <View key={point} style={styles.pointRow}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                <Text style={styles.pointText}>{point}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={onStart} activeOpacity={0.9}>
                        <LinearGradient colors={Gradients.primary} style={styles.primaryGradient}>
                            <Text style={styles.primaryText}>{primaryLabel}</Text>
                            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.secondaryText}>Plus tard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    card: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.lg,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        lineHeight: 26,
    },
    description: {
        marginTop: Spacing.sm,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    points: {
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    pointText: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
        fontWeight: Typography.fontWeight.medium,
    },
    primaryButton: {
        marginTop: Spacing.xl,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    primaryGradient: {
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    primaryText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    secondaryButton: {
        marginTop: Spacing.sm,
        minHeight: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
});
