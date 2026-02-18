import { Shop } from '@/types/shop';
import { baseApi } from './baseApi';

export const shopsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getShops: builder.query<Shop[], void>({
            query: () => '/shops',
            providesTags: ['Shop'],
        }),
        getShopById: builder.query<Shop, string>({
            query: (id) => `/shops/${id}`,
            providesTags: (result, error, id) => [{ type: 'Shop', id }],
        }),
        getMyShop: builder.query<Shop, void>({
            query: () => '/shops/mine',
            providesTags: [{ type: 'Shop', id: 'MINE' }],
        }),
        createShop: builder.mutation<Shop, FormData>({
            query: (body) => ({
                url: '/shops',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Shop', { type: 'Shop', id: 'MINE' }],
        }),
        updateShop: builder.mutation<Shop, { id: string; data: FormData }>({
            query: ({ id, data }) => ({
                url: `/shops/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => ['Shop', { type: 'Shop', id }, { type: 'Shop', id: 'MINE' }],
        }),
    }),
});

export const {
    useGetShopsQuery,
    useGetShopByIdQuery,
    useGetMyShopQuery,
    useLazyGetMyShopQuery,
    useCreateShopMutation,
    useUpdateShopMutation,
} = shopsApi;
