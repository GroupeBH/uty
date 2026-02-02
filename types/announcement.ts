import { Shop, User } from './index';

export interface PriceRange {
    minimum: number;
    maximum: number;
}

export interface WeightRange {
    valueMin: number;
    valueMax: number;
}

export interface Announcement {
    _id: string;
    seller?: string;
    shop?: string | Shop;
    user: string | User;
    category: string | any;
    type?: string;
    brand?: string;
    subcategory?: string | any;
    name: string;
    description?: string;
    price?: number;
    quantity?: number;
    priceRange?: PriceRange;
    rentPrice?: number;
    currency?: string | any;
    images?: string[];
    location?: string[];
    address?: string[];
    views: number;
    likes?: User[];
    weightRange?: WeightRange;
    offer_type?: string;
    condition?: string;

    // real estate
    area?: string;
    rooms?: string;
    rent?: string;
    isRent?: string;

    // service
    availability?: string;
    service_area?: string;
    payment_frequency?: string;

    // mode
    size?: string;
    color?: string;

    // auto
    gearbox?: string;
    fuel?: string;
    year?: string;
    mileage?: string;
    autoModel?: string;

    isSold?: boolean;
    categoryAncestors?: string[];
    attributes?: Record<string, any>;
    specifications?: Record<string, any>;
    comments?: any[];

    createdAt: string;
    updatedAt: string;
}

export interface CreateAnnouncementDto {
    seller?: string;
    shop?: string;
    category: string;
    type?: string;
    brand?: string;
    subcategory?: string;
    name: string;
    description?: string;
    price?: number;
    quantity?: number;
    priceRange?: PriceRange;
    rentPrice?: number;
    currency?: string;
    images?: string[];
    location?: string[];
    address?: string[];
    weightRange?: WeightRange;
    offer_type?: string;
    condition?: string;
    area?: string;
    rooms?: string;
    rent?: string;
    isRent?: string;
    availability?: boolean;
    service_area?: string;
    payment_frequency?: string;
    size?: string;
    color?: string;
    gearbox?: string;
    fuel?: string;
    year?: string;
    mileage?: string;
    autoModel?: string;
    attributes?: Record<string, any>;
    specifications?: any;
    // Helper for file upload
    files?: any[];
}

export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {
    imagesToDelete?: string[];
}
