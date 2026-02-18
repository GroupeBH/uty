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

export interface DeliveryRouteWaypoint {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    coordinates?: number[];
}

export interface DeliveryRouteStep {
    instruction?: string;
    htmlInstructions?: string;
    distance?: number;
    distanceMeters?: number;
    duration?: number;
    durationSeconds?: number;
    startLocation?: DeliveryRouteWaypoint;
    endLocation?: DeliveryRouteWaypoint;
    start?: DeliveryRouteWaypoint;
    end?: DeliveryRouteWaypoint;
}

export interface DeliveryCalculatedRoute {
    summary?: string;
    overviewPolyline?: string;
    polyline?: string | { points?: string };
    encodedPolyline?: string;
    coordinates?: (number[] | DeliveryRouteWaypoint)[];
    routeCoordinates?: (number[] | DeliveryRouteWaypoint)[];
    path?: (number[] | DeliveryRouteWaypoint)[];
    steps?: DeliveryRouteStep[];
    routeSteps?: DeliveryRouteStep[];
    legs?: {
        distance?: number;
        duration?: number;
        steps?: DeliveryRouteStep[];
    }[];
    distanceKm?: number;
    distanceMeters?: number;
    durationMin?: number;
    durationSeconds?: number;
}

export interface DeliveryMessage {
    senderId: string | OrderParty;
    senderRole: 'buyer' | 'seller' | 'delivery_person';
    message: string;
    sentAt: string;
}

export interface Delivery {
    _id: string;
    orderId: string | { _id?: string };
    buyerId: string | OrderParty;
    sellerId: string | OrderParty;
    deliveryPersonId?: string | { _id?: string; userId?: string | OrderParty } | null;
    status: DeliveryStatusValue;
    pickupLocation: string;
    deliveryLocation: string;
    pickupCoordinates?: DeliveryGeoPoint | null;
    deliveryCoordinates?: DeliveryGeoPoint | null;
    currentLocation?: DeliveryGeoPoint;
    trackingActive: boolean;
    sellerPickupConfirmed: boolean;
    driverPickupConfirmed: boolean;
    buyerDropoffConfirmed: boolean;
    driverDropoffConfirmed: boolean;
    pickupQrGeneratedAt?: string | null;
    pickupQrExpiresAt?: string | null;
    pickupQrUsedAt?: string | null;
    dropoffQrGeneratedAt?: string | null;
    dropoffQrExpiresAt?: string | null;
    dropoffQrUsedAt?: string | null;
    requestedAt?: string;
    acceptedAt?: string | null;
    startedAt?: string | null;
    arrivedAtPickupAt?: string | null;
    arrivedAtDropoffAt?: string | null;
    deliveredAt?: string | null;
    route?: DeliveryCalculatedRoute | null;
    calculatedRoute?: DeliveryCalculatedRoute | null;
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
    pickupCoordinates?: DeliveryGeoPoint | null;
    deliveryCoordinates?: DeliveryGeoPoint | null;
    sellerPickupConfirmed: boolean;
    driverPickupConfirmed: boolean;
    buyerDropoffConfirmed: boolean;
    driverDropoffConfirmed: boolean;
    pickupQrGeneratedAt?: string | null;
    pickupQrExpiresAt?: string | null;
    pickupQrUsedAt?: string | null;
    dropoffQrGeneratedAt?: string | null;
    dropoffQrExpiresAt?: string | null;
    dropoffQrUsedAt?: string | null;
    acceptedAt: string | null;
    startedAt: string | null;
    arrivedAtPickupAt: string | null;
    arrivedAtDropoffAt: string | null;
    deliveredAt: string | null;
    route?: DeliveryCalculatedRoute | null;
    calculatedRoute?: DeliveryCalculatedRoute | null;
}

export interface RequestDeliveryDto {
    pickupLocation?: string;
    deliveryLocation?: string;
}

export interface DeliveryQrPayload {
    deliveryId: string;
    stage: 'pickup' | 'dropoff';
    status: DeliveryStatusValue;
    expiresAt: string;
    qrPayload: string;
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
