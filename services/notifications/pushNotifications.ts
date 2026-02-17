import { Platform } from 'react-native';

export type FirebaseRemoteMessage = {
    messageId?: string;
    notification?: {
        title?: string;
        body?: string;
    };
    data?: Record<string, string>;
};

type MessagingInstance = {
    registerDeviceForRemoteMessages?: () => Promise<void>;
    requestPermission?: () => Promise<number>;
    getToken?: () => Promise<string>;
    deleteToken?: () => Promise<void>;
    onTokenRefresh?: (listener: (token: string) => void) => () => void;
    onMessage?: (listener: (message: FirebaseRemoteMessage) => void) => () => void;
    setBackgroundMessageHandler?: (
        handler: (message: FirebaseRemoteMessage) => Promise<void>,
    ) => void;
};

type MessagingFactory = {
    (): MessagingInstance;
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
};

const DEFAULT_CHANNEL_ID = 'uty-default';
const DEFAULT_CHANNEL_NAME = 'UTY Notifications';
const NOTIFEE_IMPORTANCE_HIGH = 4;

let hasInitializedForegroundHandlers = false;
let hasInitializedBackgroundHandlers = false;
let hasCreatedAndroidChannel = false;
let hasWarnedMissingMessaging = false;
let hasWarnedMissingNotifee = false;

let cachedMessagingFactory: MessagingFactory | null | undefined;
let cachedNotifeeModule: NotifeeModule | null | undefined;

const getMessagingFactory = (): MessagingFactory | null => {
    if (cachedMessagingFactory !== undefined) {
        return cachedMessagingFactory;
    }

    if (Platform.OS === 'web') {
        cachedMessagingFactory = null;
        return null;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const messagingModule = require('@react-native-firebase/messaging') as {
            default?: MessagingFactory;
        };
        cachedMessagingFactory = messagingModule.default || null;
    } catch {
        if (!hasWarnedMissingMessaging) {
            console.warn(
                '[push] @react-native-firebase/messaging is missing. Install it to enable FCM notifications.',
            );
            hasWarnedMissingMessaging = true;
        }
        cachedMessagingFactory = null;
    }

    return cachedMessagingFactory;
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

export const requestPushPermissions = async (): Promise<boolean> => {
    const messagingFactory = getMessagingFactory();
    const notifee = getNotifeeModule();

    if (!messagingFactory || !notifee) {
        return false;
    }

    let notifeeAuthorized = true;
    if (notifee.requestPermission) {
        const notifeeSettings = await notifee.requestPermission();
        notifeeAuthorized = isAuthorizationGranted(notifeeSettings.authorizationStatus);
    }

    const messaging = messagingFactory();

    let messagingAuthorized = true;
    if (messaging.requestPermission) {
        const messagingStatus = await messaging.requestPermission();
        messagingAuthorized = isAuthorizationGranted(
            messagingStatus,
            messagingFactory.AuthorizationStatus?.AUTHORIZED,
            messagingFactory.AuthorizationStatus?.PROVISIONAL,
        );
    }

    return notifeeAuthorized && messagingAuthorized;
};

export const registerForPushNotifications = async (): Promise<string | null> => {
    const messagingFactory = getMessagingFactory();
    if (!messagingFactory) {
        return null;
    }

    const hasPermission = await requestPushPermissions();
    if (!hasPermission) {
        return null;
    }

    const messaging = messagingFactory();

    if (messaging.registerDeviceForRemoteMessages) {
        await messaging.registerDeviceForRemoteMessages();
    }

    if (!messaging.getToken) {
        return null;
    }

    const token = await messaging.getToken();
    return token || null;
};

export const subscribeToFcmTokenRefresh = (
    listener: (token: string) => void,
): (() => void) => {
    const messagingFactory = getMessagingFactory();
    if (!messagingFactory) {
        return () => undefined;
    }

    const messaging = messagingFactory();
    if (!messaging.onTokenRefresh) {
        return () => undefined;
    }

    return messaging.onTokenRefresh((token: string) => {
        if (token) {
            listener(token);
        }
    });
};

export const initializeForegroundPushHandlers = async (): Promise<void> => {
    if (hasInitializedForegroundHandlers) {
        return;
    }

    const messagingFactory = getMessagingFactory();
    const notifee = getNotifeeModule();

    if (!messagingFactory || !notifee) {
        return;
    }

    await ensureDefaultAndroidChannel();

    const messaging = messagingFactory();
    if (messaging.onMessage) {
        messaging.onMessage((remoteMessage: FirebaseRemoteMessage) => {
            void displayRemoteMessage(remoteMessage);
        });
    }

    if (notifee.onForegroundEvent) {
        notifee.onForegroundEvent(() => undefined);
    }

    hasInitializedForegroundHandlers = true;
};

export const initializeBackgroundPushHandlers = (): void => {
    if (hasInitializedBackgroundHandlers) {
        return;
    }

    const messagingFactory = getMessagingFactory();
    const notifee = getNotifeeModule();

    if (!messagingFactory || !notifee) {
        return;
    }

    const messaging = messagingFactory();
    if (messaging.setBackgroundMessageHandler) {
        messaging.setBackgroundMessageHandler(async (remoteMessage: FirebaseRemoteMessage) => {
            await displayRemoteMessage(remoteMessage);
        });
    }

    if (notifee.onBackgroundEvent) {
        notifee.onBackgroundEvent(async () => undefined);
    }

    hasInitializedBackgroundHandlers = true;
};

export const deleteFcmDeviceToken = async (): Promise<void> => {
    const messagingFactory = getMessagingFactory();
    if (!messagingFactory) {
        return;
    }

    const messaging = messagingFactory();
    if (messaging.deleteToken) {
        await messaging.deleteToken();
    }
};
