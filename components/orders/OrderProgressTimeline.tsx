import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { OrderStatusValue } from '@/types/order';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type OrderStep = {
    status: OrderStatusValue;
    label: string;
    caption: string;
    icon: keyof typeof Ionicons.glyphMap;
};

type OrderProgressTimelineProps = {
    status: OrderStatusValue;
    variant?: 'compact' | 'full';
};

const ORDER_STEPS: OrderStep[] = [
    {
        status: 'pending',
        label: 'Recue',
        caption: 'Commande recue',
        icon: 'receipt-outline',
    },
    {
        status: 'confirmed',
        label: 'Confirmee',
        caption: 'Vendeur pret',
        icon: 'checkmark-circle-outline',
    },
    {
        status: 'shipped',
        label: 'En route',
        caption: 'Livraison lancee',
        icon: 'bicycle-outline',
    },
    {
        status: 'delivered',
        label: 'Livree',
        caption: 'Terminee',
        icon: 'checkmark-done-outline',
    },
];

const ORDER_STATUS_INDEX: Record<OrderStatusValue, number> = {
    pending: 0,
    confirmed: 1,
    shipped: 2,
    delivered: 3,
    cancelled: 0,
};

export const getOrderProgressMeta = (status: OrderStatusValue) => {
    if (status === 'cancelled') {
        return {
            color: Colors.error,
            accentBackground: Colors.error + '12',
            headline: 'Commande annulee',
            helper: 'Aucune action de livraison n est disponible.',
            progressPercent: 100,
        };
    }

    const currentIndex = ORDER_STATUS_INDEX[status] ?? 0;
    const currentStep = ORDER_STEPS[currentIndex] || ORDER_STEPS[0];
    const progressPercent = Math.round((currentIndex / (ORDER_STEPS.length - 1)) * 100);
    const helper =
        status === 'pending'
            ? 'En attente de confirmation vendeur.'
            : status === 'confirmed'
                ? 'Prete pour demander une livraison.'
                : status === 'shipped'
                    ? 'Le colis est en route.'
                    : 'Commande livree avec succes.';

    return {
        color: status === 'delivered' ? Colors.success : Colors.primary,
        accentBackground: status === 'delivered' ? Colors.success + '12' : Colors.primary + '10',
        headline: currentStep.caption,
        helper,
        progressPercent,
    };
};

export function OrderProgressTimeline({ status, variant = 'compact' }: OrderProgressTimelineProps) {
    const currentIndex = ORDER_STATUS_INDEX[status] ?? 0;
    const isCancelled = status === 'cancelled';

    if (variant === 'full') {
        return (
            <View style={styles.fullWrap}>
                {ORDER_STEPS.map((step, index) => {
                    const isDone = !isCancelled && index < currentIndex;
                    const isCurrent = !isCancelled && index === currentIndex;
                    const isLast = index === ORDER_STEPS.length - 1;
                    const active = isDone || isCurrent;

                    return (
                        <View key={step.status} style={styles.fullStep}>
                            <View style={styles.fullRail}>
                                <View
                                    style={[
                                        styles.fullDot,
                                        active && styles.fullDotActive,
                                        isCurrent && styles.fullDotCurrent,
                                    ]}
                                >
                                    <Ionicons
                                        name={isDone ? 'checkmark' : step.icon}
                                        size={13}
                                        color={active ? Colors.white : Colors.gray400}
                                    />
                                </View>
                                {!isLast ? (
                                    <View style={[styles.fullLine, index < currentIndex && styles.fullLineActive]} />
                                ) : null}
                            </View>
                            <View style={styles.fullCopy}>
                                <Text style={[styles.fullLabel, active && styles.fullLabelActive]}>{step.label}</Text>
                                <Text style={styles.fullCaption}>{step.caption}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    }

    return (
        <View style={styles.compactWrap}>
            {ORDER_STEPS.map((step, index) => {
                const isDone = !isCancelled && index < currentIndex;
                const isCurrent = !isCancelled && index === currentIndex;
                const active = isDone || isCurrent;
                const isLast = index === ORDER_STEPS.length - 1;

                return (
                    <React.Fragment key={step.status}>
                        <View style={styles.compactStep}>
                            <View
                                style={[
                                    styles.compactDot,
                                    active && styles.compactDotActive,
                                    isCurrent && styles.compactDotCurrent,
                                ]}
                            >
                                <Ionicons
                                    name={isDone ? 'checkmark' : step.icon}
                                    size={13}
                                    color={active ? Colors.white : Colors.gray400}
                                />
                            </View>
                            <Text
                                style={[styles.compactLabel, active && styles.compactLabelActive]}
                                numberOfLines={1}
                            >
                                {step.label}
                            </Text>
                        </View>
                        {!isLast ? (
                            <View style={[styles.compactLine, index < currentIndex && styles.compactLineActive]} />
                        ) : null}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    compactWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.sm,
    },
    compactStep: {
        width: 54,
        alignItems: 'center',
    },
    compactDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactDotActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    compactDotCurrent: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    compactLabel: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        textAlign: 'center',
    },
    compactLabelActive: {
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    compactLine: {
        flex: 1,
        height: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray200,
        marginTop: 13,
        marginHorizontal: -6,
    },
    compactLineActive: {
        backgroundColor: Colors.success,
    },
    fullWrap: {
        gap: 0,
    },
    fullStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    fullRail: {
        width: 28,
        alignItems: 'center',
    },
    fullDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullDotActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    fullDotCurrent: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    fullLine: {
        width: 2,
        height: 36,
        backgroundColor: Colors.gray200,
    },
    fullLineActive: {
        backgroundColor: Colors.success,
    },
    fullCopy: {
        flex: 1,
        paddingLeft: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    fullLabel: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    fullLabelActive: {
        color: Colors.primary,
    },
    fullCaption: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
    },
});
