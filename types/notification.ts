export type AppNotification = {
    _id: string;
    user?: string;
    title: string;
    body: string;
    screen?: string;
    url?: string;
    data?: Record<string, string>;
    isReaded?: boolean;
    createdAt?: string;
    updatedAt?: string;
};
