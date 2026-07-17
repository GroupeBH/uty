import { baseApi } from './baseApi';

export type ModerationTargetType = 'announcement' | 'comment' | 'message' | 'user';

export interface CreateReportDto {
    targetType: ModerationTargetType;
    targetId: string;
    reportedUserId?: string;
    reason: string;
    details?: string;
}

export interface BlockUserDto {
    userId: string;
    sourceTargetType?: ModerationTargetType;
    sourceTargetId?: string;
    reason?: string;
}

export const moderationApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        createModerationReport: builder.mutation<{ id?: string; received: boolean }, CreateReportDto>({
            query: (body) => ({
                url: '/moderation/reports',
                method: 'POST',
                body,
            }),
        }),
        blockUser: builder.mutation<{ blocked: boolean }, BlockUserDto>({
            query: ({ userId, ...body }) => ({
                url: `/moderation/blocks/${userId}`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Announcement', 'Messaging'],
        }),
    }),
});

export const { useCreateModerationReportMutation, useBlockUserMutation } = moderationApi;

