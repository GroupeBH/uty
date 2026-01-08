import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGetProductByIdQuery } from '@/store/api/productsApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: product, isLoading } = useGetProductByIdQuery(id!);

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!product) {
        return (
            <View style={styles.center}>
                <Text>Produit non trouvé</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Détails du produit</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image
                    source={{ uri: product.images[0] || 'https://via.placeholder.com/300' }}
                    style={styles.image}
                />
                <View style={styles.details}>
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.price}>{product.price.toFixed(2)} €</Text>
                    <Text style={styles.description}>{product.description}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
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
    image: {
        width: '100%',
        height: 300,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    details: {
        padding: Spacing.lg,
    },
    name: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    price: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.fontSize.md,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
