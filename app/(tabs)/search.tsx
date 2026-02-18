/**
 * Page de recherche de produits
 */

import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementsQuery } from '@/store/api/announcementsApi';
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

const resolveCategoryIcon = (name?: string, backendIcon?: string): keyof typeof Ionicons.glyphMap => {
    const value = `${name || ''} ${backendIcon || ''}`.toLowerCase();
    if (value.includes('elect') || value.includes('tech') || value.includes('digit')) return 'hardware-chip-outline';
    if (value.includes('mode') || value.includes('fashion')) return 'shirt-outline';
    if (value.includes('maison') || value.includes('home')) return 'home-outline';
    if (value.includes('sport')) return 'football-outline';
    if (value.includes('livre') || value.includes('book')) return 'book-outline';
    if (value.includes('beaute') || value.includes('beauty')) return 'sparkles-outline';
    if (value.includes('auto') || value.includes('vehic')) return 'car-sport-outline';
    return 'grid-outline';
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
    const normalizedCategoryFromParams = useMemo(
        () =>
            Array.isArray(categoryIdFromParams)
                ? categoryIdFromParams[0]
                : categoryIdFromParams,
        [categoryIdFromParams],
    );
    const [category, setCategory] = useState<string | undefined>(normalizedCategoryFromParams);

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
                icon: resolveCategoryIcon(item.name, item.icon),
            }));

        return [{ id: 'all', label: 'Tout', icon: 'apps-outline' as const }, ...apiCategories];
    }, [categoriesData]);

    const filteredData = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();
        return (announcements || []).filter((item) => {
            const name = (item.name || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const matchesSearch =
                normalizedSearch.length === 0 ||
                name.includes(normalizedSearch) ||
                description.includes(normalizedSearch);

            const itemCategoryId = normalizeId(item.category);
            const itemCategoryAncestors = [
                ...toIdList(item.categoryAncestors),
                ...toIdList((item as any)?.category?.ancestors),
                ...toIdList((item as any)?.category?.parentId ? [(item as any).category.parentId] : []),
            ];
            const matchesCategory = category
                ? itemCategoryId === category || itemCategoryAncestors.includes(category)
                : true;

            return matchesSearch && matchesCategory;
        });
    }, [announcements, category, searchQuery]);

    const handleAddToCart = (product: Announcement) => {
        console.log('Add to cart:', product._id);
    };

    const handleToggleWishlist = (product: Announcement) => {
        console.log('Toggle wishlist:', product._id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <LinearGradient colors={Gradients.primary} style={styles.header}>
                <Text style={styles.headerTitle}>Recherche produits</Text>
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
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                                <Ionicons name="close" size={14} color={Colors.gray600} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View style={styles.resultsMetaRow}>
                        <Text style={styles.resultsMetaText}>
                            {filteredData.length} resultat(s)
                        </Text>
                        {category ? (
                            <TouchableOpacity
                                style={styles.resetCategoryBtn}
                                onPress={() => setCategory(undefined)}
                            >
                                <Text style={styles.resetCategoryText}>Tout afficher</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </LinearGradient>

            {/* Catégories */}
            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => {
                        const isSelected = cat.id === 'all' ? !category : category === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryChip,
                                    isSelected && styles.categoryChipActive,
                                ]}
                                onPress={() => setCategory(cat.id === 'all' ? undefined : cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={18}
                                    color={isSelected ? Colors.primary : Colors.gray600}
                                />
                                <Text
                                    style={[
                                        styles.categoryText,
                                        isSelected && styles.categoryTextActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Résultats */}
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
                            />
                        </View>
                    )}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search" size={64} color={Colors.gray300} />
                            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
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
        backgroundColor: '#F2F6FF',
        paddingTop: Spacing.sm,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomLeftRadius: BorderRadius.xxl,
        borderBottomRightRadius: BorderRadius.xxl,
        ...Shadows.md,
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
    headerSubtitle: {
        marginTop: 3,
        fontSize: Typography.fontSize.sm,
        color: Colors.white + 'DD',
        fontWeight: Typography.fontWeight.medium,
    },
    searchContainer: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.white + '7A',
        ...Shadows.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    searchIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent + '30',
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
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
    resultsMetaRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    resultsMetaText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        fontWeight: Typography.fontWeight.semibold,
    },
    resetCategoryBtn: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '10',
    },
    resetCategoryText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    categoriesContainer: {
        backgroundColor: Colors.white,
        marginTop: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        marginRight: Spacing.sm,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary + '12',
        borderColor: Colors.primary + '40',
    },
    categoryText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.gray500,
    },
    categoryTextActive: {
        color: Colors.primary,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    productCard: {
        width: '48%',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.xxxl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    emptyText: {
        fontSize: Typography.fontSize.md,
        color: Colors.gray500,
        marginTop: Spacing.md,
        fontWeight: Typography.fontWeight.semibold,
    },
});
