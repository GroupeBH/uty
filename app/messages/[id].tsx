import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingStream } from '@/hooks/useMessagingStream';
import {
    useGetConversationMessagesQuery,
    useGetConversationsQuery,
    useMarkConversationAsReadMutation,
    useSendMessageMutation,
} from '@/store/api/messagingApi';
import { ChatMessage, MessagingUserPreview } from '@/types/messaging';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const formatTime = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const resolveParticipantName = (participant?: MessagingUserPreview): string => {
    if (!participant) return 'Messagerie';
    const firstName = participant.firstName?.trim() || '';
    const lastName = participant.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || participant.username || 'Messagerie';
};

export default function MessageThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const conversationId = id || '';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, isAuthenticated, isLoading: isAuthLoading, requireAuth } = useAuth();
    const currentUserId = user?._id || '';
    const listRef = React.useRef<FlatList<ChatMessage> | null>(null);

    const [composerText, setComposerText] = React.useState('');
    const [localError, setLocalError] = React.useState('');

    const { data: conversations = [] } = useGetConversationsQuery(undefined, {
        skip: !isAuthenticated,
        pollingInterval: 15000,
    });
    const messagesQueryArgs = React.useMemo(
        () => ({ conversationId, limit: 80 }),
        [conversationId],
    );
    const {
        data: messages = [],
        isLoading,
        isFetching,
        refetch: refetchMessages,
    } = useGetConversationMessagesQuery(messagesQueryArgs, {
        skip: !isAuthenticated || !conversationId,
        pollingInterval: 7000,
    });
    const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
    const [markConversationAsRead] = useMarkConversationAsReadMutation();

    const conversation = React.useMemo(
        () => conversations.find((entry) => entry.id === conversationId),
        [conversations, conversationId],
    );
    const counterpart = React.useMemo(() => {
        if (!conversation) return undefined;
        return (
            conversation.otherParticipants[0] ||
            conversation.participants.find((participant) => participant.id !== currentUserId) ||
            conversation.participants[0]
        );
    }, [conversation, currentUserId]);

    const markAsRead = React.useCallback(async () => {
        if (!conversationId || !isAuthenticated) return;
        try {
            await markConversationAsRead(conversationId).unwrap();
        } catch {
            // Silent failure: conversation remains usable even if read marker fails.
        }
    }, [conversationId, isAuthenticated, markConversationAsRead]);

    React.useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            requireAuth('Vous devez etre connecte pour acceder a la messagerie.');
        }
    }, [isAuthenticated, isAuthLoading, requireAuth]);

    React.useEffect(() => {
        if (!conversationId) return;
        if (messages.length === 0) return;
        void markAsRead();
    }, [conversationId, messages.length, markAsRead]);

    React.useEffect(() => {
        if (!conversationId) return;
        const timer = setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: false });
        }, 60);
        return () => clearTimeout(timer);
    }, [conversationId, messages.length]);

    useMessagingStream({
        conversationId,
        enabled: isAuthenticated && Boolean(conversationId),
        onMessage: () => {
            void refetchMessages();
            void markAsRead();
        },
    });

    const handleSend = async () => {
        if (!requireAuth('Vous devez etre connecte pour envoyer un message.')) {
            return;
        }

        const content = composerText.trim();
        if (!content || !conversationId) {
            return;
        }

        setLocalError('');
        try {
            await sendMessage({
                conversationId,
                data: { content },
            }).unwrap();
            setComposerText('');
            await markAsRead();
            await refetchMessages();
        } catch (error: any) {
            const fallback = "Impossible d'envoyer le message.";
            const message =
                (typeof error?.data?.message === 'string' && error.data.message) ||
                (typeof error?.message === 'string' && error.message) ||
                fallback;
            setLocalError(message);
        }
    };

    if (isAuthLoading || (isLoading && !isAuthenticated)) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerAvatarWrap}>
                    {counterpart?.image ? (
                        <Image source={{ uri: counterpart.image }} style={styles.headerAvatarImage} />
                    ) : (
                        <Ionicons name="person" size={18} color={Colors.primary} />
                    )}
                </View>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {resolveParticipantName(counterpart)}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isFetching ? 'Synchronisation...' : 'Messagerie securisee'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <FlatList
                    ref={(node) => {
                        listRef.current = node;
                    }}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => {
                        listRef.current?.scrollToEnd({ animated: true });
                    }}
                    renderItem={({ item }) => {
                        const ownMessage = item.senderId === currentUserId;
                        return (
                            <View
                                style={[
                                    styles.messageRow,
                                    ownMessage ? styles.messageRowOwn : styles.messageRowOther,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.messageBubble,
                                        ownMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messageText,
                                            ownMessage ? styles.messageTextOwn : styles.messageTextOther,
                                        ]}
                                    >
                                        {item.content}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.messageTime,
                                            ownMessage ? styles.messageTimeOwn : styles.messageTimeOther,
                                        ]}
                                    >
                                        {formatTime(item.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.gray400} />
                            <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
                        </View>
                    }
                />

                {localError ? <Text style={styles.errorText}>{localError}</Text> : null}

                <View
                    style={[
                        styles.composerWrap,
                        { paddingBottom: Spacing.sm + Math.max(0, insets.bottom / 2) },
                    ]}
                >
                    <TextInput
                        style={styles.composerInput}
                        placeholder="Ecrire un message..."
                        placeholderTextColor={Colors.gray400}
                        value={composerText}
                        onChangeText={setComposerText}
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!composerText.trim() || isSendingMessage) && styles.sendButtonDisabled,
                        ]}
                        disabled={!composerText.trim() || isSendingMessage}
                        onPress={() => void handleSend()}
                    >
                        <Ionicons
                            name="send"
                            size={18}
                            color={(!composerText.trim() || isSendingMessage) ? Colors.gray400 : Colors.white}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerAvatarWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
        overflow: 'hidden',
    },
    headerAvatarImage: {
        width: '100%',
        height: '100%',
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    messagesList: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    messageRow: {
        flexDirection: 'row',
    },
    messageRowOwn: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '82%',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        ...Shadows.sm,
    },
    messageBubbleOwn: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        borderBottomRightRadius: Spacing.xs,
    },
    messageBubbleOther: {
        backgroundColor: Colors.white,
        borderColor: Colors.gray100,
        borderBottomLeftRadius: Spacing.xs,
    },
    messageText: {
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    messageTextOwn: {
        color: Colors.white,
    },
    messageTextOther: {
        color: Colors.textPrimary,
    },
    messageTime: {
        marginTop: 4,
        fontSize: Typography.fontSize.xs,
    },
    messageTimeOwn: {
        color: Colors.white + 'CC',
        textAlign: 'right',
    },
    messageTimeOther: {
        color: Colors.gray500,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl,
    },
    emptyText: {
        marginTop: Spacing.sm,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
    },
    errorText: {
        color: Colors.error,
        fontSize: Typography.fontSize.xs,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.xs,
    },
    composerWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    composerInput: {
        flex: 1,
        maxHeight: 130,
        minHeight: 42,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },
    sendButtonDisabled: {
        backgroundColor: Colors.gray100,
    },
});
