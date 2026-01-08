/**
 * API des livraisons
 */

import { ApiResponse, Delivery, DeliveryStatus, Location, PaginatedResponse, ValidateDeliveryRequest } from '@/types';
import { baseApi } from './baseApi';

export const deliveriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Liste des livraisons du livreur
         */
        getDeliveries: builder.query<PaginatedResponse<Delivery>, { page?: number; limit?: number; status?: DeliveryStatus }>({
            query: (params) => ({
                url: '/deliveries',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Delivery' as const, id })),
                        { type: 'Delivery', id: 'LIST' },
                    ]
                    : [{ type: 'Delivery', id: 'LIST' }],
        }),

        /**
         * Détails d'une livraison
         */
        getDelivery: builder.query<ApiResponse<Delivery>, string>({
            query: (id) => `/deliveries/${id}`,
            providesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),

        /**
         * Mettre à jour le statut d'une livraison
         */
        updateDeliveryStatus: builder.mutation<ApiResponse<Delivery>, { id: string; status: DeliveryStatus }>({
            query: ({ id, status }) => ({
                url: `/deliveries/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Delivery', id },
                { type: 'Order' },
            ],
        }),

        /**
         * Mettre à jour la position du livreur
         */
        updateDriverLocation: builder.mutation<ApiResponse<void>, { deliveryId: string; location: Location }>({
            query: ({ deliveryId, location }) => ({
                url: `/deliveries/${deliveryId}/location`,
                method: 'PATCH',
                body: { location },
            }),
            // Pas d'invalidation pour éviter trop de refetch
            // La position est mise à jour en temps réel via WebSocket ou polling
        }),

        /**
         * Valider une livraison avec le code
         */
        validateDelivery: builder.mutation<ApiResponse<Delivery>, ValidateDeliveryRequest>({
            query: ({ deliveryId, code }) => ({
                url: `/deliveries/${deliveryId}/validate`,
                method: 'POST',
                body: { code },
            }),
            invalidatesTags: (result, error, { deliveryId }) => [
                { type: 'Delivery', id: deliveryId },
                { type: 'Order' },
            ],
        }),

        /**
         * Récupérer l'itinéraire pour une livraison
         */
        getDeliveryRoute: builder.query<ApiResponse<{ route: Array<[number, number]>; distance: number; duration: number }>, string>({
            query: (id) => `/deliveries/${id}/route`,
        }),
    }),
});

export const {
    useGetDeliveriesQuery,
    useGetDeliveryQuery,
    useUpdateDeliveryStatusMutation,
    useUpdateDriverLocationMutation,
    useValidateDeliveryMutation,
    useGetDeliveryRouteQuery,
} = deliveriesApi;
