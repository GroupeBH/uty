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
import { resolveNotificationRoute } from '@/utils/notificationRoute';
import { useRouter } from 'expo-router';

export const usePushNotifications = () => {
    const router = useRouter();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectCurrentUser);
    const [updateFcmToken] = useUpdateFcmTokenMutation();

    const lastSyncedToken = useRef<string | null>(null);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        initializeBackgroundPushHandlers();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToNotificationOpen((message: FirebaseRemoteMessage) => {
            const data: Record<string, string> = message?.data || {};
            const route = resolveNotificationRoute({
                url: data.url,
                screen: data.screen,
                title: message?.notification?.title || data.title,
                body: message?.notification?.body || data.body,
                data,
                userRoles: user?.roles,
            });
            router.push((route || '/notifications') as any);
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
