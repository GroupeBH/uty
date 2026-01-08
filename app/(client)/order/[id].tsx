import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGetOrderQuery } from '@/store/api/ordersApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: response, isLoading } = useGetOrderQuery(id!);
    const order = response?.data;

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!order) {
        return (
            <View style={styles.center}>
                <Text>Commande non trouvée</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Détails de la commande</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.orderNumber}>Commande #{order.orderNumber}</Text>
                    <Text style={styles.status}>Statut: {order.status}</Text>
                </View>

                {/* Plus de détails à implémenter selon les besoins */}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.primary,
    },
    backButton: {
        marginRight: Spacing.md,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    orderNumber: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    status: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
