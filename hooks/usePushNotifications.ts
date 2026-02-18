import { useEffect, useRef } from 'react';
import { useUpdateFcmTokenMutation } from '@/store/api/authApi';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser, selectIsAuthenticated } from '@/store/slices/authSlice';
import {
    FirebaseRemoteMessage,
    initializeBackgroundPushHandlers,
    initializeForegroundPushHandlers,
    registerForPushNotifications,
    subscribeToNotificationOpen,
    subscribeToFcmTokenRefresh,
} from '@/services/notifications/pushNotifications';
import { useRouter } from 'expo-router';

export const usePushNotifications = () => {
    const router = useRouter();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectCurrentUser);
    const [updateFcmToken] = useUpdateFcmTokenMutation();

    const lastSyncedToken = useRef<string | null>(null);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const resolveDeliveryRoute = (deliveryId: string, data: Record<string, string>) => {
            const roleCandidate =
                (typeof data.viewerRole === 'string' && data.viewerRole) ||
                (typeof data.recipientRole === 'string' && data.recipientRole) ||
                (typeof data.role === 'string' && data.role) ||
                '';
            const normalizedRole = roleCandidate.trim().toLowerCase();
            if (['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(normalizedRole)) {
                return `/delivery/deliver-persons/${deliveryId}`;
            }
            if (normalizedRole === 'seller') {
                return `/delivery/seller/${deliveryId}`;
            }
            if (normalizedRole === 'buyer' || normalizedRole === 'customer') {
                return `/delivery/buyer/${deliveryId}`;
            }

            const hasDeliveryRole = Boolean(
                user?.roles?.some((role) =>
                    ['driver', 'delivery_person', 'deliveryperson', 'delivery-person'].includes(
                        (role || '').toLowerCase(),
                    ),
                ),
            );
            if (hasDeliveryRole) {
                return `/delivery/deliver-persons/${deliveryId}`;
            }

            return `/delivery/${deliveryId}`;
        };

        const unsubscribe = subscribeToNotificationOpen((message: FirebaseRemoteMessage) => {
            const data: Record<string, string> = message?.data || {};
            const deliveryId = data.deliveryId;
            const orderId = data.orderId;
            const targetUrl = data.url;

            if (targetUrl && targetUrl.startsWith('/')) {
                router.push(targetUrl as any);
                return;
            }

            if (deliveryId) {
                router.push(resolveDeliveryRoute(deliveryId, data) as any);
                return;
            }

            if (orderId) {
                router.push(`/order/${orderId}` as any);
                return;
            }

            const type = data.type || '';
            if (type.startsWith('delivery_') || type.includes('pickup') || type.includes('dropoff')) {
                router.push('/orders' as any);
                return;
            }
            if (type.startsWith('order_') || type.includes('rated')) {
                router.push('/orders' as any);
                return;
            }
            if (type.includes('announcement')) {
                router.push('/my-announcements' as any);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [router, user?.roles]);

    useEffect(() => {
        if (!isAuthenticated || !user?._id) {
            lastSyncedToken.current = null;
            if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }
            return;
        }

        let isActive = true;
        let unsubscribeTokenRefresh: (() => void) | undefined;

        const syncTokenToBackend = async (token: string) => {
            if (!token || !isActive || lastSyncedToken.current === token) {
                return;
            }

            try {
                await updateFcmToken({ fcmToken: token }).unwrap();
                lastSyncedToken.current = token;
                if (retryTimer.current) {
                    clearTimeout(retryTimer.current);
                    retryTimer.current = null;
                }
            } catch (error: any) {
                const status = error?.status || error?.data?.statusCode;
                if (status === 500) {
                    console.warn('[push] FCM token sync returned 500. Retrying in 30s.');
                    if (!retryTimer.current && isActive) {
                        retryTimer.current = setTimeout(() => {
                            retryTimer.current = null;
                            void syncTokenToBackend(token);
                        }, 30000);
                    }
                    return;
                }

                console.error('[push] Failed to sync FCM token:', error);
            }
        };

        const bootstrapPush = async () => {
            try {
                initializeBackgroundPushHandlers();
                await initializeForegroundPushHandlers();

                const token = await registerForPushNotifications();
                if (token) {
                    await syncTokenToBackend(token);
                }

                unsubscribeTokenRefresh = subscribeToFcmTokenRefresh((nextToken) => {
                    void syncTokenToBackend(nextToken);
                });
            } catch (error) {
                console.error('[push] Failed to initialize notifications:', error);
            }
        };

        void bootstrapPush();

        return () => {
            isActive = false;
            unsubscribeTokenRefresh?.();
            if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }
        };
    }, [isAuthenticated, updateFcmToken, user?._id]);
};
