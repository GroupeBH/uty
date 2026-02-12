import { AddItemDto, Cart } from '@/types/cart';
import { baseApi } from './baseApi';

export const cartApi = baseApi.injectEndpoints({
    overrideExisting: true,
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
        updateCartItem: builder.mutation<Cart, { itemId: string; quantity: number }>({
            query: ({ itemId, quantity }) => ({
                url: `/carts/items/${itemId}`,
                method: 'PATCH',
                body: { quantity },
            }),
            invalidatesTags: ['Cart'],
        }),
        setDeliveryLocation: builder.mutation<Cart, { coordinates: number[] }>({
            query: (body) => ({
                url: '/carts/delivery-location',
                method: 'PATCH',
                body,
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
    useUpdateCartItemMutation,
    useSetDeliveryLocationMutation,
    useClearCartMutation,
} = cartApi;
