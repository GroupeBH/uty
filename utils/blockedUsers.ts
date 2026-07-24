import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

const STORAGE_KEY = 'uty.blocked-user-ids.v1';
let blockedUserIds = new Set<string>();
let loaded = false;
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const initializeBlockedUsers = async () => {
    if (loaded) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            blockedUserIds = new Set(
                Array.isArray(parsed)
                    ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
                    : [],
            );
        } catch {
            blockedUserIds = new Set();
        } finally {
            loaded = true;
            loadingPromise = null;
            notify();
        }
    })();

    return loadingPromise;
};

export const blockUserLocally = async (userId: string) => {
    const normalized = userId.trim();
    if (!normalized) return;
    await initializeBlockedUsers();
    blockedUserIds = new Set(blockedUserIds).add(normalized);
    notify();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...blockedUserIds]));
};

export const getContentOwnerId = (content: any): string => {
    const candidates = [content?.user, content?.seller, content?.shop?.user];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        if (candidate && typeof candidate === 'object') {
            const id = candidate._id || candidate.id;
            if (typeof id === 'string' && id.trim()) return id.trim();
        }
    }
    return '';
};

export const useBlockedUserIds = () => {
    const [, setRevision] = React.useState(0);

    React.useEffect(() => {
        const listener = () => setRevision((value) => value + 1);
        listeners.add(listener);
        void initializeBlockedUsers();
        return () => {
            listeners.delete(listener);
        };
    }, []);

    return blockedUserIds;
};

