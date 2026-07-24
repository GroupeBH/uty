import { Announcement } from '@/types/announcement';
import { baseApi } from './baseApi';

const parseMutationResponse = async (response: Response) => {
    const raw = await response.text();
    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return { raw };
    }
};

export interface CreateAnnouncementDto {
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    quantity?: number;
    category: string;
    attributes?: Record<string, any>;
    isDeliverable?: boolean;
    pickupLocation?: any;
    weightClass?: string[];
}

export interface UpdateAnnouncementDto {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    quantity?: number;
    attributes?: Record<string, any>;
    existingImages?: string[];
    imagesToDelete?: string[];
    newImages?: string[]; // Base64 images
    isDeliverable?: boolean;
    pickupLocation?: any;
    weightClass?: string[];
}

export interface AnnouncementViewByUserRow {
    userId: string;
    username?: string;
    verifiedPhone?: string;
    count: number;
    lastViewedAt?: string;
}

export interface AnnouncementViewsByUserResponse {
    announcementId: string;
    totalViews: number;
    uniqueViewers: number;
    viewsByUser: AnnouncementViewByUserRow[];
}

export interface ModerationPayload {
    reason?: string;
    details?: string;
}

export interface AnnouncementReportResponse {
    reported: boolean;
    created: boolean;
    report: {
        id: string;
        announcement: string | any;
        reporter: string | any;
        seller: string | any;
        reason: string;
        details?: string;
        status: string;
        reportCount: number;
        lastReportedAt?: string;
        createdAt?: string;
        updatedAt?: string;
    };
}

export interface SellerBlock {
    id: string;
    blocker: string | any;
    seller: string | any;
    announcement?: string | any;
    reason?: string;
    details?: string;
    isActive: boolean;
    blockedAt?: string;
    unblockedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SellerBlockResponse {
    blocked: boolean;
    alreadyBlocked?: boolean;
    sellerId: string;
    announcementId?: string | null;
    block: SellerBlock | null;
}

export const announcementsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getAnnouncements: builder.query<Announcement[], void>({
            query: () => '/announcements',
            providesTags: (result) =>
                result
                    ? [
                          'Announcement',
                          ...result.map((item) => ({ type: 'Announcement' as const, id: item._id })),
                      ]
                    : ['Announcement'],
        }),
        getAnnouncementById: builder.query<Announcement, string>({
            query: (id) => `/announcements/${id}`,
            providesTags: (result, error, id) => [{ type: 'Announcement', id }],
        }),
        getAnnouncementByIdWithTrackedView: builder.query<Announcement, string>({
            query: (id) => `/announcements/${id}/view`,
            providesTags: (result, error, id) => [{ type: 'Announcement', id }],
        }),
        createAnnouncement: builder.mutation<Announcement, FormData>({
            query: (data) => ({
                url: '/announcements',
                method: 'POST',
                body: data,
                responseHandler: parseMutationResponse,
            }),
            invalidatesTags: ['Announcement'],
        }),
        updateAnnouncement: builder.mutation<Announcement, { id: string; data: FormData | UpdateAnnouncementDto }>({
            query: ({ id, data }) => ({
                url: `/announcements/${id}`,
                method: 'PATCH',
                body: data,
                responseHandler: parseMutationResponse,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Announcement', id }, 'Announcement'],
        }),
        deleteAnnouncement: builder.mutation<void, string>({
            query: (id) => ({
                url: `/announcements/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Announcement'],
        }),
        toggleLike: builder.mutation<Announcement, string>({
            query: (id) => ({
                url: `/announcements/${id}/like`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [
                'Announcement',
                { type: 'Announcement', id },
            ],
        }),
        getMyAnnouncements: builder.query<Announcement[], void>({
            query: () => '/announcements/mine',
            providesTags: (result) =>
                result
                    ? [
                          'Announcement',
                          ...result.map((item) => ({ type: 'Announcement' as const, id: item._id })),
                      ]
                    : ['Announcement'],
        }),
        getMyFavorites: builder.query<Announcement[], void>({
            query: () => '/announcements/favorites/me',
            providesTags: (result) =>
                result
                    ? [
                          'Announcement',
                          ...result.map((item) => ({ type: 'Announcement' as const, id: item._id })),
                      ]
                    : ['Announcement'],
        }),
        getAnnouncementViewsByUser: builder.query<AnnouncementViewsByUserResponse, string>({
            query: (id) => `/announcements/${id}/views/by-user`,
            providesTags: (result, error, id) => [{ type: 'Announcement', id }],
        }),
        reportAnnouncement: builder.mutation<
            AnnouncementReportResponse,
            { announcementId: string; data?: ModerationPayload }
        >({
            query: ({ announcementId, data }) => ({
                url: `/announcements/${announcementId}/report`,
                method: 'POST',
                body: data || {},
            }),
        }),
        blockSellerFromAnnouncement: builder.mutation<
            SellerBlockResponse,
            { announcementId: string; data?: ModerationPayload }
        >({
            query: ({ announcementId, data }) => ({
                url: `/announcements/${announcementId}/block-seller`,
                method: 'POST',
                body: data || {},
            }),
            invalidatesTags: (result, error, { announcementId }) => [
                'Announcement',
                'SellerBlock',
                'Messaging',
                'ContactRequest',
                { type: 'Announcement', id: announcementId },
            ],
        }),
        blockSeller: builder.mutation<
            SellerBlockResponse,
            { sellerId: string; data?: ModerationPayload }
        >({
            query: ({ sellerId, data }) => ({
                url: `/announcements/blocked-sellers/${sellerId}`,
                method: 'POST',
                body: data || {},
            }),
            invalidatesTags: ['Announcement', 'SellerBlock', 'Messaging', 'ContactRequest'],
        }),
        getMyBlockedSellers: builder.query<SellerBlock[], void>({
            query: () => '/announcements/blocked-sellers/me',
            providesTags: ['SellerBlock'],
        }),
        unblockSeller: builder.mutation<SellerBlockResponse, string>({
            query: (sellerId) => ({
                url: `/announcements/blocked-sellers/${sellerId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Announcement', 'SellerBlock', 'Messaging', 'ContactRequest'],
        }),
    }),
});

export const {
    useGetAnnouncementsQuery,
    useGetAnnouncementByIdQuery,
    useGetAnnouncementByIdWithTrackedViewQuery,
    useCreateAnnouncementMutation,
    useUpdateAnnouncementMutation,
    useDeleteAnnouncementMutation,
    useToggleLikeMutation,
    useGetMyAnnouncementsQuery,
    useGetMyFavoritesQuery,
    useGetAnnouncementViewsByUserQuery,
    useReportAnnouncementMutation,
    useBlockSellerFromAnnouncementMutation,
    useBlockSellerMutation,
    useGetMyBlockedSellersQuery,
    useUnblockSellerMutation,
} = announcementsApi;
