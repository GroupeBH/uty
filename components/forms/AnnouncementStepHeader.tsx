import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type StepHeaderProps = {
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    tip?: string;
};

export function AnnouncementStepHeader({
    icon = 'sparkles-outline',
    title,
    subtitle,
    tip,
}: StepHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.contentRow}>
                <View style={styles.iconWrap}>
                    <Ionicons name={icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.copyWrap}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
            </View>

            {tip ? (
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
    copyWrap: {
        flex: 1,
    },
    title: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    subtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
        color: Colors.textSecondary,
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
