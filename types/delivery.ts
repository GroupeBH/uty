import { OrderParty, toIdString } from './order';

export type DeliveryStatusValue =
    | 'pending'
    | 'assigned'
    | 'at_pickup'
    | 'picked_up'
    | 'in_transit'
    | 'at_dropoff'
    | 'delivered'
    | 'failed'
    | 'cancelled';

export interface DeliveryGeoPoint {
    type: string;
    coordinates: number[];
}

export interface DeliveryMessage {
    senderId: string | OrderParty;
    senderRole: 'buyer' | 'seller' | 'delivery_person';
    message: string;
    sentAt: string;
}

export interface Delivery {
    _id: string;
    orderId: string;
    buyerId: string | OrderParty;
    sellerId: string | OrderParty;
    deliveryPersonId?: string | { _id?: string; userId?: string | OrderParty } | null;
    status: DeliveryStatusValue;
    pickupLocation: string;
    deliveryLocation: string;
    currentLocation?: DeliveryGeoPoint;
    trackingActive: boolean;
    sellerPickupConfirmed: boolean;
    driverPickupConfirmed: boolean;
    buyerDropoffConfirmed: boolean;
    driverDropoffConfirmed: boolean;
    requestedAt?: string;
    acceptedAt?: string | null;
    startedAt?: string | null;
    arrivedAtPickupAt?: string | null;
    arrivedAtDropoffAt?: string | null;
    deliveredAt?: string | null;
    messages?: DeliveryMessage[];
    createdAt?: string;
    updatedAt?: string;
}

export interface DeliveryTracking {
    id: string;
    status: DeliveryStatusValue;
    trackingActive: boolean;
    currentLocation: DeliveryGeoPoint | null;
    pickupLocation: string;
    deliveryLocation: string;
    sellerPickupConfirmed: boolean;
    driverPickupConfirmed: boolean;
    buyerDropoffConfirmed: boolean;
    driverDropoffConfirmed: boolean;
    acceptedAt: string | null;
    startedAt: string | null;
    arrivedAtPickupAt: string | null;
    arrivedAtDropoffAt: string | null;
    deliveredAt: string | null;
}

export interface RequestDeliveryDto {
    pickupLocation?: string;
    deliveryLocation?: string;
}

export interface RateOrderDto {
    sellerRating?: number;
    deliveryPersonRating?: number;
    comment?: string;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusValue, string> = {
    pending: 'En attente',
    assigned: 'Assignee',
    at_pickup: 'Arrive chez vendeur',
    picked_up: 'Recuperee',
    in_transit: 'En transit',
    at_dropoff: 'Arrive chez acheteur',
    delivered: 'Livree',
    failed: 'Echouee',
    cancelled: 'Annulee',
};

export const DELIVERY_STATUS_STEPS: DeliveryStatusValue[] = [
    'pending',
    'assigned',
    'at_pickup',
    'picked_up',
    'in_transit',
    'at_dropoff',
    'delivered',
];

export const getDeliveryPersonRefId = (
    value: string | { _id?: string; userId?: string | OrderParty } | null | undefined,
): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return toIdString(value);
    return toIdString(value._id || value);
};

export const getDeliveryPersonUserId = (
    value: string | { _id?: string; userId?: string | OrderParty } | null | undefined,
): string | null => {
    if (!value || typeof value === 'string') return null;
    return toIdString(value.userId);
};

export const getDeliveryActorId = (value: string | OrderParty | null | undefined): string | null =>
    toIdString((value as any)?._id ?? value);

