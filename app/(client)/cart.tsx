/**
 * Page du panier
 */

import { CartItem } from '@/components/CartItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAddToCartMutation, useGetCartQuery, useRemoveFromCartMutation } from '@/store/api/cartApi';
import { Announcement } from '@/types/announcement';
import { CartProduct as CartItemType } from '@/types/cart';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartScreen() {
    const router = useRouter();
    const { data: cart, isLoading, error } = useGetCartQuery();
    const [removeFromCart] = useRemoveFromCartMutation();
    const [addToCart] = useAddToCartMutation();
    // const [clearCart] = useClearCartMutation();

    const handleIncrement = async (item: CartItemType) => {
        try {
            const pId = typeof item.productId === 'string' ? item.productId : (item.productId as Announcement)._id;
            await addToCart({ productId: pId, quantity: 1 });
        } catch (e) {
            Alert.alert('Erreur', "Impossible de mettre à jour la quantité");
        }
    };

    const handleDecrement = (item: CartItemType) => {
        Alert.alert("Info", "Pour diminuer la quantité, veuillez retirer l'article et l'ajouter à nouveau avec la quantité désirée (Limitation API)");
    };

    const handleRemove = (item: CartItemType) => {
        Alert.alert(
            'Retirer du panier',
            `Voulez-vous retirer cet article du panier ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Retirer',
                    style: 'destructive',
                    onPress: async () => {
                        const pId = typeof item.productId === 'string' ? item.productId : (item.productId as Announcement)._id;
                        await removeFromCart(pId);
                    },
                },
            ]
        );
    };

    const handleCheckout = () => {
        Alert.alert('Commande', 'Fonctionnalité en cours de développement');
    };

    const cartItems = cart?.products || [];

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
        const product = (typeof item.productId === 'object' ? item.productId : {}) as Announcement;
        const price = product.price || 0;
        return sum + price * item.quantity;
    }, 0);
    const tax = subtotal * 0.2;
    const deliveryFee = 5.99;
    const total = subtotal + tax + deliveryFee;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={[styles.emptyContainer, { justifyContent: 'center' }]}>
                    <Text style={{ textAlign: 'center' }}>Chargement du panier...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={100} color={Colors.gray300} />
                    <Text style={styles.emptyTitle}>Votre panier est vide</Text>
                    <Text style={styles.emptyText}>
                        Ajoutez des produits pour commencer vos achats
                    </Text>
                    <Button
                        title="Découvrir les produits"
                        variant="primary"
                        size="lg"
                        onPress={() => router.push('/')}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <FlatList
                data={cartItems}
                renderItem={({ item }) => (
                    <CartItem
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onRemove={handleRemove}
                    />
                )}
                keyExtractor={(item) => (typeof item.productId === 'string' ? item.productId : (item.productId as Announcement)._id)}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                    <Card style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Récapitulatif</Text>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Sous-total</Text>
                            <Text style={styles.summaryValue}>{subtotal.toFixed(2)} €</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>TVA (20%)</Text>
                            <Text style={styles.summaryValue}>{tax.toFixed(2)} €</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Livraison</Text>
                            <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} €</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
                        </View>

                        <Button
                            title="Passer la commande"
                            variant="primary"
                            size="lg"
                            fullWidth
                            onPress={handleCheckout}
                            style={styles.checkoutButton}
                        />
                    </Card>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    listContent: {
        padding: Spacing.xl,
        paddingBottom: 100, // Espace pour la tab bar flottante
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.huge,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray400,
        textAlign: 'center',
        marginBottom: Spacing.huge,
        lineHeight: Typography.fontSize.md * 1.5,
    },
    summaryCard: {
        marginTop: Spacing.xl,
        padding: Spacing.xl,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        ...Shadows.lg,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
        marginBottom: Spacing.xl,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    summaryLabel: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    summaryValue: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    divider: {
        height: 2,
        backgroundColor: Colors.gray100,
        marginVertical: Spacing.xl,
    },
    totalLabel: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    totalValue: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.accent,
    },
    checkoutButton: {
        marginTop: Spacing.xl,
    },
});
