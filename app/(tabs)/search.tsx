/**
 * Page de recherche de produits
 */

import { ProductCard } from '@/components/ProductCard';
import { CategoryIcon } from '@/components/CategoryIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAppConfigQuery } from '@/store/api/appConfigApi';
import { useAuth } from '@/hooks/useAuth';
import { useGetAnnouncementsQuery, useToggleLikeMutation } from '@/store/api/announcementsApi';
import { useGetCategoriesQuery } from '@/store/api/categoriesApi';
import { Announcement } from '@/types/announcement';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const normalizeSearchValue = (value: unknown): string =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const SEARCH_ALIASES: Record<string, string[]> = {
    telephone: ['gsm', 'smartphone', 'portable', 'phone'],
    frigo: ['refrigerateur', 'frigidaire'],
    ordinateur: ['pc', 'laptop'],
    chaussures: ['souliers', 'baskets'],
    vetements: ['habits', 'tenues'],
};

type QuickFilter = 'all' | 'deliverable' | 'in_stock' | 'recent';

const matchesSearchToken = (token: string, searchableText: string): boolean => {
    if (!token) return true;
    if (searchableText.includes(token)) return true;

    for (const [canonical, aliases] of Object.entries(SEARCH_ALIASES)) {
        const variants = [canonical, ...aliases].map((entry) => normalizeSearchValue(entry));
        if (variants.includes(token)) {
            return variants.some((variant) => searchableText.includes(variant));
        }
    }

    return false;
};

const normalizeId = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const nestedId = (value as any)?._id;
        if (typeof nestedId === 'string') return nestedId;
    }
    return null;
};

const toIdList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => normalizeId(entry))
        .filter((entry): entry is string => Boolean(entry));
};

export default function SearchScreen() {
    const { categoryId: categoryIdFromParams } = useLocalSearchParams<{ categoryId?: string | string[] }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const normalizedCategoryFromParams = useMemo(
        () =>
            Array.isArray(categoryIdFromParams)
                ? categoryIdFromParams[0]
                : categoryIdFromParams,
        [categoryIdFromParams],
    );
    const [category, setCategory] = useState<string | undefined>(normalizedCategoryFromParams);
    const { user, requireAuth } = useAuth();
    const { data: appConfig } = useGetAppConfigQuery();
    const [toggleLike, { isLoading: isTogglingLike }] = useToggleLikeMutation();

    const { data: announcements, isLoading } = useGetAnnouncementsQuery();
    const { data: categoriesData = [] } = useGetCategoriesQuery();

    React.useEffect(() => {
        if (normalizedCategoryFromParams) {
            setCategory(normalizedCategoryFromParams);
        }
    }, [normalizedCategoryFromParams]);

    const categories = useMemo(() => {
        const apiCategories = categoriesData
            .filter((item: any) => item?.isActive !== false)
            .slice(0, 12)
            .map((item: any, index: number) => ({
                id: String(item._id),
                label: item.name || `Categorie ${index + 1}`,
                icon: item.icon,
            }));

        return [{ id: 'all', label: 'Tout', icon: null }, ...apiCategories];
    }, [categoriesData]);

    const filteredData = useMemo(() => {
        const normalizedSearch = normalizeSearchValue(searchQuery);
        const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);
        return (announcements || []).filter((item) => {
            const name = normalizeSearchValue(item.name);
            const description = normalizeSearchValue(item.description);
            const categoryName = normalizeSearchValue((item as any)?.category?.name);
            const searchableText = [name, description, categoryName].filter(Boolean).join(' ');
            const matchesSearch =
                searchTokens.length === 0 ||
                searchTokens.every((token) => matchesSearchToken(token, searchableText));

            const itemCategoryId = normalizeId(item.category);
            const itemCategoryAncestors = [
                ...toIdList(item.categoryAncestors),
                ...toIdList((item as any)?.category?.ancestors),
                ...toIdList((item as any)?.category?.parentId ? [(item as any).category.parentId] : []),
            ];
            const matchesCategory = category
                ? itemCategoryId === category || itemCategoryAncestors.includes(category)
                : true;
            const quantity = typeof item.quantity === 'number' ? item.quantity : undefined;
            const isRecent = Boolean(item.createdAt) &&
                Date.now() - new Date(item.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 14;
            const matchesQuickFilter =
                quickFilter === 'all' ||
                (quickFilter === 'deliverable' && item.isDeliverable === true) ||
                (quickFilter === 'in_stock' && (quantity === undefined || quantity > 0)) ||
                (quickFilter === 'recent' && isRecent);

            return matchesSearch && matchesCategory && matchesQuickFilter;
        });
    }, [announcements, category, quickFilter, searchQuery]);
    const featuredTerms = appConfig?.search?.featuredTerms || ['telephone', 'frigo', 'ordinateur', 'chaussures'];

    const activeCategoryMeta = useMemo(() => {
        if (!category) return { icon: null, label: 'Toutes les categories' };
        const found = categories.find((entry) => entry.id === category);
        if (!found) return { icon: null, label: 'Categorie' };
        return { icon: found.icon, label: found.label };
    }, [categories, category]);

    const handleAddToCart = (product: Announcement) => {
        console.log('Add to cart:', product._id);
    };

    const currentUserId = useMemo(
        () => normalizeId((user as any)?._id || (user as any)?.id),
        [user],
    );
    const isInWishlist = React.useCallback(
        (announcement: Announcement) => {
            if (!currentUserId) {
                return false;
            }
            const likes = Array.isArray((announcement as any)?.likes)
                ? (announcement as any).likes
                : [];
            return likes.some((entry: any) => normalizeId(entry) === currentUserId);
        },
        [currentUserId],
    );
    const handleToggleWishlist = React.useCallback(
        async (product: Announcement) => {
            if (isTogglingLike) {
                return;
            }
            if (!requireAuth('Vous devez etre connecte pour liker une annonce.')) {
                return;
            }
            if (!product?._id) {
                return;
            }
            try {
                await toggleLike(product._id).unwrap();
            } catch (error) {
                console.error('Toggle like error:', error);
            }
        },
        [isTogglingLike, requireAuth, toggleLike],
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <LinearGradient colors={Gradients.primary} style={styles.header}>
                <View pointerEvents="none" style={styles.headerGlowOne} />
                <View pointerEvents="none" style={styles.headerGlowTwo} />

                <View style={styles.headerTopRow}>
                    <View>
                        <Text style={styles.headerEyebrow}>EXPLORER</Text>
                        <Text style={styles.headerTitle}>Recherche produits</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
                        <Text style={styles.headerBadgeText}>Smart</Text>
                    </View>
                </View>

                <Text style={styles.headerSubtitle}>
                    Trouvez rapidement ce dont vous avez besoin
                </Text>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <View style={styles.searchIconWrap}>
                            <Ionicons name="search" size={18} color={Colors.primary} />
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher un produit..."
                            placeholderTextColor={Colors.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                                <Ionicons name="close" size={14} color={Colors.gray600} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <View style={styles.resultsMetaRow}>
                    <View style={styles.metaPill}>
                        <Ionicons name="pricetag-outline" size={14} color={Colors.primary} />
                        <Text style={styles.metaPillText}>{filteredData.length} resultat(s)</Text>
                    </View>
                    <View style={[styles.metaPill, styles.metaPillSoft]}>
                        <Ionicons name="funnel-outline" size={14} color={Colors.gray700} />
                        <View style={styles.metaCategoryWrap}>
                            <CategoryIcon
                                icon={activeCategoryMeta.icon}
                                size={13}
                                fallback="🏷️"
                                textStyle={styles.metaCategoryIconText}
                                imageStyle={styles.metaCategoryIconImage}
                            />
                        </View>
                        <Text style={styles.metaPillSoftText} numberOfLines={1}>
                            {activeCategoryMeta.label}
                        </Text>
                    </View>
                    {category ? (
                        <TouchableOpacity style={styles.resetCategoryBtn} onPress={() => setCategory(undefined)}>
                            <Ionicons name="refresh-outline" size={13} color={Colors.primary} />
                            <Text style={styles.resetCategoryText}>Reset</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </LinearGradient>

            <View style={styles.categoriesContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredTermsContainer}
                >
                    {featuredTerms.map((term) => (
                        <TouchableOpacity
                            key={term}
                            style={styles.featuredTermChip}
                            onPress={() => setSearchQuery(term)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="flash-outline" size={13} color={Colors.primary} />
                            <Text style={styles.featuredTermText}>{term}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScrollContent}
                >
                    {categories.map((cat) => {
                        const isSelected = cat.id === 'all' ? !category : category === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                                onPress={() => setCategory(cat.id === 'all' ? undefined : cat.id)}
                            >
                                <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapActive]}>
                                    {cat.id === 'all' ? (
                                        <Ionicons
                                            name="apps-outline"
                                            size={14}
                                            color={isSelected ? Colors.white : Colors.primary}
                                        />
                                    ) : (
                                        <CategoryIcon
                                            icon={cat.icon}
                                            size={14}
                                            fallback="🏷️"
                                            textStyle={[
                                                styles.categoryIconText,
                                                isSelected && styles.categoryIconTextActive,
                                            ]}
                                            imageStyle={styles.categoryIconImage}
                                        />
                                    )}
                                </View>
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickFiltersContainer}
                >
                    {[
                        { id: 'all', label: 'Tout' },
                        { id: 'deliverable', label: 'Livrable' },
                        { id: 'in_stock', label: 'En stock' },
                        { id: 'recent', label: 'Nouveaux' },
                    ].map((filter) => {
                        const isActive = quickFilter === filter.id;
                        return (
                            <TouchableOpacity
                                key={filter.id}
                                style={[styles.quickFilterChip, isActive && styles.quickFilterChipActive]}
                                onPress={() => setQuickFilter(filter.id as QuickFilter)}
                            >
                                <Text
                                    style={[
                                        styles.quickFilterText,
                                        isActive && styles.quickFilterTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <FlatList
                    data={filteredData || []}
                    renderItem={({ item }) => (
                        <View style={styles.productCard}>
                            <ProductCard
                                product={item}
                                onAddToCart={handleAddToCart}
                                onToggleWishlist={handleToggleWishlist}
                                isInWishlist={isInWishlist(item)}
                            />
                        </View>
                    )}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={[
                        styles.listContent,
                        (filteredData || []).length === 0 && styles.listContentEmpty,
                    ]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="search-outline" size={34} color={Colors.primary} />
                            </View>
                            <Text style={styles.emptyText}>Aucun produit trouve</Text>
                            <Text style={styles.emptySubtext}>Essayez un autre mot-cle ou une autre categorie.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEF3FF',
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
        borderBottomLeftRadius: BorderRadius.xxl,
        borderBottomRightRadius: BorderRadius.xxl,
        ...Shadows.md,
    },
    headerGlowOne: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        top: -56,
        right: -48,
        backgroundColor: '#FFFFFF24',
    },
    headerGlowTwo: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        bottom: -48,
        left: -36,
        backgroundColor: '#FFD7002B',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    headerEyebrow: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white + 'D4',
        letterSpacing: 1,
    },
    headerTitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    headerSubtitle: {
        marginTop: 4,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'E6',
        fontWeight: Typography.fontWeight.medium,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white + 'F5',
        ...Shadows.sm,
    },
    headerBadgeText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    searchContainer: {
        marginTop: Spacing.md,
        padding: Spacing.sm,
        backgroundColor: Colors.white + 'F2',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.white + '70',
        ...Shadows.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    searchIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '15',
    },
    clearSearchBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray200,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    resultsMetaRow: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.white,
        backgroundColor: Colors.white + 'EE',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
    },
    metaPillSoft: {
        backgroundColor: Colors.white + 'CC',
        borderColor: Colors.white + 'CC',
        maxWidth: '48%',
    },
    metaPillText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    metaPillSoftText: {
        color: Colors.gray700,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    metaCategoryWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaCategoryIconText: {
        fontSize: 13,
    },
    metaCategoryIconImage: {
        borderRadius: 7,
    },
    resetCategoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '35',
        backgroundColor: Colors.white,
    },
    resetCategoryText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    categoriesContainer: {
        marginTop: -Spacing.sm,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    featuredTermsContainer: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    featuredTermChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.full,
        paddingVertical: 8,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.primary + '1F',
        ...Shadows.sm,
    },
    featuredTermText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    categoriesScrollContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    quickFiltersContainer: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        paddingTop: Spacing.sm,
    },
    quickFilterChip: {
        borderRadius: BorderRadius.full,
        paddingVertical: 8,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    quickFilterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    quickFilterText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray700,
    },
    quickFilterTextActive: {
        color: Colors.white,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.full,
        paddingVertical: 8,
        paddingHorizontal: Spacing.md,
        gap: 8,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '15',
    },
    categoryIconWrapActive: {
        backgroundColor: Colors.white + '2B',
    },
    categoryIconText: {
        fontSize: 12,
        color: Colors.primary,
    },
    categoryIconTextActive: {
        color: Colors.white,
    },
    categoryIconImage: {
        borderRadius: 7,
    },
    categoryText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray700,
    },
    categoryTextActive: {
        color: Colors.white,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: 110,
    },
    listContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    productCard: {
        width: '48.5%',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxxl,
        ...Shadows.sm,
    },
    emptyIconWrap: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '12',
        borderWidth: 1,
        borderColor: Colors.primary + '28',
    },
    emptyText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.md,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
        textAlign: 'center',
    },
    emptySubtext: {
        marginTop: 6,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        textAlign: 'center',
        lineHeight: 20,
    },
});
