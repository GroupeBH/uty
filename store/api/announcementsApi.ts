import { Announcement } from '@/types/announcement';
import { baseApi } from './baseApi';

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
            query: (formData) => ({
                url: '/announcements',
                method: 'POST',
                body: formData,
                headers: {
                    // Important: Let browser set boundary for FormData
                    // 'Content-Type': undefined, // handled by prepareHeaders logic update
                },
            }),
            invalidatesTags: ['Announcement'],
        }),
        updateAnnouncement: builder.mutation<Announcement, { id: string; data: FormData }>({
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
