import { Announcement } from './announcement';

export type OrderStatusValue =
    | 'pending'
    | 'confirmed'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export interface OrderParty {
    _id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}

export interface OrderItem {
    productId: string | Announcement | null;
    quantity: number;
    price: number;
    product?: Announcement | null;
    announcement?: Announcement | null;
    productSnapshot?: {
        _id?: string;
        id?: string;
        name?: string;
        title?: string;
        image?: string;
        imageUrl?: string;
        images?: string[];
        currency?: string;
    } | null;
    name?: string;
    title?: string;
    productName?: string;
    productTitle?: string;
    announcementName?: string;
    image?: string;
    imageUrl?: string;
    productImage?: string;
    currency?: string;
}

export interface OrderGeoPoint {
    type: string;
    coordinates: number[];
}

export interface Order {
    _id: string;
    userId: string | OrderParty;
    sellerId: string | OrderParty;
    items: OrderItem[];
    totalAmount: number;
    deliveryAddress: string;
    deliveryLocation?: OrderGeoPoint | null;
    status: OrderStatusValue;
    deliveryPersonId?: string | Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
    pending: 'En attente',
    confirmed: 'Confirmee',
    shipped: 'Expediee',
    delivered: 'Livree',
    cancelled: 'Annulee',
};

export const ORDER_STATUS_VALUES: OrderStatusValue[] = [
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
];

export interface CreateOrderRequest {
    items: {
        productId: string;
        quantity: number;
    }[];
    deliveryAddress: string;
}

export const toIdString = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === 'object') {
        const asObj = value as any;
        if (asObj?._id) return toIdString(asObj._id);
        if (asObj?.id) return toIdString(asObj.id);
    }

    const asString = (value as any)?.toString?.();
    if (typeof asString === 'string' && asString !== '[object Object]') {
        return asString;
    }

    return null;
};

export const getOrderPartyId = (party: string | OrderParty | undefined | null): string | null =>
    toIdString((party as any)?._id ?? party);

export const getOrderPartyName = (
    party: string | OrderParty | undefined | null,
    fallback: string,
): string => {
    if (!party || typeof party === 'string') return fallback;

    const firstName = party.firstName?.trim();
    const lastName = party.lastName?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;

    if (party.username?.trim()) return party.username.trim();
    if (party.email?.trim()) return party.email.trim();
    if (party.phone?.trim()) return party.phone.trim();

    return fallback;
};

export const getOrderItemProduct = (item: OrderItem): Announcement | null => {
    const candidates = [
        item?.productId,
        item?.product,
        item?.announcement,
        item?.productSnapshot,
    ];

    for (const candidate of candidates) {
        if (!candidate || typeof candidate === 'string') continue;
        return candidate as Announcement;
    }

    return null;
};

export const getOrderItemName = (item: OrderItem): string => {
    const directNames = [
        item?.name,
        item?.title,
        item?.productName,
        item?.productTitle,
        item?.announcementName,
        item?.productSnapshot?.name,
        item?.productSnapshot?.title,
    ];
    for (const candidate of directNames) {
        const normalized = (candidate || '').trim();
        if (normalized) return normalized;
    }

    const product = getOrderItemProduct(item);
    if (product?.name?.trim()) return product.name.trim();

    if (typeof item?.productId === 'string' && item.productId.trim()) {
        return `Article #${item.productId.slice(-6).toUpperCase()}`;
    }

    return 'Article';
};

export const getOrderItemImage = (item: OrderItem): string | undefined => {
    const product = getOrderItemProduct(item);
    if (product?.images?.length) return product.images[0];

    const fallbackImageCandidates = [
        item?.image,
        item?.imageUrl,
        item?.productImage,
        item?.productSnapshot?.image,
        item?.productSnapshot?.imageUrl,
    ];
    for (const candidate of fallbackImageCandidates) {
        const normalized = (candidate || '').trim();
        if (normalized) return normalized;
    }

    if (item?.productSnapshot?.images?.length) {
        return item.productSnapshot.images[0];
    }

    return undefined;
};

export const getOrderItemCurrency = (item: OrderItem): string | undefined => {
    const product = getOrderItemProduct(item);
    const candidates = [
        item?.currency,
        item?.productSnapshot?.currency,
        product?.currency,
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;

        if (typeof candidate === 'string') {
            const normalized = candidate.trim();
            if (normalized) return normalized;
            continue;
        }

        if (typeof candidate === 'object') {
            const asRecord = candidate as Record<string, any>;
            const code = typeof asRecord.code === 'string' ? asRecord.code.trim() : '';
            if (code) return code;

            const symbol = typeof asRecord.symbol === 'string' ? asRecord.symbol.trim() : '';
            if (symbol) return symbol;

            const id =
                typeof asRecord._id === 'string'
                    ? asRecord._id.trim()
                    : typeof asRecord.id === 'string'
                        ? asRecord.id.trim()
                        : '';
            if (id) return id;
        }
    }

    return undefined;
};

export const getNextSellerStatuses = (status: OrderStatusValue): OrderStatusValue[] => {
    if (status === 'pending') return ['confirmed', 'cancelled'];
    return [];
};
