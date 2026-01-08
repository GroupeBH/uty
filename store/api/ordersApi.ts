/**
 * API des commandes
 */

import { ApiResponse, CreateOrderRequest, Order, OrderStatus, PaginatedResponse } from '@/types';
import { baseApi } from './baseApi';

export const ordersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Liste des commandes de l'utilisateur
         */
        getOrders: builder.query<PaginatedResponse<Order>, { page?: number; limit?: number; status?: OrderStatus }>({
            query: (params) => ({
                url: '/orders',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Order' as const, id })),
                        { type: 'Order', id: 'LIST' },
                    ]
                    : [{ type: 'Order', id: 'LIST' }],
        }),

        /**
         * Détails d'une commande
         */
        getOrder: builder.query<ApiResponse<Order>, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (result, error, id) => [{ type: 'Order', id }],
        }),

        /**
         * Créer une commande
         */
        createOrder: builder.mutation<ApiResponse<Order>, CreateOrderRequest>({
            query: (orderData) => ({
                url: '/orders',
                method: 'POST',
                body: orderData,
            }),
            invalidatesTags: [{ type: 'Order', id: 'LIST' }, { type: 'Cart' }],
        }),

        /**
         * Mettre à jour le statut d'une commande
         */
        updateOrderStatus: builder.mutation<ApiResponse<Order>, { id: string; status: OrderStatus }>({
            query: ({ id, status }) => ({
                url: `/orders/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }],
        }),

        /**
         * Annuler une commande
         */
        cancelOrder: builder.mutation<ApiResponse<Order>, string>({
            query: (id) => ({
                url: `/orders/${id}/cancel`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Order', id }],
        }),

        /**
         * Commandes du vendeur (pour le dashboard vendeur)
         */
        getSellerOrders: builder.query<PaginatedResponse<Order>, { page?: number; limit?: number; status?: OrderStatus }>({
            query: (params) => ({
                url: '/seller/orders',
                params,
            }),
            providesTags: [{ type: 'Order', id: 'SELLER_LIST' }],
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useGetOrderQuery,
    useCreateOrderMutation,
    useUpdateOrderStatusMutation,
    useCancelOrderMutation,
    useGetSellerOrdersQuery,
} = ordersApi;
