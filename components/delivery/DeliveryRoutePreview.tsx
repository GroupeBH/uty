import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import {
    DeliveryStatusValue,
    DeliveryWorkflow,
    getDeliveryBusinessLabel,
    getDeliveryWorkflowProgress,
} from '@/types/delivery';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type DeliveryRoutePreviewProps = {
    code: string;
    pickupLabel: string;
    dropoffLabel: string;
    status: DeliveryStatusValue;
    workflow?: DeliveryWorkflow;
    onPress?: () => void;
    actionLabel?: string;
};

export function DeliveryRoutePreview({
    code,
    pickupLabel,
    dropoffLabel,
    status,
    workflow,
    onPress,
    actionLabel = 'Ouvrir le suivi',
}: DeliveryRoutePreviewProps) {
    const progress = getDeliveryWorkflowProgress(status, workflow);
    const label = getDeliveryBusinessLabel(status, workflow);
    const content = (
        <>
            <View style={styles.mapPlane}>
                <View style={styles.mapGridOne} />
                <View style={styles.mapGridTwo} />
                <View style={styles.routeLine} />
                <View style={[styles.pin, styles.pinPickup]}>
                    <Ionicons name="storefront" size={14} color={Colors.white} />
                </View>
                <View style={[styles.pin, styles.pinDropoff]}>
                    <Ionicons name="flag" size={14} color={Colors.white} />
                </View>
                <View style={styles.progressBubble}>
                    <Text style={styles.progressText}>{progress.progressPercent}%</Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.headerRow}>
                    <View style={styles.codeWrap}>
                        <Text style={styles.code}>{code}</Text>
                        <Text style={styles.status}>{label}</Text>
                    </View>
                    <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{status === 'pending' ? 'A assigner' : 'Active'}</Text>
                    </View>
                </View>

                <View style={styles.routePoint}>
                    <View style={styles.pointDot} />
                    <View style={styles.pointCopy}>
                        <Text style={styles.pointLabel}>Retrait</Text>
                        <Text style={styles.pointValue} numberOfLines={2}>{pickupLabel}</Text>
                    </View>
                </View>
                <View style={styles.pointConnector} />
                <View style={styles.routePoint}>
                    <View style={[styles.pointDot, styles.pointDotEnd]} />
                    <View style={styles.pointCopy}>
                        <Text style={styles.pointLabel}>Destination</Text>
                        <Text style={styles.pointValue} numberOfLines={2}>{dropoffLabel}</Text>
                    </View>
                </View>

                {onPress ? (
                    <View style={styles.actionRow}>
                        <Text style={styles.actionText}>{actionLabel}</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                    </View>
                ) : null}
            </View>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
                {content}
            </TouchableOpacity>
        );
    }

    return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    mapPlane: {
        height: 126,
        backgroundColor: '#EEF5FF',
        overflow: 'hidden',
    },
    mapGridOne: {
        position: 'absolute',
        left: -20,
        right: -20,
        top: 36,
        height: 1,
        backgroundColor: Colors.white,
        transform: [{ rotate: '-16deg' }],
    },
    mapGridTwo: {
        position: 'absolute',
        left: 36,
        top: -20,
        bottom: -20,
        width: 1,
        backgroundColor: Colors.white,
        transform: [{ rotate: '28deg' }],
    },
    routeLine: {
        position: 'absolute',
        left: 58,
        top: 76,
        width: 146,
        height: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        transform: [{ rotate: '-24deg' }],
    },
    pin: {
        position: 'absolute',
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderWidth: 3,
        borderColor: Colors.white,
        ...Shadows.sm,
    },
    pinPickup: {
        left: 42,
        top: 68,
    },
    pinDropoff: {
        right: 48,
        top: 24,
        backgroundColor: Colors.success,
    },
    progressBubble: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        ...Shadows.sm,
    },
    progressText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
    body: {
        padding: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    codeWrap: {
        flex: 1,
    },
    code: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    status: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    statusPill: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.success + '18',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
    },
    statusPillText: {
        color: Colors.success,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    pointDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginTop: 5,
    },
    pointDotEnd: {
        backgroundColor: Colors.success,
    },
    pointConnector: {
        width: 2,
        height: 16,
        backgroundColor: Colors.primary + '25',
        marginLeft: 4,
        marginVertical: 3,
    },
    pointCopy: {
        flex: 1,
        minWidth: 0,
    },
    pointLabel: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    pointValue: {
        marginTop: 2,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        lineHeight: 19,
    },
    actionRow: {
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
