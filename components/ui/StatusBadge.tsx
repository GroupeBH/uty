/**
 * Composant StatusBadge pour afficher les statuts avec couleurs
 */

import { Colors, ComponentTokens, Spacing, Typography } from '@/constants/theme';
import { DeliveryStatus, KYCStatus, OrderStatus } from '@/types';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type StatusType = OrderStatus | DeliveryStatus | KYCStatus | string;

interface StatusBadgeProps {
    status: StatusType;
    style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
    const getStatusConfig = (statusValue: StatusType) => {
        const statusLower = statusValue.toLowerCase();

        // Statuts de commande
        if (statusLower === 'pending') {
            return { color: Colors.warning, label: 'En attente' };
        }
        if (statusLower === 'confirmed') {
            return { color: Colors.info, label: 'Confirmee' };
        }
        if (statusLower === 'shipped') {
            return { color: Colors.primary, label: 'Expediee' };
        }
        if (statusLower === 'preparing') {
            return { color: Colors.accent, label: 'En preparation' };
        }
        if (statusLower === 'ready') {
            return { color: Colors.success, label: 'Prete' };
        }
        if (statusLower === 'in_transit') {
            return { color: Colors.primary, label: 'En transit' };
        }
        if (statusLower === 'delivered') {
            return { color: Colors.success, label: 'Livree' };
        }
        if (statusLower === 'cancelled') {
            return { color: Colors.error, label: 'Annulee' };
        }

        // Statuts de livraison
        if (statusLower === 'assigned') {
            return { color: Colors.info, label: 'Assignee' };
        }
        if (statusLower === 'picked_up') {
            return { color: Colors.accent, label: 'Recuperee' };
        }

        // Statuts KYC
        if (statusLower === 'not_submitted') {
            return { color: Colors.gray400, label: 'Non soumis' };
        }
        if (statusLower === 'approved') {
            return { color: Colors.success, label: 'Approuve' };
        }
        if (statusLower === 'rejected') {
            return { color: Colors.error, label: 'Rejete' };
        }

        // Defaut
        return { color: Colors.gray400, label: statusValue };
    };

    const { color, label } = getStatusConfig(status);

    return (
        <View style={[styles.badge, { backgroundColor: color + '20' }, style]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.text, { color }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: ComponentTokens.badge.paddingHorizontal,
        paddingVertical: ComponentTokens.badge.paddingVertical,
        borderRadius: ComponentTokens.badge.borderRadius,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: Spacing.xs,
    },
    text: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
});

