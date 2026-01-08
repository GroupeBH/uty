/**
 * Page de recherche de produits
 */

import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGetAnnouncementsQuery } from '@/store/api/announcementsApi';
import { Announcement } from '@/types/announcement';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState<string | undefined>();

    // Using getAll for now, backend search params integration might be needed later
    // For now we filter client side or just fetch all
    const { data: announcements, isLoading } = useGetAnnouncementsQuery();

    const filteredData = announcements?.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = category ? (typeof item.category === 'string' ? item.category === category : item.category?._id === category) : true;
        // Note: category filtering needs real IDs from backend to match robustly, using simple check for now
        return matchesSearch;
    });


    const categories = [
        { id: 'all', label: 'Tout', icon: 'apps' },
        { id: 'electronics', label: 'Électronique', icon: 'laptop' },
        { id: 'fashion', label: 'Mode', icon: 'shirt' },
        { id: 'home', label: 'Maison', icon: 'home' },
        { id: 'sports', label: 'Sports', icon: 'basketball' },
    ];

    const handleAddToCart = (product: Announcement) => {
        console.log('Add to cart:', product._id);
    };

    const handleToggleWishlist = (product: Announcement) => {
        console.log('Toggle wishlist:', product._id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.gray400} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un produit..."
                        placeholderTextColor={Colors.gray400}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={Colors.gray400} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Catégories */}
            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                category === cat.id && styles.categoryChipActive,
                            ]}
                            onPress={() => setCategory(cat.id === 'all' ? undefined : cat.id)}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={18}
                                color={category === cat.id ? Colors.primary : Colors.gray600}
                            />
                            <Text
                                style={[
                                    styles.categoryText,
                                    category === cat.id && styles.categoryTextActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
        backgroundColor: Colors.white,
    },
    searchContainer: {
        padding: Spacing.xl,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.md,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.medium,
    },
    categoriesContainer: {
        backgroundColor: Colors.white,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray50,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        marginRight: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryChipActive: {
        backgroundColor: Colors.accent + '20',
        borderColor: Colors.accent,
    },
    categoryText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.gray500,
    },
    categoryTextActive: {
        color: Colors.primary,
    },
    listContent: {
        padding: Spacing.xl,
        paddingBottom: 100, // Espace pour la tab bar flottante
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    productCard: {
        width: '48%',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.massive,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        color: Colors.gray400,
        marginTop: Spacing.xl,
        fontWeight: Typography.fontWeight.medium,
    },
});
