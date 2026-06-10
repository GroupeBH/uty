import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Gradients, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
    useDeleteNotificationMutation,
    useGetMyNotificationsQuery,
    useMarkAllNotificationsReadMutation,
    useMarkNotificationReadMutation,
} from '@/store/api/notificationsApi';
import { AppNotification } from '@/types/notification';
import { resolveNotificationRoute } from '@/utils/notificationRoute';
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

export default function NotificationsScreen() {
    const router = useRouter();
    const { user, isAuthenticated, requireAuth } = useAuth();
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
    const readCount = Math.max(notifications.length - unreadCount, 0);

    const handleOpenNotification = async (item: AppNotification) => {
        if (!item._id) return;
        setProcessingId(item._id);
        try {
            if (!item.isReaded) {
                await markNotificationRead(item._id).unwrap();
            }
            const route = resolveNotificationRoute({
                url: item.url,
                screen: item.screen,
                title: item.title,
                body: item.body,
                data: item.data,
                userRoles: user?.roles,
            });
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

            <View style={styles.summaryBand}>
                <View style={styles.summaryIconWrap}>
                    <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.summaryCopy}>
                    <Text style={styles.summaryTitle}>
                        {unreadCount > 0 ? 'A traiter' : 'Boite a jour'}
                    </Text>
                    <Text style={styles.summaryText}>
                        {notifications.length} notification(s) - {readCount} lue(s)
                    </Text>
                </View>
                {unreadCount > 0 ? (
                    <View style={styles.unreadPill}>
                        <Text style={styles.unreadPillText}>{unreadCount}</Text>
                    </View>
                ) : (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                )}
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
                                <View style={[styles.notificationIcon, isUnread && styles.notificationIconUnread]}>
                                    <Ionicons
                                        name={isUnread ? 'mail-unread-outline' : 'mail-open-outline'}
                                        size={17}
                                        color={isUnread ? Colors.primary : Colors.gray500}
                                    />
                                </View>
                                <View style={styles.cardTextWrap}>
                                    <View style={styles.cardMetaRow}>
                                        <Text style={styles.cardDate}>{formatRelativeDate(item.createdAt)}</Text>
                                        {isUnread ? (
                                            <View style={styles.newBadge}>
                                                <Text style={styles.newBadgeText}>Nouveau</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.cardTitle} numberOfLines={2}>
                                        {item.title || 'Notification'}
                                    </Text>
                                    <Text style={styles.cardBody} numberOfLines={3}>
                                        {item.body || ''}
                                    </Text>
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
        backgroundColor: '#F4F7FC',
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
        borderRadius: 20,
        backgroundColor: Colors.primary + '08',
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
    summaryBand: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        minHeight: 72,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + '16',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    summaryIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
    },
    summaryCopy: {
        flex: 1,
        minWidth: 0,
    },
    summaryTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
    },
    summaryText: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    unreadPill: {
        minWidth: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.sm,
    },
    unreadPillText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: 120,
        gap: Spacing.sm,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    cardUnread: {
        backgroundColor: Colors.primary + '06',
        borderColor: Colors.primary + '24',
    },
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'flex-start',
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray100,
    },
    notificationIconUnread: {
        backgroundColor: Colors.primary + '12',
    },
    cardTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: 3,
    },
    cardTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cardBody: {
        marginTop: 2,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    cardDate: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    newBadge: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.accent + '28',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    newBadgeText: {
        color: Colors.accentDark,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
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
