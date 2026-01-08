/**
 * Page d'accueil - Marketplace moderne avec annonces
 */

import { FAB } from '@/components/FAB';
import { ProductCard } from '@/components/ProductCard';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementsQuery } from '@/store/api/announcementsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUICK_ACTIONS = [
    { id: '1', title: 'Publier', icon: 'add-circle', gradient: Gradients.accent, route: '/publish' },
    { id: '2', title: 'Rechercher', icon: 'search', gradient: Gradients.cool, route: '/search' },
    { id: '3', title: 'Favoris', icon: 'heart', gradient: Gradients.warm, route: '/favorites' },
    { id: '4', title: 'Messages', icon: 'chatbubbles', gradient: Gradients.success, route: '/messages' },
];

export default function HomeScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const [notifications] = useState(3);

    const { data: announcements, isLoading, error, refetch } = useGetAnnouncementsQuery();

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header avec fond gradient et informations utilisateur */}
            <LinearGradient
                colors={Gradients.ocean}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.userSection}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={24} color={Colors.accent} />
                        </View>
                        <View>
                            <Text style={styles.greeting}>Bonjour 👋</Text>
                            <Text style={styles.userName}>Utilisateur</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push('/notifications')}
                        accessibilityLabel="Notifications"
                    >
                        <Ionicons name="notifications" size={24} color={Colors.white} />
                        {notifications > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{notifications}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.accent}
                        colors={[Colors.accent]}
                    />
                }
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={Gradients.sunset}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSection}
                >
                    <Text style={styles.heroTitle}>Publiez une annonce</Text>
                    <Text style={styles.heroSubtitle}>Vendez facilement, rapidement et en toute sécurité</Text>
                    <TouchableOpacity
                        style={styles.heroButton}
                        onPress={() => router.push('/publish')}
                        accessibilityLabel="Commencer à publier"
                    >
                        <Text style={styles.heroButtonText}>Commencer</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions rapides</Text>
                    <View style={styles.quickActions}>
                        {QUICK_ACTIONS.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={() => router.push(action.route)}
                                accessibilityLabel={action.title}
                            >
                                <LinearGradient
                                    colors={action.gradient}
                                    style={styles.actionGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name={action.icon as any} size={28} color={Colors.white} />
                                </LinearGradient>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Listings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🔥 Annonces récentes</Text>
                        <TouchableOpacity onPress={() => router.push('/search')}>
                            <Text style={styles.seeAll}>Voir tout</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <Text style={styles.loadingText}>Chargement des annonces...</Text>
                    ) : error ? (
                        <Text style={styles.errorText}>Impossible de charger les annonces</Text>
                    ) : (
                        announcements?.map((listing) => (
                            <ProductCard
                                key={listing._id}
                                product={listing}
                                onAddToCart={(product) => console.log('Ajouté au panier', product._id)}
                                onToggleWishlist={(product) => console.log('Favori', product._id)}
                            />
                        ))
                    )}
                </View>

                {/* Espace en bas pour le FAB */}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Floating Action Button */}
            <FAB onPress={() => router.push('/publish')} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.accent,
    },
    greeting: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'CC',
        fontWeight: Typography.fontWeight.medium,
    },
    userName: {
        fontSize: Typography.fontSize.lg,
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + '20',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.error,
        borderRadius: BorderRadius.full,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    badgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: Typography.fontWeight.bold,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    heroSection: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xl,
        padding: Spacing.xxxl,
        borderRadius: BorderRadius.lg,
        ...Shadows.lg,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
        marginBottom: Spacing.xs,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    heroSubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        opacity: 0.95,
        marginBottom: Spacing.lg,
        lineHeight: 20,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
        gap: Spacing.sm,
        ...Shadows.md,
    },
    heroButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    section: {
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xxxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    seeAll: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.lg,
    },
    actionCard: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: Spacing.xs / 2,
    },
    actionGradient: {
        width: 72,
        height: 72,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    actionTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    loadingText: {
        textAlign: 'center',
        paddingVertical: Spacing.xl,
        color: Colors.gray500,
        fontStyle: 'italic',
    },
    errorText: {
        textAlign: 'center',
        paddingVertical: Spacing.xl,
        color: Colors.error,
        fontWeight: Typography.fontWeight.medium,
    },
    bottomSpacer: {
        height: 100,
    },
});