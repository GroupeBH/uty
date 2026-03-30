import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyFavoritesQuery, useToggleLikeMutation } from '@/store/api/announcementsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const normalizeId = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (typeof value._id === 'string') return value._id;
        if (typeof value.id === 'string') return value.id;
    }
    return null;
};

export default function FavoritesScreen() {
    const router = useRouter();
    const { isAuthenticated, user, requireAuth, isLoading: isAuthLoading } = useAuth();
    const [toggleLike, { isLoading: isTogglingLike }] = useToggleLikeMutation();
    const {
        data: favorites = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetMyFavoritesQuery(undefined, {
        skip: !isAuthenticated,
    });

    React.useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) {
            const ok = requireAuth('Connectez-vous pour consulter vos favoris.');
            if (!ok) {
                router.replace('/(tabs)');
            }
        }
    }, [isAuthLoading, isAuthenticated, requireAuth, router]);

    const currentUserId = normalizeId(user);

    const isInWishlist = React.useCallback(
        (announcement: any) => {
            if (!currentUserId) return false;
            const likes = Array.isArray(announcement?.likes) ? announcement.likes : [];
            return likes.some((entry: any) => normalizeId(entry) === currentUserId);
        },
        [currentUserId],
    );

    const onToggleWishlist = React.useCallback(
        async (announcement: any) => {
            if (isTogglingLike) return;
            if (!requireAuth('Connectez-vous pour modifier vos favoris.')) return;
            const id = normalizeId(announcement?._id);
            if (!id) return;

            try {
                await toggleLike(id).unwrap();
            } catch (error) {
                console.error('Toggle favorite error:', error);
            }
        },
        [isTogglingLike, requireAuth, toggleLike],
    );

    if (isAuthLoading || (isLoading && !isFetching)) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mes favoris</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                showsVerticalScrollIndicator={false}
            >
                {favorites.length === 0 ? (
                    <View style={styles.emptyState}>
                        <LinearGradient colors={Gradients.warm} style={styles.emptyIcon}>
                            <Ionicons name="heart-outline" size={42} color={Colors.white} />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
                        <Text style={styles.emptySubtitle}>
                            Ajoutez des annonces en favoris pour les retrouver rapidement ici.
                        </Text>
                        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/search')}>
                            <Text style={styles.ctaText}>Explorer les annonces</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text style={styles.counterText}>{favorites.length} annonce(s) en favoris</Text>
                        {favorites.map((item) => (
                            <ProductCard
                                key={item._id}
                                product={item}
                                onToggleWishlist={onToggleWishlist}
                                isInWishlist={isInWishlist(item)}
                            />
                        ))}
                    </>
                )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.massive,
    },
    counterText: {
        marginBottom: Spacing.md,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    emptyState: {
        marginTop: Spacing.xxxl,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    emptyIcon: {
        width: 82,
        height: 82,
        borderRadius: 41,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    ctaButton: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    ctaText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
});
