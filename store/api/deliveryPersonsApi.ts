import { BecomeDeliveryPersonRequest, DeliveryPerson } from '@/types/deliveryPerson';
import { baseApi } from './baseApi';

export type DeliveryAssignmentStatus = 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export const deliveryPersonsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        becomeDeliveryPerson: builder.mutation<DeliveryPerson, BecomeDeliveryPersonRequest>({
            query: (body) => ({
                url: '/delivery-persons/become',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['User', 'Delivery'],
        }),
        getMyDeliveryPersonProfile: builder.query<DeliveryPerson, void>({
            query: () => '/delivery-persons/location',
            providesTags: ['Delivery'],
        }),
        updateMyDeliveryPersonLocation: builder.mutation<
            DeliveryPerson,
            { latitude: number; longitude: number }
        >({
            query: (body) => ({
                url: '/delivery-persons/location',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Delivery'],
        }),
        updateAssignedDeliveryStatus: builder.mutation<
            any,
            { deliveryId: string; status: DeliveryAssignmentStatus }
        >({
            query: ({ deliveryId, status }) => ({
                url: `/delivery-persons/deliveries/${deliveryId}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['Delivery', 'Order'],
        }),
    }),
});

export const {
    useBecomeDeliveryPersonMutation,
    useGetMyDeliveryPersonProfileQuery,
    useUpdateMyDeliveryPersonLocationMutation,
    useUpdateAssignedDeliveryStatusMutation,
} = deliveryPersonsApi;
