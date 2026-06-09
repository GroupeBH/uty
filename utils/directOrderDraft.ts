import AsyncStorage from '@react-native-async-storage/async-storage';

import { Announcement } from '@/types/announcement';

export interface DirectOrderProductDraft {
    conversationId: string;
    productId: string;
    name: string;
    price: number;
    currency?: unknown;
    image?: string;
    availableQuantity?: number;
    sellerId?: string;
    cachedAt: string;
}

const DIRECT_ORDER_PRODUCT_KEY_PREFIX = '@uty/direct-order-product:';

const storageKey = (conversationId: string) => `${DIRECT_ORDER_PRODUCT_KEY_PREFIX}${conversationId}`;

const toIdString = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();

    if (typeof value === 'object') {
        const asObject = value as Record<string, any>;
        const nestedId = asObject._id || asObject.id;
        if (typeof nestedId === 'string') return nestedId.trim();
    }

    const asString = (value as any)?.toString?.();
    return typeof asString === 'string' && asString !== '[object Object]' ? asString.trim() : '';
};

const resolveSellerId = (product: Announcement): string | undefined => {
    const shop = typeof product.shop === 'object' ? product.shop : null;
    const shopOwner = shop && typeof (shop as any).user !== 'string' ? (shop as any).user : (shop as any)?.user;
    const sellerId =
        toIdString(shopOwner) ||
        toIdString(product.seller) ||
        toIdString(product.user);
    return sellerId || undefined;
};

const normalizeDraft = (value: any): DirectOrderProductDraft | null => {
    const conversationId = toIdString(value?.conversationId);
    const productId = toIdString(value?.productId);
    const name = typeof value?.name === 'string' ? value.name.trim() : '';
    const price = Number(value?.price ?? 0);

    if (!conversationId || !productId || !name || !Number.isFinite(price)) {
        return null;
    }

    const availableQuantity = Number(value?.availableQuantity);
    return {
        conversationId,
        productId,
        name,
        price,
        currency: value?.currency,
        image: typeof value?.image === 'string' && value.image.trim() ? value.image.trim() : undefined,
        availableQuantity:
            Number.isFinite(availableQuantity) && availableQuantity > 0
                ? Math.floor(availableQuantity)
                : undefined,
        sellerId: toIdString(value?.sellerId) || undefined,
        cachedAt: typeof value?.cachedAt === 'string' ? value.cachedAt : new Date().toISOString(),
    };
};

export const buildDirectOrderProductDraft = (
    conversationId: string,
    product?: Announcement | null,
): DirectOrderProductDraft | null => {
    if (!conversationId || !product?._id || !product.name?.trim()) {
        return null;
    }

    const price = Number(product.price ?? 0);
    const availableQuantity = Number(product.quantity);
    const draft = normalizeDraft({
        conversationId,
        productId: product._id,
        name: product.name,
        price: Number.isFinite(price) ? price : 0,
        currency: product.currency,
        image: Array.isArray(product.images) ? product.images.find((image) => Boolean(image?.trim())) : undefined,
        availableQuantity:
            Number.isFinite(availableQuantity) && availableQuantity > 0
                ? Math.floor(availableQuantity)
                : undefined,
        sellerId: resolveSellerId(product),
        cachedAt: new Date().toISOString(),
    });

    return draft;
};

export const cacheDirectOrderProduct = async (
    conversationId: string,
    product?: Announcement | null,
): Promise<DirectOrderProductDraft | null> => {
    const draft = buildDirectOrderProductDraft(conversationId, product);
    if (!draft) return null;

    try {
        await AsyncStorage.setItem(storageKey(conversationId), JSON.stringify(draft));
        return draft;
    } catch {
        return null;
    }
};

export const getCachedDirectOrderProduct = async (
    conversationId: string,
): Promise<DirectOrderProductDraft | null> => {
    if (!conversationId) return null;

    try {
        const raw = await AsyncStorage.getItem(storageKey(conversationId));
        if (!raw) return null;
        return normalizeDraft(JSON.parse(raw));
    } catch {
        return null;
    }
};

export const clearCachedDirectOrderProduct = async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    try {
        await AsyncStorage.removeItem(storageKey(conversationId));
    } catch {
        // The order is already created; storage cleanup should not block the user.
    }
};
