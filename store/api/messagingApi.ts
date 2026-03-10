import {
    ChatMessage,
    Conversation,
    CreateConversationDto,
    MarkConversationReadResponse,
    SendMessageDto,
} from '@/types/messaging';
import { baseApi } from './baseApi';

export type GetMessagesParams = {
    conversationId: string;
    limit?: number;
    before?: string;
};

const buildMessagesQuery = ({ conversationId, limit, before }: GetMessagesParams): string => {
    const params: string[] = [];
    if (typeof limit === 'number' && Number.isFinite(limit)) {
        params.push(`limit=${encodeURIComponent(String(Math.trunc(limit)))}`);
    }
    if (before) {
        params.push(`before=${encodeURIComponent(before)}`);
    }

    const query = params.join('&');
    return query
        ? `/messaging/conversations/${conversationId}/messages?${query}`
        : `/messaging/conversations/${conversationId}/messages`;
};

export const messagingApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        createConversation: builder.mutation<Conversation, CreateConversationDto>({
            query: (body) => ({
                url: '/messaging/conversations',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Messaging'],
        }),
        getConversations: builder.query<Conversation[], void>({
            query: () => '/messaging/conversations',
            providesTags: (result) =>
                result
                    ? [
                          'Messaging',
                          ...result.map((conversation) => ({
                              type: 'Messaging' as const,
                              id: conversation.id,
                          })),
                      ]
                    : ['Messaging'],
        }),
        getConversationMessages: builder.query<ChatMessage[], GetMessagesParams>({
            query: (params) => buildMessagesQuery(params),
            providesTags: (result, _error, { conversationId }) => [
                { type: 'Messaging', id: conversationId },
            ],
        }),
        sendMessage: builder.mutation<ChatMessage, { conversationId: string; data: SendMessageDto }>({
            query: ({ conversationId, data }) => ({
                url: `/messaging/conversations/${conversationId}/messages`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { conversationId }) => [
                'Messaging',
                { type: 'Messaging', id: conversationId },
            ],
        }),
        markConversationAsRead: builder.mutation<MarkConversationReadResponse, string>({
            query: (conversationId) => ({
                url: `/messaging/conversations/${conversationId}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: (_result, _error, conversationId) => [
                'Messaging',
                { type: 'Messaging', id: conversationId },
            ],
        }),
    }),
});

export const {
    useCreateConversationMutation,
    useGetConversationsQuery,
    useGetConversationMessagesQuery,
    useSendMessageMutation,
    useMarkConversationAsReadMutation,
} = messagingApi;
