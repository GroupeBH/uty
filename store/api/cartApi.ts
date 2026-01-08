import { AddItemDto, Cart } from '@/types/cart';
import { baseApi } from './baseApi';

export const cartApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCart: builder.query<Cart, void>({
            query: () => '/carts',
            providesTags: ['Cart'],
        }),
        addToCart: builder.mutation<Cart, AddItemDto>({
            query: (body) => ({
                url: '/carts/items',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Cart'],
        }),
        removeFromCart: builder.mutation<Cart, string>({
            query: (itemId) => ({
                url: `/carts/items/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Cart'],
        }),
        clearCart: builder.mutation<Cart, void>({
            query: () => ({
                url: '/carts',
                method: 'DELETE',
            }),
            invalidatesTags: ['Cart'],
        }),
    }),
});

export const {
    useGetCartQuery,
    useAddToCartMutation,
    useRemoveFromCartMutation,
    useClearCartMutation,
} = cartApi;
