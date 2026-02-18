import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useDeleteNotificationMutation,
    useGetMyNotificationsQuery,
    useMarkAllNotificationsReadMutation,
    useMarkNotificationReadMutation,
} from '@/store/api/notificationsApi';
import { AppNotification } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatRelativeDate = (value?: string) => {
    if (!value) return 'A l instant';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'A l instant';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'A l instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `Il y a ${diffHour} h`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `Il y a ${diffDay} j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const resolveNotificationRoute = (
    notification: AppNotification,
    userRoles?: string[],
): string | null => {
    if (notification.url && notification.url.startsWith('/')) {
        return notification.url;
    }

    const data = notification.data || {};
    if (data.deliveryId) {
        const roleCandidate =
            (typeof data.viewerRole === 'string' && data.viewerRole) ||
            (typeof data.recipientRole === 'string' && data.recipientRole) ||
            (typeof data.role === 'string' && data.role) ||
            '';
        const normalizedRole = roleCandidate.trim().toLowerCase();

        if (['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(normalizedRole)) {
            return `/delivery/deliver-persons/${data.deliveryId}`;
        }
        if (normalizedRole === 'seller') {
            return `/delivery/seller/${data.deliveryId}`;
        }
        if (normalizedRole === 'buyer' || normalizedRole === 'customer') {
            return `/delivery/buyer/${data.deliveryId}`;
        }

        const hasDeliveryRole = Boolean(
            userRoles?.some((role) =>
                ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(
                    (role || '').toLowerCase(),
                ),
            ),
        );
        if (hasDeliveryRole) {
            return `/delivery/deliver-persons/${data.deliveryId}`;
        }

        return `/delivery/${data.deliveryId}`;
    }
    if (data.orderId) {
        return `/order/${data.orderId}`;
    }
    if ((data.type || '').startsWith('delivery_')) {
        return '/orders';
    }
    if ((data.type || '').startsWith('order_')) {
        return '/orders';
    }
    if ((data.type || '').includes('announcement')) {
        return '/my-announcements';
    }
    return null;
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { isAuthenticated, requireAuth } = useAuth();
    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const [isMarkingAll, setIsMarkingAll] = React.useState(false);

    const {
        data: notifications = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetMyNotificationsQuery(
        { limit: 100 },
        { skip: !isAuthenticated },
    );

    const [markNotificationRead] = useMarkNotificationReadMutation();
    const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();

    React.useEffect(() => {
        if (!isAuthenticated) {
            requireAuth('Vous devez etre connecte pour voir vos notifications.');
        }
    }, [isAuthenticated, requireAuth]);

    if (!isAuthenticated && isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    const unreadCount = notifications.filter((item) => !item.isReaded).length;

    const handleOpenNotification = async (item: AppNotification) => {
        if (!item._id) return;
        setProcessingId(item._id);
        try {
            if (!item.isReaded) {
                await markNotificationRead(item._id).unwrap();
            }
            const route = resolveNotificationRoute(item, user?.roles);
            if (route) {
                router.push(route as any);
            }
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteNotification = async (id: string) => {
        if (!id) return;
        setProcessingId(id);
        try {
            await deleteNotification(id).unwrap();
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;
        setIsMarkingAll(true);
        try {
            await markAllNotificationsRead().unwrap();
        } finally {
            setIsMarkingAll(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <Text style={styles.headerSubtitle}>
                        {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est a jour'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.markAllBtn, unreadCount === 0 && styles.markAllBtnDisabled]}
                    onPress={handleMarkAllAsRead}
                    disabled={unreadCount === 0 || isMarkingAll}
                >
                    {isMarkingAll ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Text style={styles.markAllBtnText}>Tout lire</Text>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <View style={styles.emptyWrap}>
                            <LinearGradient colors={Gradients.cool} style={styles.emptyIconWrap}>
                                <Ionicons name="notifications-off-outline" size={26} color={Colors.white} />
                            </LinearGradient>
                            <Text style={styles.emptyTitle}>Aucune notification</Text>
                            <Text style={styles.emptyText}>
                                Les alertes de commandes, livraisons et activites apparaitront ici.
                            </Text>
                        </View>
                    )
                }
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.emptyListContent,
                ]}
                renderItem={({ item }) => {
                    const isBusy = processingId === item._id;
                    const isUnread = !item.isReaded;
                    return (
                        <TouchableOpacity
                            style={[styles.card, isUnread && styles.cardUnread]}
                            onPress={() => void handleOpenNotification(item)}
                            activeOpacity={0.88}
                        >
                            <View style={styles.cardMain}>
                                <View style={[styles.dot, isUnread && styles.dotUnread]} />
                                <View style={styles.cardTextWrap}>
                                    <Text style={styles.cardTitle} numberOfLines={2}>
                                        {item.title || 'Notification'}
                                    </Text>
                                    <Text style={styles.cardBody} numberOfLines={3}>
                                        {item.body || ''}
                                    </Text>
                                    <Text style={styles.cardDate}>{formatRelativeDate(item.createdAt)}</Text>
                                </View>
                            </View>

                            <View style={styles.cardActions}>
                                {isBusy ? (
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color={Colors.gray400}
                                        />
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => void handleDeleteNotification(item._id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
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
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: Spacing.xs,
    },
    headerTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    markAllBtn: {
        minWidth: 84,
        height: 36,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + '55',
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
    },
    markAllBtnDisabled: {
        opacity: 0.45,
    },
    markAllBtnText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    listContent: {
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadows.sm,
    },
    cardUnread: {
        borderColor: Colors.primary + '44',
        backgroundColor: Colors.primary + '08',
    },
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'flex-start',
    },
    dot: {
        marginTop: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.gray300,
    },
    dotUnread: {
        backgroundColor: Colors.primary,
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cardBody: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    cardDate: {
        marginTop: Spacing.xs,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    cardActions: {
        marginLeft: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    deleteBtn: {
        marginTop: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '12',
    },
    emptyWrap: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    emptyText: {
        marginTop: Spacing.sm,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
});
