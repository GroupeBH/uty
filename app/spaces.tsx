import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyDeliveryPersonProfileQuery } from '@/store/api/deliveryPersonsApi';
import { useGetMyShopQuery } from '@/store/api/shopsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DRIVER_ROLE_KEYS = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];
const SELLER_ROLE_KEYS = ['seller', 'admin'];

const hasRole = (roles: string[] | undefined, candidates: string[]) =>
    Boolean(roles?.some((role) => candidates.includes((role || '').toLowerCase())));

export default function SpacesScreen() {
    const router = useRouter();
    const { isLoading, isAuthenticated, requireAuth, user } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour changer d espace.');
        }
    }, [isAuthenticated, requireAuth]);

    const hasSellerRole = hasRole(user?.roles, SELLER_ROLE_KEYS);
    const hasDriverRole = hasRole(user?.roles, DRIVER_ROLE_KEYS);

    const { data: myShop } = useGetMyShopQuery(undefined, {
        skip: !isAuthenticated,
    });
    const { data: deliveryProfile } = useGetMyDeliveryPersonProfileQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const sellerReady = Boolean(myShop?._id || hasSellerRole);
    const driverReady = Boolean(deliveryProfile?._id || hasDriverRole);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerBody}>
                    <Text style={styles.title}>Changer d espace</Text>
                    <Text style={styles.subtitle}>Choisissez votre mode de travail</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={Gradients.primary} style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Espaces autonomes</Text>
                    <Text style={styles.heroText}>
                        Chaque espace a ses propres onglets, operations et flux metier.
                    </Text>
                </LinearGradient>

                <View style={styles.grid}>
                    <TouchableOpacity
                        style={styles.spaceCard}
                        activeOpacity={0.9}
                        onPress={() =>
                            sellerReady ? router.push('/seller' as any) : router.push('/create-shop')
                        }
                    >
                        <View style={styles.iconWrap}>
                            <Ionicons name="storefront-outline" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.cardTitle}>Espace vendeur</Text>
                        <Text style={styles.cardText}>
                            {sellerReady
                                ? 'Boutique, commandes, annonces et gestion vendeur.'
                                : 'Activez votre boutique pour debloquer cet espace.'}
                        </Text>
                        <View style={[styles.badge, sellerReady ? styles.badgeReady : styles.badgePending]}>
                            <Text style={[styles.badgeText, sellerReady && styles.badgeTextReady]}>
                                {sellerReady ? 'Pret' : 'Configuration requise'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.spaceCard}
                        activeOpacity={0.9}
                        onPress={() =>
                            driverReady
                                ? router.push('/delivery-persons' as any)
                                : router.push('/become-delivery')
                        }
                    >
                        <View style={styles.iconWrap}>
                            <Ionicons name="bicycle-outline" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.cardTitle}>Espace livreur</Text>
                        <Text style={styles.cardText}>
                            {driverReady
                                ? 'Courses, suivi temps reel et operations de livraison.'
                                : 'Devenez livreur pour acceder a cet espace.'}
                        </Text>
                        <View style={[styles.badge, driverReady ? styles.badgeReady : styles.badgePending]}>
                            <Text style={[styles.badgeText, driverReady && styles.badgeTextReady]}>
                                {driverReady ? 'Pret' : 'Configuration requise'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.clientButton} onPress={() => router.push('/(tabs)' as any)}>
                    <Ionicons name="person-outline" size={16} color={Colors.primary} />
                    <Text style={styles.clientButtonText}>Retour espace client</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    headerBody: { flex: 1 },
    title: {
        fontSize: Typography.fontSize.xl,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    subtitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
    },
    content: {
        padding: Spacing.xl,
        gap: Spacing.md,
        paddingBottom: 120,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.sm,
    },
    heroTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    heroText: {
        marginTop: Spacing.xs,
        color: Colors.white + 'DD',
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    grid: {
        gap: Spacing.md,
    },
    spaceCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    iconWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: Colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    cardTitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cardText: {
        marginTop: Spacing.xs,
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    badge: {
        marginTop: Spacing.md,
        alignSelf: 'flex-start',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
    },
    badgeReady: {
        borderColor: Colors.success + '40',
        backgroundColor: Colors.success + '15',
    },
    badgePending: {
        borderColor: Colors.warning + '50',
        backgroundColor: Colors.warning + '14',
    },
    badgeText: {
        color: Colors.warning,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    badgeTextReady: {
        color: Colors.success,
    },
    clientButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    clientButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
