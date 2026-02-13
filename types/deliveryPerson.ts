export type VehicleType = 'motorcycle' | 'bicycle' | 'car';

export interface DeliveryVehicle {
    model: string;
    licensePlate: string;
    type: VehicleType;
}

export interface BecomeDeliveryPersonRequest {
    vehicle: DeliveryVehicle;
    isAvailable?: boolean;
}

export interface DeliveryPersonLocation {
    type: string;
    coordinates: number[];
}

export interface DeliveryPerson {
    _id: string;
    userId: string;
    vehicle: DeliveryVehicle;
    isAvailable: boolean;
    location?: DeliveryPersonLocation;
    rating?: number;
    totalDeliveries?: number;
    createdAt?: string;
    updatedAt?: string;
}
