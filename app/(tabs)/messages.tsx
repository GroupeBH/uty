import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useGetConversationsQuery } from '@/store/api/messagingApi';
import { Conversation, MessagingUserPreview } from '@/types/messaging';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatConversationDate = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
    if (sameDay) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const resolveParticipantName = (participant?: MessagingUserPreview): string => {
    if (!participant) return 'Conversation';
    const firstName = participant.firstName?.trim() || '';
    const lastName = participant.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || participant.username || 'Conversation';
};

const resolveConversationTitle = (conversation: Conversation): string => {
    const primary = conversation.otherParticipants[0] || conversation.participants[0];
    return resolveParticipantName(primary);
};

const resolveConversationSubtitle = (conversation: Conversation): string => {
    const lastText = conversation.lastMessage?.text?.trim();
    if (lastText) {
        return lastText;
    }
    return 'Demarrez la conversation';
};

export default function MessagesListScreen() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading, requireAuth } = useAuth();
    const {
        data: conversations = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetConversationsQuery(undefined, {
        skip: !isAuthenticated,
        pollingInterval: 15000,
    });

    React.useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            requireAuth('Vous devez etre connecte pour acceder a vos messages.');
        }
    }, [isAuthenticated, isAuthLoading, requireAuth]);

    if (isAuthLoading || (isLoading && !isAuthenticated)) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Messagerie</Text>
                    <Text style={styles.headerSubtitle}>
                        {conversations.length > 0
                            ? `${conversations.length} conversation(s)`
                            : 'Aucune conversation'}
                    </Text>
                </View>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => void refetch()}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={[
                    styles.listContent,
                    conversations.length === 0 && styles.emptyListContent,
                ]}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons name="chatbubbles-outline" size={36} color={Colors.gray400} />
                        <Text style={styles.emptyTitle}>Pas encore de messages</Text>
                        <Text style={styles.emptySubtitle}>
                            Contactez un vendeur depuis une annonce pour demarrer.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const primary = item.otherParticipants[0] || item.participants[0];
                    const previewDate = item.lastMessage?.at || item.updatedAt || item.createdAt;
                    const unreadCount = Math.max(0, Number(item.unreadCount || 0));

                    return (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/messages/${item.id}` as any)}
                        >
                            <View style={styles.avatarWrap}>
                                {primary?.image ? (
                                    <Image source={{ uri: primary.image }} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person" size={20} color={Colors.primary} />
                                )}
                            </View>

                            <View style={styles.cardTextWrap}>
                                <View style={styles.cardTopRow}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>
                                        {resolveConversationTitle(item)}
                                    </Text>
                                    <Text style={styles.cardDate}>{formatConversationDate(previewDate)}</Text>
                                </View>
                                <Text style={styles.cardSubtitle} numberOfLines={2}>
                                    {resolveConversationSubtitle(item)}
                                </Text>
                            </View>

                            <View style={styles.cardAside}>
                                {unreadCount > 0 ? (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{unreadCount}</Text>
                                    </View>
                                ) : (
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color={Colors.gray400}
                                    />
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
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
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
        borderColor: Colors.gray100,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    cardTextWrap: {
        flex: 1,
        gap: 2,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    cardTitle: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    cardDate: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    cardSubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    cardAside: {
        minWidth: 28,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    emptySubtitle: {
        marginTop: Spacing.sm,
        textAlign: 'center',
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
});
