import { baseApi } from './baseApi';

export interface CommentUser {
    _id?: string;
    username?: string;
    image?: string;
    firstName?: string;
    lastName?: string;
}

export interface AnnouncementComment {
    _id: string;
    text: string;
    rating?: number;
    user: string | CommentUser;
    announcement: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentDto {
    text: string;
    rating?: number;
}

export interface UpdateCommentDto {
    text?: string;
    rating?: number;
}

export const commentsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getCommentsForAnnouncement: builder.query<AnnouncementComment[], string>({
            query: (announcementId) => `/comments/announcement/${announcementId}`,
            providesTags: (result, error, announcementId) => [
                { type: 'Announcement', id: announcementId },
                { type: 'Announcement', id: `comments-${announcementId}` },
            ],
        }),
        createComment: builder.mutation<
            AnnouncementComment,
            { announcementId: string; data: CreateCommentDto }
        >({
            query: ({ announcementId, data }) => ({
                url: `/comments/announcement/${announcementId}`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { announcementId }) => [
                { type: 'Announcement', id: announcementId },
                { type: 'Announcement', id: `comments-${announcementId}` },
            ],
        }),
        updateComment: builder.mutation<
            AnnouncementComment,
            { id: string; data: UpdateCommentDto; announcementId?: string }
        >({
            query: ({ id, data }) => ({
                url: `/comments/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { announcementId }) =>
                announcementId
                    ? [
                          { type: 'Announcement', id: announcementId },
                          { type: 'Announcement', id: `comments-${announcementId}` },
                      ]
                    : ['Announcement'],
        }),
        deleteComment: builder.mutation<
            { deleted: boolean },
            { id: string; announcementId?: string }
        >({
            query: ({ id }) => ({
                url: `/comments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { announcementId }) =>
                announcementId
                    ? [
                          { type: 'Announcement', id: announcementId },
                          { type: 'Announcement', id: `comments-${announcementId}` },
                      ]
                    : ['Announcement'],
        }),
    }),
});

export const {
    useGetCommentsForAnnouncementQuery,
    useCreateCommentMutation,
    useUpdateCommentMutation,
    useDeleteCommentMutation,
} = commentsApi;
