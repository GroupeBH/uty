
import { CategoryCard } from '@/components/CategoryCard';
import { FAB } from '@/components/FAB';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, QuickActionSkeleton } from '@/components/SkeletonLoader';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementsQuery } from '@/store/api/announcementsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Animated,
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
    { id: '1', title: 'Publier', icon: 'add-circle-outline', gradient: Gradients.accent, route: '/publish' },
    { id: '2', title: 'Mes annonces', icon: 'list-outline', gradient: Gradients.primary, route: '/my-announcements' },
    { id: '3', title: 'Rechercher', icon: 'search-outline', gradient: Gradients.cool, route: '/search' },
    { id: '4', title: 'Favoris', icon: 'heart-outline', gradient: Gradients.warm, route: '/profile' },
];

const CATEGORIES = [
    { id: '1', name: 'Électronique', icon: 'hardware-chip-outline', gradient: Gradients.cool },
    { id: '2', name: 'Mode', icon: 'shirt-outline', gradient: Gradients.warm },
    { id: '3', name: 'Maison', icon: 'home-outline', gradient: Gradients.success },
    { id: '4', name: 'Sports', icon: 'football-outline', gradient: Gradients.accent },
    { id: '5', name: 'Livres', icon: 'book-outline', gradient: Gradients.primary },
    { id: '6', name: 'Beauté', icon: 'sparkles-outline', gradient: Gradients.sunset },
];

export default function HomeScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const [notifications] = useState(3);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const searchScaleAnim = React.useRef(new Animated.Value(1)).current;

    const { data: announcements, isLoading, error, refetch } = useGetAnnouncementsQuery();

    // Calculer les statistiques
    const stats = useMemo(() => {
        if (!announcements) return { total: 0, recent: 0, popular: 0 };
        
        const now = new Date().getTime();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        
        const recentCount = announcements.filter((a: any) => {
            const createdAt = new Date(a.createdAt || a._id).getTime();
            return createdAt > oneDayAgo;
        }).length;

        return {
            total: announcements.length,
            recent: recentCount,
            popular: Math.min(10, announcements.length),
        };
    }, [announcements]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Animations du header au scroll
    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [0, -20],
        extrapolate: 'clamp',
    });

    const greetingOpacity = scrollY.interpolate({
        inputRange: [0, 40],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const greetingScale = scrollY.interpolate({
        inputRange: [0, 40],
        outputRange: [1, 0.8],
        extrapolate: 'clamp',
    });

    const searchBarScale = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0.96],
        extrapolate: 'clamp',
    });

    // Animation de la barre de recherche au focus
    const handleSearchPress = () => {
        Animated.spring(searchScaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start(() => {
            Animated.spring(searchScaleAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();
        });
        router.push('/search');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header moderne avec animations */}
            <View style={styles.headerWrapper}>
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark, '#001a33']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    {/* Éléments décoratifs en arrière-plan */}
                    <View style={styles.headerDecoration}>
                        <View style={[styles.decorationCircle, styles.decorationCircle1]} />
                        <View style={[styles.decorationCircle, styles.decorationCircle2]} />
                        <View style={[styles.decorationCircle, styles.decorationCircle3]} />
                    </View>

                    {/* Contenu principal du header */}
                    <View style={styles.headerContent}>
                        {/* Section utilisateur avec avatar */}
                        <View style={styles.userSection}>
                            <TouchableOpacity 
                                style={styles.avatarButton}
                                onPress={() => router.push('/profile')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[Colors.accent, Colors.accentDark]}
                                    style={styles.avatarGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="person" size={24} color={Colors.primary} />
                                </LinearGradient>
                            </TouchableOpacity>
                            
                            <Animated.View 
                                style={[
                                    styles.greetingContainer,
                                    {
                                        opacity: greetingOpacity,
                                        transform: [{ scale: greetingScale }],
                                    }
                                ]}
                            >
                                <Text style={styles.greeting}>Bonjour 👋</Text>
                                <Text style={styles.userName}>Utilisateur</Text>
                            </Animated.View>
                        </View>

                        {/* Actions du header */}
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.modernHeaderButton}
                                onPress={() => router.push('/cart')}
                                accessibilityLabel="Panier"
                                activeOpacity={0.7}
                            >
                                <View style={styles.headerButtonInner}>
                                    <Ionicons name="cart-outline" size={22} color={Colors.white} />
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.modernHeaderButton}
                                onPress={() => router.push('/profile')}
                                accessibilityLabel="Notifications"
                                activeOpacity={0.7}
                            >
                                <View style={styles.headerButtonInner}>
                                    <Ionicons name="notifications-outline" size={22} color={Colors.white} />
                                    {notifications > 0 && (
                                        <View style={styles.modernBadge}>
                                            <Text style={styles.modernBadgeText}>{notifications}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Barre de recherche moderne */}
                    <Animated.View 
                        style={[
                            styles.searchContainer,
                            {
                                transform: [{ scale: searchBarScale }],
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            style={styles.modernSearchBar}
                            onPress={handleSearchPress}
                            activeOpacity={1}
                        >
                            <Animated.View style={[
                                styles.searchBarContent,
                                { transform: [{ scale: searchScaleAnim }] }
                            ]}>
                                {/* Icône de recherche avec fond */}
                                <View style={styles.searchIconContainer}>
                                    <LinearGradient
                                        colors={[Colors.accent, Colors.accentDark]}
                                        style={styles.searchIconGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="search" size={20} color={Colors.primary} />
                                    </LinearGradient>
                                </View>
                                
                                {/* Texte de recherche */}
                                <View style={styles.searchTextContainer}>
                                    <Text style={styles.modernSearchPlaceholder}>
                                        Rechercher un produit...
                                    </Text>
                                    <Text style={styles.searchHint}>
                                        Electronics, Mode, etc.
                                    </Text>
                                </View>
                                
                                {/* Bouton filtres */}
                                <TouchableOpacity 
                                    style={styles.filterButton}
                                    onPress={() => router.push('/search')}
                                >
                                    <Ionicons name="options-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </Animated.View>
                        </TouchableOpacity>
                    </Animated.View>
                </LinearGradient>
            </View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.accent}
                        colors={[Colors.accent]}
                    />
                }
            >
                {/* Statistiques */}
                {/* <View style={styles.statsSection}>
                    <ScrollView 
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statsContainer}
                    >
                        <StatsCard
                            title="Total annonces"
                            value={stats.total}
                            icon="cube-outline"
                            gradient={Gradients.primary}
                            trend="up"
                            trendValue="+12%"
                        />
                        <StatsCard
                            title="Nouvelles (24h)"
                            value={stats.recent}
                            icon="time-outline"
                            gradient={Gradients.success}
                            trend="up"
                            trendValue="+5"
                        />
                        <StatsCard
                            title="Populaires"
                            value={stats.popular}
                            icon="trending-up-outline"
                            gradient={Gradients.warm}
                            trend="neutral"
                        />
                    </ScrollView>
                </View> */}

                {/* Catégories */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏷️ Catégories</Text>
                        <TouchableOpacity onPress={() => router.push('/search')}>
                            <Text style={styles.seeAll}>Tout voir</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                    >
                        {CATEGORIES.map((category) => (
                            <CategoryCard
                                key={category.id}
                                name={category.name}
                                icon={category.icon as any}
                                gradient={category.gradient}
                                onPress={() => router.push('/search')}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
                    </View>
                    {isLoading ? (
                        <View style={styles.quickActionsContainer}>
                            {[1, 2, 3, 4].map((i) => (
                                <QuickActionSkeleton key={i} />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.quickActionsContainer}>
                            {QUICK_ACTIONS.map((action) => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={styles.actionCard}
                                    onPress={() => router.push(action.route as any)}
                                    accessibilityLabel={action.title}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={action.gradient as any}
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
                    )}
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
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScrollContainer}
                        >
                            <View style={styles.pairContainer}>
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                            </View>
                            <View style={styles.pairContainer}>
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                            </View>
                        </ScrollView>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                            <Text style={styles.errorText}>Impossible de charger les annonces</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => refetch()}
                            >
                                <Text style={styles.retryButtonText}>Réessayer</Text>
                                <Ionicons name="refresh" size={16} color={Colors.white} />
                            </TouchableOpacity>
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
                        <>
                            <View style={styles.pairContainer}>
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                            </View>
                            <View style={styles.pairContainer}>
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                            </View>
                        </>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                            <Text style={styles.errorText}>Impossible de charger les annonces</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => refetch()}
                            >
                                <Text style={styles.retryButtonText}>Réessayer</Text>
                                <Ionicons name="refresh" size={16} color={Colors.white} />
                            </TouchableOpacity>
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
            </Animated.ScrollView>

            {/* Floating Action Button */}
            <FAB onPress={() => router.push('/publish')} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    headerWrapper: {
        overflow: 'hidden',
        zIndex: 10,
        borderBottomLeftRadius: BorderRadius.xxxl,
        borderBottomRightRadius: BorderRadius.xxxl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
        minHeight: 200,
    },
    headerGradient: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
        position: 'relative',
    },
    headerDecoration: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    decorationCircle: {
        position: 'absolute',
        borderRadius: 9999,
        backgroundColor: Colors.white,
        opacity: 0.05,
    },
    decorationCircle1: {
        width: 200,
        height: 200,
        top: -100,
        right: -50,
    },
    decorationCircle2: {
        width: 150,
        height: 150,
        top: 50,
        left: -75,
    },
    decorationCircle3: {
        width: 100,
        height: 100,
        bottom: -50,
        right: 100,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        zIndex: 1,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    avatarButton: {
        ...Shadows.lg,
    },
    avatarGradient: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    greetingContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: Typography.fontSize.sm,
        color: Colors.white,
        opacity: 0.9,
        fontWeight: Typography.fontWeight.medium,
        marginBottom: 2,
    },
    userName: {
        fontSize: Typography.fontSize.xl,
        color: Colors.white,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    modernHeaderButton: {
        ...Shadows.md,
    },
    headerButtonInner: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    modernBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.error,
        borderRadius: BorderRadius.full,
        minWidth: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        borderWidth: 3,
        borderColor: Colors.primary,
        ...Shadows.lg,
    },
    modernBadgeText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
    },
    searchContainer: {
        zIndex: 1,
    },
    modernSearchBar: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        ...Shadows.xl,
        overflow: 'hidden',
    },
    searchBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
        minHeight: 62,
    },
    searchIconContainer: {
        ...Shadows.sm,
    },
    searchIconGradient: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    modernSearchPlaceholder: {
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        marginBottom: 2,
    },
    searchHint: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray400,
        fontWeight: Typography.fontWeight.medium,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl + 80,
    },
    statsSection: {
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
    },
    statsContainer: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    categoriesContainer: {
        paddingVertical: Spacing.sm,
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
        width: 68,
        height: 68,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
        marginBottom: Spacing.sm,
    },
    actionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
        marginVertical: Spacing.md,
    },
    errorText: {
        textAlign: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        fontSize: Typography.fontSize.md,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        gap: Spacing.sm,
        ...Shadows.md,
    },
    retryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl * 2,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
        marginVertical: Spacing.md,
    },
    emptyText: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginTop: Spacing.lg,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.base,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        lineHeight: 22,
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
