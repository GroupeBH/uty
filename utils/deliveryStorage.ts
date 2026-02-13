import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDER_DELIVERY_MAP_KEY = 'order_delivery_map';

type OrderDeliveryMap = Record<string, string>;

const readOrderDeliveryMap = async (): Promise<OrderDeliveryMap> => {
    try {
        const raw = await AsyncStorage.getItem(ORDER_DELIVERY_MAP_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as OrderDeliveryMap;
    } catch {
        return {};
    }
};

const writeOrderDeliveryMap = async (value: OrderDeliveryMap): Promise<void> => {
    try {
        await AsyncStorage.setItem(ORDER_DELIVERY_MAP_KEY, JSON.stringify(value));
    } catch {
        // no-op
    }
};

export const deliveryStorage = {
    async getDeliveryIdForOrder(orderId: string): Promise<string | null> {
        if (!orderId) return null;
        const map = await readOrderDeliveryMap();
        const value = map[orderId];
        return typeof value === 'string' && value.trim() ? value : null;
    },
    async setDeliveryIdForOrder(orderId: string, deliveryId: string): Promise<void> {
        if (!orderId || !deliveryId) return;
        const map = await readOrderDeliveryMap();
        map[orderId] = deliveryId;
        await writeOrderDeliveryMap(map);
    },
    async removeDeliveryIdForOrder(orderId: string): Promise<void> {
        if (!orderId) return;
        const map = await readOrderDeliveryMap();
        delete map[orderId];
        await writeOrderDeliveryMap(map);
    },
};

