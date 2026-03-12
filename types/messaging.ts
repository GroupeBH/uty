export interface MessagingUserPreview {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    image?: string;
}

export interface ConversationLastMessage {
    text: string;
    at: string | null;
    senderId: string | null;
    sender?: MessagingUserPreview | null;
}

export interface Conversation {
    id: string;
    participantIds: string[];
    participants: MessagingUserPreview[];
    otherParticipants: MessagingUserPreview[];
    lastMessage: ConversationLastMessage | null;
    unreadCount: number;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    sender?: MessagingUserPreview | null;
    content: string;
    readBy: string[];
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateConversationDto {
    participantIds: string[];
}

export interface SendMessageDto {
    content: string;
}

export interface MarkConversationReadResponse {
    conversationId: string;
    updatedCount: number;
}

export interface MessagingRealtimeEvent {
    event: string;
    payload: Record<string, unknown>;
    occurredAt: string;
}
