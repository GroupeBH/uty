import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useStyledAlert } from '@/components/ui/useStyledAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    SellerBlock,
    useGetMyBlockedSellersQuery,
    useUnblockSellerMutation,
} from '@/store/api/announcementsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const normalizeId = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
        const source = value as Record<string, any>;
        if (typeof source._id === 'string') return source._id;
        if (typeof source.id === 'string') return source.id;
    }
    return '';
};

const getSellerName = (block: SellerBlock): string => {
    const seller = typeof block.seller === 'object' ? block.seller : null;
    const firstName = typeof seller?.firstName === 'string' ? seller.firstName.trim() : '';
    const lastName = typeof seller?.lastName === 'string' ? seller.lastName.trim() : '';
    const username = typeof seller?.username === 'string' ? seller.username.trim() : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || username || 'Vendeur inconnu';
};

const getSellerMeta = (block: SellerBlock): string => {
    const seller = typeof block.seller === 'object' ? block.seller : null;
    const phone =
        typeof seller?.verified_phone === 'string'
            ? seller.verified_phone
            : typeof seller?.phone === 'string'
              ? seller.phone
              : '';
    if (phone.trim()) return phone.trim();
    if (typeof block.reason === 'string' && block.reason.trim()) return `Motif: ${block.reason.trim()}`;
    return 'Bloque sur votre compte';
};

const getSellerImage = (block: SellerBlock): string => {
    const seller = typeof block.seller === 'object' ? block.seller : null;
    return typeof seller?.image === 'string' ? seller.image.trim() : '';
};

const formatDate = (value?: string): string => {
    if (!value) return '';
    try {
        return new Date(value).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '';
    }
};

export default function BlockedSellersScreen() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading, requireAuth } = useAuth();
    const { showAlert: showStyledAlert, alertNode } = useStyledAlert();
    const {
        data: blockedSellers = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetMyBlockedSellersQuery(undefined, {
        skip: !isAuthenticated,
    });
    const [unblockSeller, { isLoading: isUnblocking }] = useUnblockSellerMutation();
    const [unblockingSellerId, setUnblockingSellerId] = React.useState('');

    React.useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) {
            const ok = requireAuth('Connectez-vous pour gerer vos vendeurs bloques.');
            if (!ok) {
                router.replace('/(tabs)');
            }
        }
    }, [isAuthLoading, isAuthenticated, requireAuth, router]);

    const confirmUnblock = React.useCallback(
        (block: SellerBlock) => {
            const sellerId = normalizeId(block.seller);
            if (!sellerId) {
                showStyledAlert('Erreur', 'Vendeur introuvable.', undefined, 'error');
                return;
            }

            showStyledAlert(
                'Debloquer le vendeur',
                `${getSellerName(block)} pourra de nouveau apparaitre dans vos annonces et conversations.`,
                [
                    { text: 'Annuler', style: 'cancel' },
                    {
                        text: 'Debloquer',
                        onPress: async () => {
                            setUnblockingSellerId(sellerId);
                            try {
                                await unblockSeller(sellerId).unwrap();
                                showStyledAlert(
                                    'Vendeur debloque',
                                    'Ce vendeur peut de nouveau apparaitre dans votre experience.',
                                    undefined,
                                    'success',
                                );
                            } catch (error: any) {
                                const message =
                                    typeof error?.data?.message === 'string'
                                        ? error.data.message
                                        : 'Impossible de debloquer ce vendeur.';
                                showStyledAlert('Erreur', message, undefined, 'error');
                            } finally {
                                setUnblockingSellerId('');
                            }
                        },
                    },
                ],
                'warning',
            );
        },
        [showStyledAlert, unblockSeller],
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
                <Text style={styles.headerTitle}>Vendeurs bloques</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.summary}>
                    <LinearGradient colors={Gradients.primary} style={styles.summaryIcon}>
                        <Ionicons name="shield-checkmark-outline" size={26} color={Colors.white} />
                    </LinearGradient>
                    <View style={styles.summaryTextWrap}>
                        <Text style={styles.summaryTitle}>Votre espace reste filtre</Text>
                        <Text style={styles.summarySubtitle}>
                            Les annonces et conversations liees aux vendeurs bloques sont masquees.
                        </Text>
                    </View>
                </View>

                {blockedSellers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <LinearGradient colors={Gradients.cool} style={styles.emptyIcon}>
                            <Ionicons name="shield-outline" size={40} color={Colors.white} />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>Aucun vendeur bloque</Text>
                        <Text style={styles.emptySubtitle}>
                            Les vendeurs bloques depuis une annonce apparaitront ici.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {blockedSellers.map((block) => {
                            const sellerId = normalizeId(block.seller);
                            const image = getSellerImage(block);
                            const blockedAt = formatDate(block.blockedAt);
                            const isCurrentUnblock = isUnblocking && unblockingSellerId === sellerId;

                            return (
                                <View key={block.id || sellerId} style={styles.blockedItem}>
                                    <View style={styles.avatar}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={styles.avatarImage} />
                                        ) : (
                                            <Ionicons name="person-outline" size={24} color={Colors.primary} />
                                        )}
                                    </View>
                                    <View style={styles.blockedInfo}>
                                        <Text style={styles.blockedName}>{getSellerName(block)}</Text>
                                        <Text style={styles.blockedMeta}>{getSellerMeta(block)}</Text>
                                        {blockedAt ? (
                                            <Text style={styles.blockedDate}>Bloque le {blockedAt}</Text>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.unblockButton}
                                        onPress={() => confirmUnblock(block)}
                                        disabled={isUnblocking}
                                        activeOpacity={0.8}
                                    >
                                        {isCurrentUnblock ? (
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        ) : (
                                            <Text style={styles.unblockText}>Debloquer</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
            {alertNode}
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
    summary: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '14',
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.sm,
    },
    summaryIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryTextWrap: {
        flex: 1,
    },
    summaryTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    summarySubtitle: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    emptyState: {
        marginTop: Spacing.xl,
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
    list: {
        gap: Spacing.md,
    },
    blockedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.primary + '10',
        borderWidth: 1,
        borderColor: Colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    blockedInfo: {
        flex: 1,
        minWidth: 0,
    },
    blockedName: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    blockedMeta: {
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    blockedDate: {
        marginTop: 3,
        fontSize: Typography.fontSize.xs,
        color: Colors.textLight,
    },
    unblockButton: {
        minWidth: 86,
        minHeight: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        backgroundColor: Colors.primary + '08',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },
    unblockText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
});
