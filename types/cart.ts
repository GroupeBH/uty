import { Announcement } from './announcement';

export interface CartProduct {
    productId: string | Announcement;
    quantity: number;
    status: 'not payed' | 'ordered' | 'payed';
    _id?: string;
}

export interface Cart {
    _id: string;
    userId: string;
    status: 'in progress' | 'ordered';
    products: CartProduct[];
    deliveryLocation?: { type: string; coordinates: number[] };
    deliveryCost?: number;
    deliveryMode?: 'pending' | 'none' | 'walking' | 'vehicle';
    createdAt: string;
    updatedAt: string;
}

export interface AddItemDto {
    productId: string;
    quantity: number;
}

export interface UpdateCartItemDto {
    quantity: number;
}
