import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetMyAnnouncementsQuery } from '@/store/api/announcementsApi';
import { formatCurrencyAmount } from '@/utils/currency';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SellerAnnouncementsTab() {
    const router = useRouter();
    const { isAuthenticated, isLoading, requireAuth } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Connectez-vous pour gerer vos annonces.');
        }
    }, [isAuthenticated, requireAuth]);

    const { data: announcements = [], isFetching, refetch } = useGetMyAnnouncementsQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (isLoading || !isAuthenticated) {
        return <LoadingSpinner fullScreen />;
    }

    const sortedAnnouncements = [...announcements].sort(
        (a, b) =>
            new Date(b.createdAt || b.updatedAt || 0).getTime() -
            new Date(a.createdAt || a.updatedAt || 0).getTime(),
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Mes annonces</Text>
                <TouchableOpacity style={styles.publishButton} onPress={() => router.push('/publish')}>
                    <Ionicons name="add" size={16} color={Colors.white} />
                    <Text style={styles.publishButtonText}>Publier</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {sortedAnnouncements.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="megaphone-outline" size={24} color={Colors.primary} />
                        <Text style={styles.emptyTitle}>Aucune annonce</Text>
                        <Text style={styles.emptyText}>
                            Publiez votre premiere annonce depuis cet espace.
                        </Text>
                    </View>
                ) : (
                    sortedAnnouncements.map((announcement) => {
                        const image = announcement.images?.[0];
                        return (
                            <TouchableOpacity
                                key={announcement._id}
                                style={styles.card}
                                onPress={() => router.push(`/product/${announcement._id}` as any)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.thumbWrap}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.thumb} />
                                    ) : (
                                        <View style={styles.thumbPlaceholder}>
                                            <Ionicons name="image-outline" size={18} color={Colors.gray400} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>
                                        {announcement.name || 'Annonce'}
                                    </Text>
                                    <Text style={styles.cardPrice}>
                                        {formatCurrencyAmount(announcement.price, announcement.currency)}
                                    </Text>
                                    <Text style={styles.cardMeta}>
                                        {announcement.views || 0} vue(s) • {announcement.likes?.length || 0} like(s)
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
                            </TouchableOpacity>
                        );
                    })
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
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    title: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    publishButton: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        minHeight: 36,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    publishButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    content: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 120,
        gap: Spacing.sm,
    },
    card: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    thumbWrap: {
        width: 62,
        height: 62,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        backgroundColor: Colors.gray100,
    },
    thumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
    },
    cardTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    cardPrice: {
        marginTop: 2,
        color: Colors.accentDark,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cardMeta: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    emptyCard: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: Spacing.sm,
        color: Colors.primary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyText: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
    },
});
