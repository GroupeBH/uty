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
import { useCreateOrderMutation } from '@/store/api/ordersApi';
import { ChatMessage, MessagingUserPreview } from '@/types/messaging';
import { formatCurrencyAmount } from '@/utils/currency';
import {
    DirectOrderProductDraft,
    clearCachedDirectOrderProduct,
    getCachedDirectOrderProduct,
} from '@/utils/directOrderDraft';
import { normalizeTextInputValue } from '@/utils/textInput';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
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

const DEFAULT_DIRECT_ORDER_ADDRESS = 'A confirmer avec le vendeur';

const parseApiError = (error: any, fallback: string): string => {
    const nestedMessage = error?.data?.message;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage;
    if (Array.isArray(nestedMessage) && nestedMessage.length > 0) return nestedMessage.join(', ');
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
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
    const [directOrderProduct, setDirectOrderProduct] = React.useState<DirectOrderProductDraft | null>(null);
    const [showOrderPreview, setShowOrderPreview] = React.useState(false);
    const [orderQuantity, setOrderQuantity] = React.useState(1);
    const [deliveryAddress, setDeliveryAddress] = React.useState(DEFAULT_DIRECT_ORDER_ADDRESS);

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
    const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();

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
    const canShowDirectOrder = Boolean(
        directOrderProduct && (!directOrderProduct.sellerId || directOrderProduct.sellerId !== currentUserId),
    );
    const maxOrderQuantity = directOrderProduct?.availableQuantity;
    const canIncreaseOrderQuantity =
        maxOrderQuantity === undefined || orderQuantity < maxOrderQuantity;
    const directOrderTotal = Number(directOrderProduct?.price || 0) * Math.max(1, orderQuantity);

    React.useEffect(() => {
        let isActive = true;

        setDirectOrderProduct(null);
        setShowOrderPreview(false);
        setOrderQuantity(1);
        setDeliveryAddress(DEFAULT_DIRECT_ORDER_ADDRESS);

        const loadDraft = async () => {
            const draft = await getCachedDirectOrderProduct(conversationId);
            if (!isActive) return;
            setDirectOrderProduct(draft);
            setOrderQuantity(1);
        };

        void loadDraft();
        return () => {
            isActive = false;
        };
    }, [conversationId]);

    React.useEffect(() => {
        if (maxOrderQuantity === undefined) return;
        setOrderQuantity((current) => Math.min(Math.max(current, 1), maxOrderQuantity));
    }, [maxOrderQuantity]);

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

    const decrementOrderQuantity = () => {
        setOrderQuantity((current) => Math.max(1, current - 1));
    };

    const incrementOrderQuantity = () => {
        setOrderQuantity((current) => {
            const next = current + 1;
            return maxOrderQuantity === undefined ? next : Math.min(next, maxOrderQuantity);
        });
    };

    const handleCreateDirectOrder = async () => {
        if (!requireAuth('Vous devez etre connecte pour commander.')) {
            return;
        }

        if (!directOrderProduct || !conversationId) {
            setLocalError('Aucun produit a commander dans cette conversation.');
            return;
        }

        const quantityToOrder = Math.max(1, Math.trunc(orderQuantity));
        if (maxOrderQuantity !== undefined && quantityToOrder > maxOrderQuantity) {
            setLocalError(`Quantite disponible: ${maxOrderQuantity}.`);
            return;
        }

        const address = deliveryAddress.trim() || DEFAULT_DIRECT_ORDER_ADDRESS;
        setLocalError('');

        try {
            const order = await createOrder({
                items: [
                    {
                        productId: directOrderProduct.productId,
                        quantity: quantityToOrder,
                        price: Number(directOrderProduct.price || 0),
                    },
                ],
                deliveryAddress: address,
            }).unwrap();

            try {
                const orderRef = order._id ? ` #${order._id.slice(-8).toUpperCase()}` : '';
                await sendMessage({
                    conversationId,
                    data: {
                        content: `Commande${orderRef} creee pour "${directOrderProduct.name}" (${quantityToOrder}).`,
                    },
                }).unwrap();
                await refetchMessages();
            } catch {
                // Order creation is the source of truth; a chat note is helpful but not required.
            }

            await clearCachedDirectOrderProduct(conversationId);
            setDirectOrderProduct(null);
            setShowOrderPreview(false);
            setOrderQuantity(1);
            setDeliveryAddress(DEFAULT_DIRECT_ORDER_ADDRESS);

            router.push({
                pathname: '/order/[id]',
                params: {
                    id: order._id,
                    view: 'purchases',
                },
            });
        } catch (error: any) {
            setLocalError(parseApiError(error, 'Impossible de creer la commande.'));
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

            {canShowDirectOrder && directOrderProduct ? (
                <View style={styles.directOrderBanner}>
                    {directOrderProduct.image ? (
                        <Image source={{ uri: directOrderProduct.image }} style={styles.directOrderImage} />
                    ) : (
                        <View style={styles.directOrderImagePlaceholder}>
                            <Ionicons name="cube-outline" size={18} color={Colors.primary} />
                        </View>
                    )}
                    <View style={styles.directOrderInfo}>
                        <Text style={styles.directOrderLabel}>Produit a commander</Text>
                        <Text style={styles.directOrderName} numberOfLines={1}>
                            {directOrderProduct.name}
                        </Text>
                        <Text style={styles.directOrderPrice}>
                            {formatCurrencyAmount(directOrderProduct.price, directOrderProduct.currency)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.directOrderButton}
                        onPress={() => setShowOrderPreview(true)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="receipt-outline" size={16} color={Colors.white} />
                        <Text style={styles.directOrderButtonText}>Commander</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

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
                        onChangeText={(text) => setComposerText(normalizeTextInputValue(text))}
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

            <Modal
                animationType="slide"
                transparent
                visible={showOrderPreview && Boolean(directOrderProduct)}
                onRequestClose={() => setShowOrderPreview(false)}
                statusBarTranslucent
            >
                <View style={styles.orderModalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.orderModalKeyboard}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View
                            style={[
                                styles.orderPreviewSheet,
                                { paddingBottom: Spacing.lg + Math.max(insets.bottom, Spacing.xs) },
                            ]}
                        >
                            <View style={styles.orderSheetHeader}>
                                <View>
                                    <Text style={styles.orderSheetTitle}>Previsualiser la commande</Text>
                                    <Text style={styles.orderSheetSubtitle}>
                                        Le vendeur confirmera la suite et le paiement.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.orderSheetCloseButton}
                                    onPress={() => setShowOrderPreview(false)}
                                >
                                    <Ionicons name="close" size={20} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {directOrderProduct ? (
                                <ScrollView
                                    style={styles.orderSheetScroll}
                                    contentContainerStyle={styles.orderSheetContent}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    <View style={styles.orderPreviewProduct}>
                                        {directOrderProduct.image ? (
                                            <Image
                                                source={{ uri: directOrderProduct.image }}
                                                style={styles.orderPreviewImage}
                                            />
                                        ) : (
                                            <View style={styles.orderPreviewImagePlaceholder}>
                                                <Ionicons name="cube-outline" size={24} color={Colors.primary} />
                                            </View>
                                        )}
                                        <View style={styles.orderPreviewInfo}>
                                            <Text style={styles.orderPreviewName} numberOfLines={2}>
                                                {directOrderProduct.name}
                                            </Text>
                                            <Text style={styles.orderPreviewPrice}>
                                                {formatCurrencyAmount(
                                                    directOrderProduct.price,
                                                    directOrderProduct.currency,
                                                )}
                                            </Text>
                                            {maxOrderQuantity !== undefined ? (
                                                <Text style={styles.orderPreviewStock}>
                                                    {maxOrderQuantity} disponible(s)
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    <View style={styles.orderQuantityRow}>
                                        <View>
                                            <Text style={styles.orderFieldLabel}>Quantite</Text>
                                            <Text style={styles.orderFieldHint}>A ajuster avant validation.</Text>
                                        </View>
                                        <View style={styles.orderQuantityControls}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.orderQuantityButton,
                                                    orderQuantity <= 1 && styles.orderQuantityButtonDisabled,
                                                ]}
                                                disabled={orderQuantity <= 1 || isCreatingOrder}
                                                onPress={decrementOrderQuantity}
                                            >
                                                <Ionicons
                                                    name="remove"
                                                    size={17}
                                                    color={orderQuantity <= 1 ? Colors.gray400 : Colors.textPrimary}
                                                />
                                            </TouchableOpacity>
                                            <Text style={styles.orderQuantityValue}>{orderQuantity}</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.orderQuantityButton,
                                                    !canIncreaseOrderQuantity && styles.orderQuantityButtonDisabled,
                                                ]}
                                                disabled={!canIncreaseOrderQuantity || isCreatingOrder}
                                                onPress={incrementOrderQuantity}
                                            >
                                                <Ionicons
                                                    name="add"
                                                    size={17}
                                                    color={!canIncreaseOrderQuantity ? Colors.gray400 : Colors.textPrimary}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.orderAddressBlock}>
                                        <Text style={styles.orderFieldLabel}>Adresse ou consigne</Text>
                                        <TextInput
                                            style={styles.orderAddressInput}
                                            placeholder="Adresse, lieu de rendez-vous ou consigne..."
                                            placeholderTextColor={Colors.gray400}
                                            value={deliveryAddress}
                                            onChangeText={(text) => setDeliveryAddress(normalizeTextInputValue(text))}
                                            multiline
                                            textAlignVertical="top"
                                            maxLength={600}
                                        />
                                    </View>

                                    <View style={styles.orderTotalRow}>
                                        <Text style={styles.orderTotalLabel}>Total estime</Text>
                                        <Text style={styles.orderTotalValue}>
                                            {formatCurrencyAmount(directOrderTotal, directOrderProduct.currency)}
                                        </Text>
                                    </View>
                                </ScrollView>
                            ) : null}

                            <TouchableOpacity
                                style={[
                                    styles.orderSubmitButton,
                                    isCreatingOrder && styles.orderSubmitButtonDisabled,
                                ]}
                                disabled={isCreatingOrder}
                                onPress={() => void handleCreateDirectOrder()}
                                activeOpacity={0.9}
                            >
                                {isCreatingOrder ? (
                                    <ActivityIndicator size="small" color={Colors.white} />
                                ) : (
                                    <Ionicons name="checkmark-circle-outline" size={19} color={Colors.white} />
                                )}
                                <Text style={styles.orderSubmitButtonText}>
                                    {isCreatingOrder ? 'Creation...' : 'Valider la commande'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
    directOrderBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    directOrderImage: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray50,
    },
    directOrderImagePlaceholder: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    directOrderInfo: {
        flex: 1,
        minWidth: 0,
    },
    directOrderLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: Typography.fontWeight.semibold,
    },
    directOrderName: {
        marginTop: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
    },
    directOrderPrice: {
        marginTop: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    directOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        ...Shadows.sm,
    },
    directOrderButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
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
    orderModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(3, 12, 30, 0.64)',
    },
    orderModalKeyboard: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    orderPreviewSheet: {
        maxHeight: '88%',
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xxxl,
        borderTopRightRadius: BorderRadius.xxxl,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    orderSheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    orderSheetTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    orderSheetSubtitle: {
        marginTop: 4,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    orderSheetCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderSheetScroll: {
        flexShrink: 1,
    },
    orderSheetContent: {
        gap: Spacing.md,
        paddingBottom: Spacing.md,
    },
    orderPreviewProduct: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        backgroundColor: Colors.gray50,
    },
    orderPreviewImage: {
        width: 68,
        height: 68,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.white,
    },
    orderPreviewImagePlaceholder: {
        width: 68,
        height: 68,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderPreviewInfo: {
        flex: 1,
        minWidth: 0,
    },
    orderPreviewName: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    orderPreviewPrice: {
        marginTop: 4,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary,
    },
    orderPreviewStock: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    orderQuantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    orderFieldLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    orderFieldHint: {
        marginTop: 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    orderQuantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    orderQuantityButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    orderQuantityButtonDisabled: {
        backgroundColor: Colors.gray100,
    },
    orderQuantityValue: {
        minWidth: 28,
        textAlign: 'center',
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    orderAddressBlock: {
        gap: Spacing.sm,
    },
    orderAddressInput: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.gray50,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 20,
    },
    orderTotalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary + '10',
        padding: Spacing.md,
    },
    orderTotalLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
    },
    orderTotalValue: {
        flexShrink: 0,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.primary,
    },
    orderSubmitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md + 2,
        ...Shadows.md,
    },
    orderSubmitButtonDisabled: {
        opacity: 0.72,
    },
    orderSubmitButtonText: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});
