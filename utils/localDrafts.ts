import AsyncStorage from '@react-native-async-storage/async-storage';
import { KinshasaAddressFields } from './kinshasaAddress';

const STORAGE_KEYS = {
    PUBLISH_DRAFT: 'publishDraftV2',
    CART_DELIVERY_DRAFT: 'cartDeliveryDraftV1',
} as const;

type DraftCategory = {
    _id: string;
    name: string;
    icon?: string;
    isLeaf?: boolean;
};

export type PublishDraftData = {
    formData: {
        name: string;
        description: string;
        price: string;
        currency: string;
        quantity: string;
        isDeliverable: boolean;
        weightClass: string[];
        pickupAddress: string;
        pickupLatitude: string;
        pickupLongitude: string;
    };
    dynamicAttributes: Record<string, any>;
    categoryPath: DraftCategory[];
    selectedLeafCategory: DraftCategory | null;
    pickupAddressFields: KinshasaAddressFields;
    savedAt: string;
};

export type CartDeliveryDraftData = {
    deliveryAddress: string;
    deliveryAddressFields: KinshasaAddressFields;
    deliveryInputMode?: 'guided' | 'map';
    savedAt: string;
};

const safeParse = <T>(raw: string | null): T | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        console.error('Error parsing local draft:', error);
        return null;
    }
};

export const localDrafts = {
    async getPublishDraft(): Promise<PublishDraftData | null> {
        try {
            return safeParse<PublishDraftData>(
                await AsyncStorage.getItem(STORAGE_KEYS.PUBLISH_DRAFT),
            );
        } catch (error) {
            console.error('Error reading publish draft:', error);
            return null;
        }
    },

    async savePublishDraft(draft: PublishDraftData) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PUBLISH_DRAFT, JSON.stringify(draft));
        } catch (error) {
            console.error('Error saving publish draft:', error);
        }
    },

    async clearPublishDraft() {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.PUBLISH_DRAFT);
        } catch (error) {
            console.error('Error clearing publish draft:', error);
        }
    },

    async getCartDeliveryDraft(): Promise<CartDeliveryDraftData | null> {
        try {
            return safeParse<CartDeliveryDraftData>(
                await AsyncStorage.getItem(STORAGE_KEYS.CART_DELIVERY_DRAFT),
            );
        } catch (error) {
            console.error('Error reading cart delivery draft:', error);
            return null;
        }
    },

    async saveCartDeliveryDraft(draft: CartDeliveryDraftData) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.CART_DELIVERY_DRAFT, JSON.stringify(draft));
        } catch (error) {
            console.error('Error saving cart delivery draft:', error);
        }
    },

    async clearCartDeliveryDraft() {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.CART_DELIVERY_DRAFT);
        } catch (error) {
            console.error('Error clearing cart delivery draft:', error);
        }
    },
};
