import { tokenService } from '@/services/tokenService';
import { API_BASE_URL } from '@/store/api/baseApi';
import { MessagingRealtimeEvent } from '@/types/messaging';
import React from 'react';

export type MessagingStreamState = 'idle' | 'connecting' | 'connected' | 'error';

export type MessagingStreamMessage = {
    event: string;
    data: MessagingRealtimeEvent | string | null;
    rawData: string;
    receivedAt: number;
};

type UseMessagingStreamOptions = {
    conversationId?: string;
    enabled?: boolean;
    reconnectDelayMs?: number;
    onMessage?: (message: MessagingStreamMessage) => void;
    onError?: (message: string) => void;
};

const STREAM_CONNECT_TIMEOUT_MS = 12000;

const parseJson = (value: string): MessagingRealtimeEvent | string | null => {
    const normalized = value.trim();
    if (!normalized) return null;

    try {
        return JSON.parse(normalized) as MessagingRealtimeEvent;
    } catch {
        return normalized;
    }
};

const parseSseEventBlock = (block: string): MessagingStreamMessage | null => {
    const lines = block
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);

    if (lines.length === 0) return null;

    let eventName = 'message';
    const dataLines: string[] = [];

    lines.forEach((line) => {
        if (line.startsWith(':')) return;

        const separator = line.indexOf(':');
        if (separator <= 0) return;

        const field = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1);
        const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

        if (field === 'event' && value.trim()) {
            eventName = value.trim();
        }
        if (field === 'data') {
            dataLines.push(value);
        }
    });

    if (dataLines.length === 0) return null;

    const rawData = dataLines.join('\n');
    return {
        event: eventName,
        data: parseJson(rawData),
        rawData,
        receivedAt: Date.now(),
    };
};

export const useMessagingStream = ({
    conversationId,
    enabled = true,
    reconnectDelayMs = 2500,
    onMessage,
    onError,
}: UseMessagingStreamOptions) => {
    const [connectionState, setConnectionState] = React.useState<MessagingStreamState>('idle');
    const [lastMessage, setLastMessage] = React.useState<MessagingStreamMessage | null>(null);
    const [connectNonce, setConnectNonce] = React.useState(0);

    const onMessageRef = React.useRef(onMessage);
    const onErrorRef = React.useRef(onError);
    const requestIdRef = React.useRef(0);

    React.useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    React.useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const reconnect = React.useCallback(() => {
        setConnectNonce((value) => value + 1);
    }, []);

    React.useEffect(() => {
        if (!enabled || !conversationId) {
            setConnectionState('idle');
            return;
        }

        let isActive = true;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let xhr: XMLHttpRequest | null = null;
        let responseCursor = 0;
        let responseBuffer = '';

        const clearReconnectTimer = () => {
            if (!reconnectTimer) return;
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        };

        const disposeXhr = () => {
            if (!xhr) return;
            xhr.onreadystatechange = null;
            xhr.onerror = null;
            xhr.abort();
            xhr = null;
        };

        const emitConnectionError = (message: string) => {
            setConnectionState('error');
            onErrorRef.current?.(message);
        };

        const scheduleReconnect = (message?: string) => {
            if (!isActive || requestIdRef.current !== requestId) return;
            disposeXhr();
            clearReconnectTimer();
            if (message) {
                emitConnectionError(message);
            } else {
                setConnectionState('connecting');
            }

            reconnectTimer = setTimeout(() => {
                if (!isActive || requestIdRef.current !== requestId) return;
                setConnectNonce((value) => value + 1);
            }, reconnectDelayMs);
        };

        const processBuffer = () => {
            const normalized = responseBuffer.replace(/\r\n/g, '\n');
            responseBuffer = normalized;

            let separatorIndex = responseBuffer.indexOf('\n\n');
            while (separatorIndex !== -1) {
                const block = responseBuffer.slice(0, separatorIndex).trim();
                responseBuffer = responseBuffer.slice(separatorIndex + 2);
                separatorIndex = responseBuffer.indexOf('\n\n');

                if (!block) continue;
                const parsed = parseSseEventBlock(block);
                if (!parsed) continue;

                setConnectionState('connected');
                setLastMessage(parsed);
                onMessageRef.current?.(parsed);
            }
        };

        const connect = async () => {
            setConnectionState('connecting');
            const token = await tokenService.getAccessToken();

            if (!isActive || requestIdRef.current !== requestId) return;
            if (!token) {
                emitConnectionError('Session requise pour la messagerie.');
                return;
            }

            xhr = new XMLHttpRequest();
            responseCursor = 0;
            responseBuffer = '';

            const streamUrl = `${API_BASE_URL}/messaging/conversations/${conversationId}/stream`;
            xhr.open('GET', streamUrl, true);
            xhr.timeout = STREAM_CONNECT_TIMEOUT_MS;
            xhr.setRequestHeader('Accept', 'text/event-stream');
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.onreadystatechange = () => {
                if (!xhr || !isActive || requestIdRef.current !== requestId) return;

                if (xhr.readyState === 2 && xhr.status && xhr.status !== 200) {
                    const status = xhr.status;
                    if (status === 401 || status === 403) {
                        emitConnectionError('Session expiree. Reconnectez-vous.');
                        disposeXhr();
                        return;
                    }
                }

                if (xhr.readyState === 3 || xhr.readyState === 4) {
                    const incoming = xhr.responseText.slice(responseCursor);
                    responseCursor = xhr.responseText.length;
                    if (incoming) {
                        responseBuffer += incoming;
                        processBuffer();
                    }
                }

                if (xhr.readyState === 4) {
                    if (!isActive || requestIdRef.current !== requestId) return;
                    if (xhr.status === 200) {
                        scheduleReconnect();
                        return;
                    }

                    if (xhr.status === 401 || xhr.status === 403) {
                        emitConnectionError('Session expiree. Reconnectez-vous.');
                        return;
                    }

                    scheduleReconnect('Connexion messagerie interrompue. Reconnexion...');
                }
            };

            xhr.onerror = () => {
                if (!isActive || requestIdRef.current !== requestId) return;
                scheduleReconnect('Connexion messagerie interrompue. Reconnexion...');
            };

            xhr.ontimeout = () => {
                if (!isActive || requestIdRef.current !== requestId) return;
                scheduleReconnect('Connexion messagerie lente. Reconnexion...');
            };

            xhr.send();
        };

        void connect();

        return () => {
            isActive = false;
            clearReconnectTimer();
            disposeXhr();
        };
    }, [connectNonce, conversationId, enabled, reconnectDelayMs]);

    return {
        connectionState,
        isConnected: connectionState === 'connected',
        lastMessage,
        reconnect,
    };
};
