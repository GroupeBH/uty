import { Platform } from 'react-native';

export type FirebaseRemoteMessage = {
    messageId?: string;
    notification?: {
        title?: string;
        body?: string;
    };
    data?: Record<string, string>;
};

type MessagingInstance = unknown;

type MessagingModule = {
    getMessaging?: () => MessagingInstance;
    registerDeviceForRemoteMessages?: (messaging: MessagingInstance) => Promise<void>;
    requestPermission?: (
        messaging: MessagingInstance,
        iosPermissions?: Record<string, unknown>,
    ) => Promise<number>;
    getToken?: (
        messaging: MessagingInstance,
        options?: Record<string, unknown>,
    ) => Promise<string>;
    deleteToken?: (
        messaging: MessagingInstance,
        options?: Record<string, unknown>,
    ) => Promise<void>;
    getInitialNotification?: (
        messaging: MessagingInstance,
    ) => Promise<FirebaseRemoteMessage | null>;
    onNotificationOpenedApp?: (
        messaging: MessagingInstance,
        listener: (message: FirebaseRemoteMessage) => void,
    ) => () => void;
    onTokenRefresh?: (
        messaging: MessagingInstance,
        listener: (token: string) => void,
    ) => () => void;
    onMessage?: (
        messaging: MessagingInstance,
        listener: (message: FirebaseRemoteMessage) => void,
    ) => () => void;
    setBackgroundMessageHandler?: (
        messaging: MessagingInstance,
        handler: (message: FirebaseRemoteMessage) => Promise<void>,
    ) => void;
    AuthorizationStatus?: {
        AUTHORIZED?: number;
        PROVISIONAL?: number;
    };
};

type NotifeePermissionSettings = {
    authorizationStatus?: number;
};

type NotifeeModule = {
    requestPermission?: () => Promise<NotifeePermissionSettings>;
    createChannel?: (channel: {
        id: string;
        name: string;
        importance?: number;
        vibration?: boolean;
        lights?: boolean;
        sound?: string;
    }) => Promise<string>;
    displayNotification?: (notification: {
        id?: string;
        title?: string;
        body?: string;
        data?: Record<string, string>;
        android?: {
            channelId: string;
            smallIcon?: string;
            pressAction?: { id: string };
        };
        ios?: {
            sound?: string;
        };
    }) => Promise<string>;
    onForegroundEvent?: (listener: (_event: unknown) => void) => () => void;
    onBackgroundEvent?: (listener: (_event: unknown) => Promise<void>) => void;
    getInitialNotification?: () => Promise<{
        notification?: { id?: string; title?: string; body?: string; data?: Record<string, string> };
    } | null>;
};

const DEFAULT_CHANNEL_ID = 'uty-default';
const DEFAULT_CHANNEL_NAME = 'UTY Notifications';
const NOTIFEE_IMPORTANCE_HIGH = 4;

let hasInitializedForegroundHandlers = false;
let hasInitializedBackgroundHandlers = false;
let hasCreatedAndroidChannel = false;
let hasWarnedMissingMessaging = false;
let hasWarnedMessagingInit = false;
let hasWarnedMissingNotifee = false;
const notificationOpenListeners = new Set<
    (message: FirebaseRemoteMessage) => void
>();

let cachedMessagingModule: MessagingModule | null | undefined;
let cachedMessagingInstance: MessagingInstance | null | undefined;
let cachedNotifeeModule: NotifeeModule | null | undefined;

const getMessagingModule = (): MessagingModule | null => {
    if (cachedMessagingModule !== undefined) {
        return cachedMessagingModule;
    }

    if (Platform.OS === 'web') {
        cachedMessagingModule = null;
        return null;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedMessagingModule = require('@react-native-firebase/messaging') as MessagingModule;
    } catch {
        if (!hasWarnedMissingMessaging) {
            console.warn(
                '[push] @react-native-firebase/messaging is missing. Install it to enable FCM notifications.',
            );
            hasWarnedMissingMessaging = true;
        }
        cachedMessagingModule = null;
    }

    return cachedMessagingModule;
};

const getMessagingInstance = (): MessagingInstance | null => {
    if (cachedMessagingInstance !== undefined) {
        return cachedMessagingInstance;
    }

    const messagingModule = getMessagingModule();
    if (!messagingModule?.getMessaging) {
        cachedMessagingInstance = null;
        return null;
    }

    try {
        cachedMessagingInstance = messagingModule.getMessaging();
    } catch {
        if (!hasWarnedMessagingInit) {
            console.warn(
                '[push] Failed to initialize Firebase Messaging. Check Firebase setup for this build.',
            );
            hasWarnedMessagingInit = true;
        }
        cachedMessagingInstance = null;
    }

    return cachedMessagingInstance;
};

const getMessagingApi = (): { module: MessagingModule; instance: MessagingInstance } | null => {
    const module = getMessagingModule();
    const instance = getMessagingInstance();

    if (!module || !instance) {
        return null;
    }

    return { module, instance };
};

const getNotifeeModule = (): NotifeeModule | null => {
    if (cachedNotifeeModule !== undefined) {
        return cachedNotifeeModule;
    }

    if (Platform.OS === 'web') {
        cachedNotifeeModule = null;
        return null;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const notifeeModule = require('@notifee/react-native') as {
            default?: NotifeeModule;
        };
        cachedNotifeeModule = notifeeModule.default || null;
    } catch {
        if (!hasWarnedMissingNotifee) {
            console.warn(
                '[push] @notifee/react-native is missing. Install it to display notifications.',
            );
            hasWarnedMissingNotifee = true;
        }
        cachedNotifeeModule = null;
    }

    return cachedNotifeeModule;
};

const isAuthorizationGranted = (
    status: number | undefined,
    authorizedStatus?: number,
    provisionalStatus?: number,
): boolean => {
    if (typeof status !== 'number') {
        return true;
    }

    if (typeof authorizedStatus === 'number' && status === authorizedStatus) {
        return true;
    }

    if (typeof provisionalStatus === 'number' && status === provisionalStatus) {
        return true;
    }

    return status > 0;
};

const ensureDefaultAndroidChannel = async (): Promise<string> => {
    if (Platform.OS !== 'android') {
        return DEFAULT_CHANNEL_ID;
    }

    const notifee = getNotifeeModule();
    if (!notifee?.createChannel) {
        return DEFAULT_CHANNEL_ID;
    }

    if (!hasCreatedAndroidChannel) {
        await notifee.createChannel({
            id: DEFAULT_CHANNEL_ID,
            name: DEFAULT_CHANNEL_NAME,
            importance: NOTIFEE_IMPORTANCE_HIGH,
            vibration: true,
            lights: true,
            sound: 'default',
        });
        hasCreatedAndroidChannel = true;
    }

    return DEFAULT_CHANNEL_ID;
};

export const displayRemoteMessage = async (
    remoteMessage: FirebaseRemoteMessage,
): Promise<void> => {
    const notifee = getNotifeeModule();
    if (!notifee?.displayNotification) {
        return;
    }

    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'UTY';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || '';

    if (!title && !body) {
        return;
    }

    const channelId = await ensureDefaultAndroidChannel();

    await notifee.displayNotification({
        id: remoteMessage.messageId,
        title,
        body,
        data: remoteMessage.data,
        android: {
            channelId,
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
        },
        ios: {
            sound: 'default',
        },
    });
};

const emitNotificationOpened = (message: FirebaseRemoteMessage) => {
    notificationOpenListeners.forEach((listener) => listener(message));
};

export const subscribeToNotificationOpen = (
    listener: (message: FirebaseRemoteMessage) => void,
): (() => void) => {
    notificationOpenListeners.add(listener);
    return () => {
        notificationOpenListeners.delete(listener);
    };
};

export const requestPushPermissions = async (): Promise<boolean> => {
    const messagingApi = getMessagingApi();
    const notifee = getNotifeeModule();

    if (!messagingApi || !notifee) {
        return false;
    }

    let notifeeAuthorized = true;
    if (notifee.requestPermission) {
        const notifeeSettings = await notifee.requestPermission();
        notifeeAuthorized = isAuthorizationGranted(notifeeSettings.authorizationStatus);
    }

    const { module, instance } = messagingApi;

    let messagingAuthorized = true;
    if (module.requestPermission) {
        const messagingStatus = await module.requestPermission(instance);
        messagingAuthorized = isAuthorizationGranted(
            messagingStatus,
            module.AuthorizationStatus?.AUTHORIZED,
            module.AuthorizationStatus?.PROVISIONAL,
        );
    }

    return notifeeAuthorized && messagingAuthorized;
};

export const registerForPushNotifications = async (): Promise<string | null> => {
    const messagingApi = getMessagingApi();
    if (!messagingApi) {
        return null;
    }

    const hasPermission = await requestPushPermissions();
    if (!hasPermission) {
        return null;
    }

    const { module, instance } = messagingApi;

    if (module.registerDeviceForRemoteMessages) {
        await module.registerDeviceForRemoteMessages(instance);
    }

    if (!module.getToken) {
        return null;
    }

    const token = await module.getToken(instance);
    return token || null;
};

export const subscribeToFcmTokenRefresh = (
    listener: (token: string) => void,
): (() => void) => {
    const messagingApi = getMessagingApi();
    if (!messagingApi) {
        return () => undefined;
    }

    const { module, instance } = messagingApi;
    if (!module.onTokenRefresh) {
        return () => undefined;
    }

    return module.onTokenRefresh(instance, (token: string) => {
        if (token) {
            listener(token);
        }
    });
};

export const initializeForegroundPushHandlers = async (): Promise<void> => {
    if (hasInitializedForegroundHandlers) {
        return;
    }

    const messagingApi = getMessagingApi();
    const notifee = getNotifeeModule();

    if (!messagingApi || !notifee) {
        return;
    }

    await ensureDefaultAndroidChannel();

    const { module, instance } = messagingApi;
    if (module.onMessage) {
        module.onMessage(instance, (remoteMessage: FirebaseRemoteMessage) => {
            void displayRemoteMessage(remoteMessage);
        });
    }

    if (notifee.onForegroundEvent) {
        notifee.onForegroundEvent((event: any) => {
            const eventType = event?.type;
            const isPressEvent =
                eventType === 1 || eventType === 'PRESS' || eventType === 'ACTION_PRESS';
            if (!isPressEvent) return;

            const notification = event?.detail?.notification;
            emitNotificationOpened({
                messageId: notification?.id,
                notification: {
                    title: notification?.title,
                    body: notification?.body,
                },
                data: notification?.data,
            });
        });
    }

    hasInitializedForegroundHandlers = true;
};

export const initializeBackgroundPushHandlers = (): void => {
    if (hasInitializedBackgroundHandlers) {
        return;
    }

    const messagingApi = getMessagingApi();
    const notifee = getNotifeeModule();

    if (!messagingApi || !notifee) {
        return;
    }

    const { module, instance } = messagingApi;
    if (module.setBackgroundMessageHandler) {
        module.setBackgroundMessageHandler(instance, async (remoteMessage: FirebaseRemoteMessage) => {
            await displayRemoteMessage(remoteMessage);
        });
    }

    if (module.onNotificationOpenedApp) {
        module.onNotificationOpenedApp(instance, (remoteMessage: FirebaseRemoteMessage) => {
            emitNotificationOpened(remoteMessage);
        });
    }

    if (module.getInitialNotification) {
        module.getInitialNotification(instance).then((remoteMessage) => {
            if (remoteMessage) {
                emitNotificationOpened(remoteMessage);
            }
        });
    }

    if (notifee.onBackgroundEvent) {
        notifee.onBackgroundEvent(async (event: any) => {
            const eventType = event?.type;
            const isPressEvent =
                eventType === 1 || eventType === 'PRESS' || eventType === 'ACTION_PRESS';
            if (!isPressEvent) return;

            const notification = event?.detail?.notification;
            emitNotificationOpened({
                messageId: notification?.id,
                notification: {
                    title: notification?.title,
                    body: notification?.body,
                },
                data: notification?.data,
            });
        });
    }

    if (notifee.getInitialNotification) {
        notifee.getInitialNotification().then((initial) => {
            if (!initial?.notification) return;
            emitNotificationOpened({
                messageId: initial.notification.id,
                notification: {
                    title: initial.notification.title,
                    body: initial.notification.body,
                },
                data: initial.notification.data,
            });
        });
    }

    hasInitializedBackgroundHandlers = true;
};

export const deleteFcmDeviceToken = async (): Promise<void> => {
    const messagingApi = getMessagingApi();
    if (!messagingApi) {
        return;
    }

    const { module, instance } = messagingApi;
    if (module.deleteToken) {
        await module.deleteToken(instance);
    }
};
