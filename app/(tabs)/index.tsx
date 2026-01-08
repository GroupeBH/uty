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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Function to simulate getting popular announcements based on views, comments, or cart additions
const getPopularAnnouncements = (allAnnouncements: any[]) => {
  // In a real app, this would come from the API with proper sorting
  // For now, we'll sort by a combination of viewCount, commentCount, and cartAdditions
  return [...allAnnouncements]
    .sort((a, b) => {
      const scoreA = (a.viewCount || 0) + (a.commentCount || 0) + (a.cartAdditions || 0);
      const scoreB = (b.viewCount || 0) + (b.commentCount || 0) + (b.cartAdditions || 0);
      return scoreB - scoreA;
    })
    .slice(0, 10); // Take top 10 popular announcements
};

// Function to get recent announcements
const getRecentAnnouncements = (allAnnouncements: any[]) => {
  return [...allAnnouncements]
    .sort((a, b) => new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime())
    .slice(0, 10); // Take 10 most recent
};

// Component to render announcement pairs horizontally
const AnnouncementPairRow = ({ pair, onAddToCart, onToggleWishlist }: any) => (
  <View style={styles.pairContainer}>
    <View style={styles.pairItem}>
      <ProductCard
        product={pair[0]}
        onAddToCart={onAddToCart}
        onToggleWishlist={onToggleWishlist}
      />
    </View>
    {pair[1] && (
      <View style={styles.pairItem}>
        <ProductCard
          product={pair[1]}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
        />
      </View>
    )}
  </View>
);

const QUICK_ACTIONS = [
    { id: '1', title: 'Publier', icon: 'add-circle', gradient: Gradients.accent, route: '/(tabs)/publish' }, // Navigate to publish screen
    { id: '2', title: 'Rechercher', icon: 'search', gradient: Gradients.cool, route: '/search' },
    { id: '3', title: 'Favoris', icon: 'heart', gradient: Gradients.warm, route: '/profile' }, // No specific favorites route, redirecting to profile
    { id: '4', title: 'Messages', icon: 'chatbubbles', gradient: Gradients.success, route: '/profile' }, // No specific messages route, redirecting to profile
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
                        onPress={() => router.push('/profile')}
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
                        onPress={() => router.push('/profile')}
                        accessibilityLabel="Commencer à publier"
                    >
                        <Text style={styles.heroButtonText}>Commencer</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions rapides</Text>
                    <View style={styles.quickActionsContainer}>
                        {QUICK_ACTIONS.map((action, index) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={() => router.push(action.route as any)}
                                accessibilityLabel={action.title}
                            >
                                <LinearGradient
                                    colors={action.gradient}
                                    style={styles.actionGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name={action.icon as any} size={32} color={Colors.white} />
                                </LinearGradient>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Popular Announcements - Horizontal Scroll */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🔥 Annonces populaires</Text>
                        <TouchableOpacity onPress={() => router.push('/search')}>
                            <Text style={styles.seeAll}>Voir tout</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <Ionicons name="hourglass" size={32} color={Colors.gray400} />
                            <Text style={styles.loadingText}>Chargement des annonces...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={32} color={Colors.error} />
                            <Text style={styles.errorText}>Impossible de charger les annonces</Text>
                        </View>
                    ) : !announcements || announcements.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube" size={48} color={Colors.gray300} />
                            <Text style={styles.emptyText}>Aucune annonce disponible</Text>
                            <Text style={styles.emptySubtext}>Revenez plus tard pour voir de nouvelles annonces</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScrollContainer}
                        >
                            {(() => {
                                // Create pairs of popular announcements
                                const popular = getPopularAnnouncements(announcements);
                                const pairs = [];
                                for (let i = 0; i < popular.length; i += 2) {
                                    pairs.push([popular[i], popular[i + 1]]);
                                }
                                return pairs.map((pair, index) => (
                                    <View key={`popular-pair-${index}`} style={styles.pairContainer}>
                                        <View style={styles.pairItem}>
                                            <ProductCard
                                                product={pair[0]}
                                                onAddToCart={(product: any) => console.log('Ajouté au panier', product._id)}
                                                onToggleWishlist={(product: any) => console.log('Favori', product._id)}
                                            />
                                        </View>
                                        {pair[1] && (
                                            <View style={styles.pairItem}>
                                                <ProductCard
                                                    product={pair[1]}
                                                    onAddToCart={(product: any) => console.log('Ajouté au panier', product._id)}
                                                    onToggleWishlist={(product: any) => console.log('Favori', product._id)}
                                                />
                                            </View>
                                        )}
                                    </View>
                                ));
                            })()}
                        </ScrollView>
                    )}
                </View>

                {/* Recent Announcements - Grid Layout */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📅 Annonces récentes</Text>
                        <TouchableOpacity onPress={() => router.push('/search')}>
                            <Text style={styles.seeAll}>Voir tout</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <Ionicons name="hourglass" size={32} color={Colors.gray400} />
                            <Text style={styles.loadingText}>Chargement des annonces...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={32} color={Colors.error} />
                            <Text style={styles.errorText}>Impossible de charger les annonces</Text>
                        </View>
                    ) : !announcements || announcements.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube" size={48} color={Colors.gray300} />
                            <Text style={styles.emptyText}>Aucune annonce disponible</Text>
                            <Text style={styles.emptySubtext}>Revenez plus tard pour voir de nouvelles annonces</Text>
                        </View>
                    ) : (
                        <>
                            {(() => {
                                // Create pairs of recent announcements
                                const recent = getRecentAnnouncements(announcements);
                                const pairs = [];
                                for (let i = 0; i < recent.length; i += 2) {
                                    pairs.push([recent[i], recent[i + 1]]);
                                }
                                return pairs.map((pair, index) => (
                                    <AnnouncementPairRow
                                        key={`recent-pair-${index}`}
                                        pair={pair}
                                        onAddToCart={(product: any) => console.log('Ajouté au panier', product._id)}
                                        onToggleWishlist={(product: any) => console.log('Favori', product._id)}
                                    />
                                ));
                            })()}
                        </>
                    )}
                </View>

                {/* Espace en bas pour le FAB */}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Floating Action Button */}
            <FAB onPress={() => router.push('/(tabs)/publish')} />
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
        paddingBottom: Spacing.xxl + 80,
    },
    heroSection: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xl,
        padding: Spacing.xxxl,
        borderRadius: BorderRadius.xl,
        ...Shadows.xl,
        overflow: 'hidden',
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
        fontSize: Typography.fontSize.base,
        color: Colors.white,
        opacity: 0.95,
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    heroButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.xl,
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
        marginTop: Spacing.xxl,
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
        letterSpacing: 0.5,
    },
    seeAll: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.accent,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    actionCard: {
        alignItems: 'center',
        flex: 1,
        marginHorizontal: Spacing.xs / 2,
        minWidth: 72,
    },
    actionGradient: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
        marginBottom: Spacing.xs,
    },
    actionTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: Spacing.md,
        color: Colors.gray500,
        fontStyle: 'italic',
        fontSize: Typography.fontSize.sm,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
    },
    errorText: {
        textAlign: 'center',
        marginTop: Spacing.md,
        color: Colors.error,
        fontWeight: Typography.fontWeight.medium,
        fontSize: Typography.fontSize.sm,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
        marginVertical: Spacing.md,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.medium,
        color: Colors.textPrimary,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        paddingHorizontal: Spacing.md,
    },
    productCardContainer: {
        marginBottom: Spacing.md,
    },
    pairContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    pairItem: {
        flex: 1,
        marginRight: Spacing.md,
    },
    pairItemLast: {
        flex: 1,
        marginRight: 0,
    },
    horizontalScrollContainer: {
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    bottomSpacer: {
        height: 100,
    },
});
