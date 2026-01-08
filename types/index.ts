/**
 * Types TypeScript pour l'application
 */

// ============ ENUMS ============

export enum UserRole {
    CLIENT = 'client',
    SELLER = 'seller',
    DRIVER = 'driver',
}

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PREPARING = 'preparing',
    READY = 'ready',
    IN_TRANSIT = 'in_transit',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export enum KYCStatus {
    NOT_SUBMITTED = 'not_submitted',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum DeliveryStatus {
    ASSIGNED = 'assigned',
    PICKED_UP = 'picked_up',
    IN_TRANSIT = 'in_transit',
    DELIVERED = 'delivered',
}

// ============ USER & AUTH ============

export interface User {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: UserRole;
    avatar?: string;
    createdAt: string;
    updatedAt: string;

    // Champs spécifiques au vendeur
    shopId?: string;
    kycStatus?: KYCStatus;

    // Champs spécifiques au livreur
    isAvailable?: boolean;
    currentLocation?: Location;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginRequest {
    phone: string;
    password: string;
}

export interface RegisterRequest {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    email?: string;
}

export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}

// ============ LOCATION ============

export interface Location {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    country?: string;
}

// ============ SHOP ============

export interface Shop {
    id: string;
    name: string;
    description: string;
    logo?: string;
    banner?: string;
    location: Location;
    ownerId: string;
    rating: number;
    totalReviews: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// ============ PRODUCT ============

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    images: string[];
    category: string;
    shopId: string;
    shop?: Shop;
    stock: number;
    rating: number;
    totalReviews: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    shopId?: string;
    sortBy?: 'price' | 'rating' | 'newest';
    sortOrder?: 'asc' | 'desc';
}

// ============ CART ============

export interface CartItem {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
}

export interface Cart {
    items: CartItem[];
    totalItems: number;
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
}

// ============ ORDER ============

export interface OrderItem {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    customer?: User;
    shopId: string;
    shop?: Shop;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    status: OrderStatus;
    deliveryAddress: Location;
    deliveryId?: string;
    delivery?: Delivery;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrderRequest {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    deliveryAddress: Location;
    notes?: string;
}

// ============ DELIVERY ============

export interface Delivery {
    id: string;
    orderId: string;
    order?: Order;
    driverId: string;
    driver?: User;
    pickupLocation: Location;
    deliveryLocation: Location;
    status: DeliveryStatus;
    validationCode: string;
    estimatedTime?: number;
    actualTime?: number;
    distance?: number;
    route?: Array<[number, number]>; // [longitude, latitude]
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface ValidateDeliveryRequest {
    deliveryId: string;
    code: string;
}

// ============ KYC ============

export interface KYCDocument {
    id: string;
    userId: string;
    documentType: 'id_card' | 'passport' | 'business_license' | 'tax_certificate';
    frontImage: string;
    backImage?: string;
    status: KYCStatus;
    rejectionReason?: string;
    submittedAt: string;
    reviewedAt?: string;
}

export interface SubmitKYCRequest {
    documentType: KYCDocument['documentType'];
    frontImage: File | Blob;
    backImage?: File | Blob;
}

// ============ REVIEW ============

export interface Review {
    id: string;
    userId: string;
    user?: User;
    productId?: string;
    shopId?: string;
    orderId?: string;
    rating: number;
    comment: string;
    images?: string[];
    createdAt: string;
    updatedAt: string;
}

// ============ NOTIFICATION ============

export interface Notification {
    id: string;
    userId: string;
    title: string;
    body: string;
    type: 'order' | 'delivery' | 'kyc' | 'general';
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
}

// ============ API RESPONSES ============

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}

// ============ STATS (pour Dashboard Vendeur) ============

export interface SalesStats {
    totalSales: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    topProducts: Array<{
        product: Product;
        totalSold: number;
        revenue: number;
    }>;
    recentOrders: Order[];
}
