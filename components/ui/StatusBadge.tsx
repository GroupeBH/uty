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
    const getStatusConfig = (status: StatusType) => {
        const statusLower = status.toLowerCase();

        // Statuts de commande
        if (statusLower === 'pending') {
            return { color: Colors.warning, label: 'En attente' };
        }
        if (statusLower === 'confirmed') {
            return { color: Colors.info, label: 'Confirmée' };
        }
        if (statusLower === 'preparing') {
            return { color: Colors.accent, label: 'En préparation' };
        }
        if (statusLower === 'ready') {
            return { color: Colors.success, label: 'Prête' };
        }
        if (statusLower === 'in_transit') {
            return { color: Colors.primary, label: 'En transit' };
        }
        if (statusLower === 'delivered') {
            return { color: Colors.success, label: 'Livrée' };
        }
        if (statusLower === 'cancelled') {
            return { color: Colors.error, label: 'Annulée' };
        }

        // Statuts de livraison
        if (statusLower === 'assigned') {
            return { color: Colors.info, label: 'Assignée' };
        }
        if (statusLower === 'picked_up') {
            return { color: Colors.accent, label: 'Récupérée' };
        }

        // Statuts KYC
        if (statusLower === 'not_submitted') {
            return { color: Colors.gray400, label: 'Non soumis' };
        }
        if (statusLower === 'approved') {
            return { color: Colors.success, label: 'Approuvé' };
        }
        if (statusLower === 'rejected') {
            return { color: Colors.error, label: 'Rejeté' };
        }

        // Défaut
        return { color: Colors.gray400, label: status };
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
