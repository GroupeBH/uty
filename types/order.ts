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
}

export interface Order {
    _id: string;
    userId: string | OrderParty;
    sellerId: string | OrderParty;
    items: OrderItem[];
    totalAmount: number;
    deliveryAddress: string;
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
    if (!item?.productId || typeof item.productId === 'string') {
        return null;
    }
    return item.productId as Announcement;
};

export const getOrderItemName = (item: OrderItem): string => {
    const product = getOrderItemProduct(item);
    if (product?.name?.trim()) return product.name.trim();
    return 'Produit indisponible';
};

export const getOrderItemImage = (item: OrderItem): string | undefined => {
    const product = getOrderItemProduct(item);
    if (!product?.images?.length) return undefined;
    return product.images[0];
};

export const getNextSellerStatuses = (status: OrderStatusValue): OrderStatusValue[] => {
    if (status === 'pending') return ['confirmed', 'cancelled'];
    return [];
};
