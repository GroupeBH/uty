import { baseApi } from './baseApi';

export interface ContactRequest {
    id: string;
    announcement: any;
    buyer: any;
    seller: any;
    category?: any;
    categoryAncestors?: any[];
    conversation?: string;
    source: string;
    channel: string;
    status: string;
    announcementName?: string;
    messagePreview?: string;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateContactRequestDto {
    announcementId: string;
    conversationId?: string;
    message?: string;
    source?: string;
    channel?: string;
}

export const contactRequestsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        createContactRequest: builder.mutation<ContactRequest, CreateContactRequestDto>({
            query: (body) => ({
                url: '/contact-requests',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ContactRequest'],
        }),
        getSellerContactRequests: builder.query<ContactRequest[], void>({
            query: () => '/contact-requests/seller',
            providesTags: ['ContactRequest'],
        }),
        getBuyerContactRequests: builder.query<ContactRequest[], void>({
            query: () => '/contact-requests/buyer',
            providesTags: ['ContactRequest'],
        }),
    }),
});

export const {
    useCreateContactRequestMutation,
    useGetSellerContactRequestsQuery,
    useGetBuyerContactRequestsQuery,
} = contactRequestsApi;
