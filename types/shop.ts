import { User } from './user';

export interface ShopLocation {
    type: string;
    coordinates: number[];
    address?: string;
}

export interface Shop {
    _id: string;
    user: string | User;
    name: string;
    description?: string;
    logo?: string;
    ownerIdCard?: string;
    subscription?: string;
    ratings?: number[];
    followers?: string[];
    location?: ShopLocation;
    idnat?: string;
    rccm?: string;
    nif?: string;
    isCorporate?: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
