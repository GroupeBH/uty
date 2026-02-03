import { Announcement } from '@/types/announcement';
import { baseApi } from './baseApi';

export interface CreateAnnouncementDto {
    name: string;
    description?: string;
    price?: number;
    quantity?: number;
    category: string;
    attributes?: Record<string, any>;
}

export interface UpdateAnnouncementDto {
    name?: string;
    description?: string;
    price?: number;
    quantity?: number;
    attributes?: Record<string, any>;
    existingImages?: string[];
    imagesToDelete?: string[];
    newImages?: string[]; // Base64 images
}

export const announcementsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAnnouncements: builder.query<Announcement[], void>({
            query: () => '/announcements',
            providesTags: ['Announcement'],
        }),
        getAnnouncementById: builder.query<Announcement, string>({
            query: (id) => `/announcements/${id}`,
            providesTags: (result, error, id) => [{ type: 'Announcement', id }],
        }),
        createAnnouncement: builder.mutation<Announcement, FormData>({
            query: (data) => ({
                url: '/announcements',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Announcement'],
        }),
        updateAnnouncement: builder.mutation<Announcement, { id: string; data: FormData | UpdateAnnouncementDto }>({
            query: ({ id, data }) => ({
                url: `/announcements/${id}`,
                method: 'PATCH',
                body: data,
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
            invalidatesTags: (result, error, id) => [{ type: 'Announcement', id }],
        }),
        getMyAnnouncements: builder.query<Announcement[], void>({
            query: () => '/announcements/mine',
            providesTags: ['Announcement'],
        }),
    }),
});

export const {
    useGetAnnouncementsQuery,
    useGetAnnouncementByIdQuery,
    useCreateAnnouncementMutation,
    useUpdateAnnouncementMutation,
    useDeleteAnnouncementMutation,
    useToggleLikeMutation,
    useGetMyAnnouncementsQuery,
} = announcementsApi;
