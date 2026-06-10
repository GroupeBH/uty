import AsyncStorage from '@react-native-async-storage/async-storage';

export type AddressBookKind = 'pickup' | 'delivery' | 'usual';

export type AddressBookEntry = {
    id: string;
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    kind: AddressBookKind;
    isDefaultPickup?: boolean;
    isDefaultDelivery?: boolean;
    createdAt: string;
    updatedAt: string;
};

const ADDRESS_BOOK_KEY_PREFIX = 'uty_address_book_v1';

const storageKey = (userId?: string | null) =>
    `${ADDRESS_BOOK_KEY_PREFIX}:${userId || 'anonymous'}`;

const normalizeEntry = (entry: unknown): AddressBookEntry | null => {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const address = typeof record.address === 'string' ? record.address.trim() : '';
    if (!id || !label || !address) return null;

    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    const kind =
        record.kind === 'pickup' || record.kind === 'delivery' || record.kind === 'usual'
            ? record.kind
            : 'usual';
    const now = new Date().toISOString();

    return {
        id,
        label,
        address,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        kind,
        isDefaultPickup: record.isDefaultPickup === true,
        isDefaultDelivery: record.isDefaultDelivery === true,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    };
};

const sanitizeEntries = (entries: AddressBookEntry[]): AddressBookEntry[] => {
    let pickupDefaultSeen = false;
    let deliveryDefaultSeen = false;

    return entries.map((entry) => {
        const next = { ...entry };
        if (next.isDefaultPickup) {
            next.isDefaultPickup = !pickupDefaultSeen;
            pickupDefaultSeen = true;
        }
        if (next.isDefaultDelivery) {
            next.isDefaultDelivery = !deliveryDefaultSeen;
            deliveryDefaultSeen = true;
        }
        return next;
    });
};

export const addressBookStorage = {
    async list(userId?: string | null): Promise<AddressBookEntry[]> {
        try {
            const raw = await AsyncStorage.getItem(storageKey(userId));
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return sanitizeEntries(
                parsed
                    .map((entry) => normalizeEntry(entry))
                    .filter((entry): entry is AddressBookEntry => Boolean(entry)),
            );
        } catch {
            return [];
        }
    },

    async saveAll(userId: string | null | undefined, entries: AddressBookEntry[]): Promise<void> {
        await AsyncStorage.setItem(storageKey(userId), JSON.stringify(sanitizeEntries(entries)));
    },

    async upsert(userId: string | null | undefined, entry: AddressBookEntry): Promise<AddressBookEntry[]> {
        const entries = await this.list(userId);
        const existingIndex = entries.findIndex((item) => item.id === entry.id);
        const nextEntries =
            existingIndex >= 0
                ? entries.map((item) => (item.id === entry.id ? entry : item))
                : [entry, ...entries];
        await this.saveAll(userId, nextEntries);
        return nextEntries;
    },

    async remove(userId: string | null | undefined, entryId: string): Promise<AddressBookEntry[]> {
        const entries = await this.list(userId);
        const nextEntries = entries.filter((entry) => entry.id !== entryId);
        await this.saveAll(userId, nextEntries);
        return nextEntries;
    },

    async setDefault(
        userId: string | null | undefined,
        entryId: string,
        target: 'pickup' | 'delivery',
    ): Promise<AddressBookEntry[]> {
        const entries = await this.list(userId);
        const now = new Date().toISOString();
        const nextEntries = entries.map((entry) => ({
            ...entry,
            isDefaultPickup: target === 'pickup' ? entry.id === entryId : entry.isDefaultPickup,
            isDefaultDelivery: target === 'delivery' ? entry.id === entryId : entry.isDefaultDelivery,
            updatedAt: entry.id === entryId ? now : entry.updatedAt,
        }));
        await this.saveAll(userId, nextEntries);
        return nextEntries;
    },
};
