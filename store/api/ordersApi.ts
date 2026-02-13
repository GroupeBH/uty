/**
 * API des commandes
 */

import { CreateOrderRequest, Order, OrderStatusValue } from '@/types/order';
import { baseApi } from './baseApi';

export const ordersApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        /**
         * Liste des commandes de l'utilisateur.
         * Retourne les achats (buyer) et, si vendeur, les ventes.
         */
        getOrders: builder.query<Order[], void>({
            query: () => '/orders/my-orders',
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ _id }) => ({ type: 'Order' as const, id: _id })),
                        { type: 'Order', id: 'LIST' },
                    ]
                    : [{ type: 'Order', id: 'LIST' }],
        }),

        /**
         * Details d'une commande.
         */
        getOrder: builder.query<Order, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (result, error, id) => [{ type: 'Order', id }],
        }),

        /**
         * Creer une commande.
         */
        createOrder: builder.mutation<Order, CreateOrderRequest>({
            query: (orderData) => ({
                url: '/orders',
                method: 'POST',
                body: orderData,
            }),
            invalidatesTags: [{ type: 'Order', id: 'LIST' }, { type: 'Cart' }],
        }),

        /**
         * Mettre a jour le statut d'une commande.
         */
        updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatusValue }>({
            query: ({ id, status }) => ({
                url: `/orders/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, { type: 'Order', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useGetOrderQuery,
    useCreateOrderMutation,
    useUpdateOrderStatusMutation,
} = ordersApi;

