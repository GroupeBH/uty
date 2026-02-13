export enum Role {
    User = 'user',
    Admin = 'admin',
    Seller = 'seller',
    Driver = 'driver',
    DeliveryPerson = 'delivery_person',
}

export interface GeoLocation {
    type: string;
    coordinates: number[];
}

export interface User {
    _id: string;
    username: string;
    roles: Role[];
    googleId?: string;
    facebookId?: string;
    email?: string;
    phone?: string;
    verified_phone?: string;
    image?: string;
    provider?: string;
    fcmToken?: string;
    accessToken?: string;
    refreshToken?: string | null;
    token?: string;
    isAdmin: boolean;
    location?: GeoLocation;
    rating?: number;
    createdAt: string;
    updatedAt: string;
}
