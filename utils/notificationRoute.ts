type NotificationRouteInput = {
    url?: string | null;
    screen?: string | null;
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    userRoles?: string[] | null;
};

const DELIVERY_ROLES = ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'];
const ROUTE_KEYS = ['url', 'route', 'screen', 'path', 'href', 'target', 'deepLink', 'deeplink'];

const SCREEN_ALIAS_TO_ROUTE: Record<string, string> = {
    home: '/(tabs)',
    index: '/(tabs)',
    orders: '/orders',
    order: '/orders',
    messages: '/messages',
    message: '/messages',
    chat: '/messages',
    notifications: '/notifications',
    notification: '/notifications',
    profile: '/profile',
    cart: '/cart',
    search: '/search',
    announcements: '/my-announcements',
    announcement: '/my-announcements',
    'my-announcements': '/my-announcements',
    products: '/my-announcements',
    product: '/my-announcements',
    publish: '/my-announcements',
    seller: '/seller',
};

const toStringValue = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return null;
};

const normalizeRouteCandidate = (candidate: unknown): string | null => {
    const trimmed = toStringValue(candidate);
    if (!trimmed) return null;

    if (trimmed.startsWith('/')) {
        return trimmed;
    }

    const schemeMatch = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/(.+)$/i);
    if (schemeMatch?.[1]) {
        return normalizeRouteCandidate(`/${schemeMatch[1]}`);
    }

    const normalized = trimmed.replace(/^\/+/, '');
    const aliasRoute = SCREEN_ALIAS_TO_ROUTE[normalized.toLowerCase()];
    if (aliasRoute) {
        return aliasRoute;
    }

    if (normalized.includes('/')) {
        return `/${normalized}`;
    }

    return null;
};

const getPayloadValue = (payload: Record<string, unknown>, keys: string[]): string | null => {
    for (const key of keys) {
        if (key in payload) {
            const value = toStringValue(payload[key]);
            if (value) return value;
        }
    }

    const loweredMap: Record<string, unknown> = {};
    Object.keys(payload).forEach((key) => {
        loweredMap[key.toLowerCase()] = payload[key];
    });
    for (const key of keys) {
        const value = toStringValue(loweredMap[key.toLowerCase()]);
        if (value) return value;
    }

    return null;
};

const resolveDeliveryRoute = (
    deliveryId: string,
    data: Record<string, unknown>,
    userRoles?: string[] | null,
): string => {
    const roleCandidate =
        getPayloadValue(data, ['viewerRole', 'recipientRole', 'role']) ||
        '';
    const normalizedRole = roleCandidate.trim().toLowerCase();

    if (DELIVERY_ROLES.includes(normalizedRole)) {
        return `/delivery/deliver-persons/${deliveryId}`;
    }
    if (normalizedRole === 'seller') {
        return `/delivery/seller/${deliveryId}`;
    }
    if (normalizedRole === 'buyer' || normalizedRole === 'customer') {
        return `/delivery/buyer/${deliveryId}`;
    }

    const hasDeliveryRole = Boolean(
        userRoles?.some((role) => DELIVERY_ROLES.includes((role || '').toLowerCase())),
    );
    if (hasDeliveryRole) {
        return `/delivery/deliver-persons/${deliveryId}`;
    }

    return `/delivery/${deliveryId}`;
};

export const resolveNotificationRoute = ({
    url,
    screen,
    title,
    body,
    data,
    userRoles,
}: NotificationRouteInput): string | null => {
    const payload = data || {};

    const directRoute =
        normalizeRouteCandidate(url) ||
        normalizeRouteCandidate(screen) ||
        ROUTE_KEYS.map((key) => normalizeRouteCandidate(getPayloadValue(payload, [key]))).find(Boolean) ||
        null;
    if (directRoute) {
        return directRoute;
    }

    const deliveryId = getPayloadValue(payload, ['deliveryId', 'delivery_id', 'delivery']);
    if (deliveryId) {
        return resolveDeliveryRoute(deliveryId, payload, userRoles);
    }

    const conversationId = getPayloadValue(payload, [
        'conversationId',
        'conversation_id',
        'chatId',
        'chat_id',
    ]);
    if (conversationId) {
        return `/messages/${conversationId}`;
    }

    const orderId = getPayloadValue(payload, ['orderId', 'order_id']);
    if (orderId) {
        return `/order/${orderId}`;
    }

    const announcementId = getPayloadValue(payload, [
        'announcementId',
        'announcement_id',
        'announcement',
        'productId',
        'product_id',
        'product',
        'adId',
        'ad_id',
        'listingId',
        'listing_id',
        'postId',
        'post_id',
        'itemId',
        'item_id',
    ]);
    if (announcementId) {
        return `/product/${announcementId}`;
    }

    const type = (
        getPayloadValue(payload, ['type', 'notificationType', 'notification_type']) ||
        ''
    ).toLowerCase();
    if (type.startsWith('delivery_') || type.includes('pickup') || type.includes('dropoff')) {
        return '/orders';
    }
    if (type.startsWith('order_') || type.includes('rated') || type.includes('payment')) {
        return '/orders';
    }
    if (type.includes('chat') || type.includes('message')) {
        return '/messages';
    }
    if (type.includes('announcement') || type.includes('publish') || type.includes('product')) {
        return '/my-announcements';
    }

    const text = `${title || ''} ${body || ''}`.toLowerCase();
    if (text.includes('annonce') || text.includes('publication') || text.includes('produit')) {
        return '/my-announcements';
    }
    if (text.includes('commande') || text.includes('livraison')) {
        return '/orders';
    }
    if (text.includes('message') || text.includes('discussion') || text.includes('chat')) {
        return '/messages';
    }

    return null;
};
