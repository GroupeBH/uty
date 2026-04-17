import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type StepHeaderProps = {
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    tip?: string;
    compact?: boolean;
};

export function AnnouncementStepHeader({
    icon = 'sparkles-outline',
    title,
    subtitle,
    tip,
    compact = false,
}: StepHeaderProps) {
    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <View style={styles.contentRow}>
                <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
                    <Ionicons name={icon} size={compact ? 18 : 20} color={Colors.primary} />
                </View>
                <View style={styles.copyWrap}>
                    <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
                    <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
                </View>
            </View>

            {tip && !compact ? (
                <View style={styles.tipRow}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
                    <Text style={styles.tipText}>{tip}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    containerCompact: {
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapCompact: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    copyWrap: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    titleCompact: {
        fontSize: Typography.fontSize.md,
    },
    subtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
    subtitleCompact: {
        marginTop: 2,
        lineHeight: 17,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
    },
    tipText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        lineHeight: 18,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.medium,
    },
});
