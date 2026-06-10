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

export type DeliveryBusinessStatus =
    | 'RECHERCHE_LIVREUR'
    | 'LIVREUR_ASSIGNE'
    | 'EN_ROUTE_VERS_VENDEUR'
    | 'LIVREUR_ARRIVE_CHEZ_VENDEUR'
    | 'COLIS_RECUPERE'
    | 'EN_ROUTE_VERS_CLIENT'
    | 'LIVREUR_ARRIVE_CHEZ_CLIENT'
    | 'LIVRAISON_TERMINEE'
    | 'LIVRAISON_ANNULEE'
    | 'LIVRAISON_ECHOUEE';

export type DeliveryWorkflowActorRole =
    | 'buyer'
    | 'seller'
    | 'delivery_person'
    | 'delivery_person_candidate'
    | 'observer';

export interface DeliveryWorkflowAction {
    key: string;
    actorRole?: DeliveryWorkflowActorRole;
    title: string;
    description: string;
}

export interface DeliveryWorkflowMilestone {
    code: DeliveryBusinessStatus;
    label: string;
    done: boolean;
    current: boolean;
}

export interface DeliveryWorkflow {
    actorRole: DeliveryWorkflowActorRole;
    businessStatus: DeliveryBusinessStatus;
    businessLabel: string;
    currentStepIndex: number;
    totalSteps: number;
    progressPercent: number;
    isTerminal: boolean;
    trackingActive: boolean;
    requiresPickupQr: boolean;
    requiresDropoffQr: boolean;
    milestones: DeliveryWorkflowMilestone[];
    nextAction: DeliveryWorkflowAction;
}

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
    workflow?: DeliveryWorkflow;
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
    workflow?: DeliveryWorkflow;
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
    scheduledPickupAt?: string;
    scheduledDeliveryAt?: string;
    comment?: string;
    deliveryMode?: string;
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
    pending: 'Recherche livreur',
    assigned: 'En route vendeur',
    at_pickup: 'Chez le vendeur',
    picked_up: 'Colis recupere',
    in_transit: 'En route client',
    at_dropoff: 'Chez le client',
    delivered: 'Livraison terminee',
    failed: 'Livraison echouee',
    cancelled: 'Livraison annulee',
};

export const DELIVERY_BUSINESS_STATUS_LABELS: Record<DeliveryBusinessStatus, string> = {
    RECHERCHE_LIVREUR: 'Recherche livreur',
    LIVREUR_ASSIGNE: 'Livreur assigne',
    EN_ROUTE_VERS_VENDEUR: 'En route vers le vendeur',
    LIVREUR_ARRIVE_CHEZ_VENDEUR: 'Livreur arrive chez le vendeur',
    COLIS_RECUPERE: 'Colis recupere',
    EN_ROUTE_VERS_CLIENT: 'En route vers le client',
    LIVREUR_ARRIVE_CHEZ_CLIENT: 'Livreur arrive chez le client',
    LIVRAISON_TERMINEE: 'Livraison terminee',
    LIVRAISON_ANNULEE: 'Livraison annulee',
    LIVRAISON_ECHOUEE: 'Livraison echouee',
};

export const DELIVERY_BUSINESS_STEPS: DeliveryBusinessStatus[] = [
    'RECHERCHE_LIVREUR',
    'LIVREUR_ASSIGNE',
    'EN_ROUTE_VERS_VENDEUR',
    'LIVREUR_ARRIVE_CHEZ_VENDEUR',
    'COLIS_RECUPERE',
    'EN_ROUTE_VERS_CLIENT',
    'LIVREUR_ARRIVE_CHEZ_CLIENT',
    'LIVRAISON_TERMINEE',
];

export const DELIVERY_STATUS_STEPS: DeliveryStatusValue[] = [
    'pending',
    'assigned',
    'at_pickup',
    'picked_up',
    'in_transit',
    'at_dropoff',
    'delivered',
];

export const getDeliveryBusinessStatus = (
    status?: DeliveryStatusValue | string | null,
): DeliveryBusinessStatus => {
    switch (status) {
        case 'pending':
            return 'RECHERCHE_LIVREUR';
        case 'assigned':
            return 'EN_ROUTE_VERS_VENDEUR';
        case 'at_pickup':
            return 'LIVREUR_ARRIVE_CHEZ_VENDEUR';
        case 'picked_up':
            return 'COLIS_RECUPERE';
        case 'in_transit':
            return 'EN_ROUTE_VERS_CLIENT';
        case 'at_dropoff':
            return 'LIVREUR_ARRIVE_CHEZ_CLIENT';
        case 'delivered':
            return 'LIVRAISON_TERMINEE';
        case 'cancelled':
            return 'LIVRAISON_ANNULEE';
        case 'failed':
            return 'LIVRAISON_ECHOUEE';
        default:
            return 'RECHERCHE_LIVREUR';
    }
};

export const getDeliveryBusinessLabel = (
    status?: DeliveryStatusValue | string | null,
    workflow?: DeliveryWorkflow,
): string => {
    if (workflow?.businessLabel) {
        return workflow.businessLabel;
    }

    return DELIVERY_BUSINESS_STATUS_LABELS[getDeliveryBusinessStatus(status)];
};

export const getDeliveryWorkflowProgress = (
    status?: DeliveryStatusValue | string | null,
    workflow?: DeliveryWorkflow,
): { currentStepIndex: number; totalSteps: number; progressPercent: number } => {
    if (workflow) {
        return {
            currentStepIndex: workflow.currentStepIndex,
            totalSteps: workflow.totalSteps,
            progressPercent: workflow.progressPercent,
        };
    }

    const businessStatus = getDeliveryBusinessStatus(status);
    const currentStepIndex = Math.max(DELIVERY_BUSINESS_STEPS.indexOf(businessStatus), 0);
    const totalSteps = DELIVERY_BUSINESS_STEPS.length;
    return {
        currentStepIndex,
        totalSteps,
        progressPercent: Math.round((currentStepIndex / (totalSteps - 1)) * 100),
    };
};

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
