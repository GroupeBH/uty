import { AppNotification } from '@/types/notification';
import { baseApi } from './baseApi';

type GetNotificationsArgs = {
    limit?: number;
};

type TestNotificationPayload = {
    title?: string;
    body?: string;
    data?: Record<string, string>;
};

export const notificationsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getMyNotifications: builder.query<AppNotification[], GetNotificationsArgs | void>({
            query: (args) => ({
                url: '/notifications/me',
                params: args?.limit ? { limit: args.limit } : undefined,
            }),
            providesTags: ['Notification'],
        }),
        markNotificationRead: builder.mutation<AppNotification, string>({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
        }),
        markAllNotificationsRead: builder.mutation<{ updatedCount: number }, void>({
            query: () => ({
                url: '/notifications/read-all',
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
        }),
        deleteNotification: builder.mutation<{ deleted: boolean }, string>({
            query: (id) => ({
                url: `/notifications/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Notification'],
        }),
        sendTestNotification: builder.mutation<{ message: string }, TestNotificationPayload>({
            query: (body) => ({
                url: '/notifications/test',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const {
    useGetMyNotificationsQuery,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
    useDeleteNotificationMutation,
    useSendTestNotificationMutation,
} = notificationsApi;
