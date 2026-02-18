import { Delivery, DeliveryMessage, DeliveryQrPayload, DeliveryTracking } from '@/types/delivery';
import { baseApi } from './baseApi';

const parseDeliveryList = (payload: unknown): Delivery[] | null => {
    if (Array.isArray(payload)) {
        return payload as Delivery[];
    }

    if (payload && typeof payload === 'object') {
        const objectPayload = payload as Record<string, unknown>;
        if (Array.isArray(objectPayload.data)) {
            return objectPayload.data as Delivery[];
        }
        if (Array.isArray(objectPayload.items)) {
            return objectPayload.items as Delivery[];
        }
        if (Array.isArray(objectPayload.results)) {
            return objectPayload.results as Delivery[];
        }
        if (Array.isArray(objectPayload.deliveries)) {
            return objectPayload.deliveries as Delivery[];
        }
    }

    return null;
};

export const deliveriesApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getOngoingDeliveries: builder.query<Delivery[], void>({
            async queryFn(_arg, _api, _extraOptions, fetchWithBQ) {
                // Driver flow: pending deliveries dedicated endpoint.
                const primaryResponse = await fetchWithBQ('/deliveries/pending');
                const parsedPrimary = parseDeliveryList(primaryResponse.data);
                if (!primaryResponse.error && parsedPrimary) {
                    return { data: parsedPrimary };
                }

                // Admin fallback: ongoing deliveries endpoint.
                const fallbackResponse = await fetchWithBQ('/deliveries/ongoing');
                const parsedFallback = parseDeliveryList(fallbackResponse.data);
                if (!fallbackResponse.error && parsedFallback) {
                    return { data: parsedFallback };
                }

                if (fallbackResponse.error) {
                    return { error: fallbackResponse.error };
                }

                if (primaryResponse.error) {
                    return { error: primaryResponse.error };
                }

                return { data: [] };
            },
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ _id }) => ({ type: 'Delivery' as const, id: _id })),
                          { type: 'Delivery', id: 'DELIVERY_POOL_LIST' },
                      ]
                    : [{ type: 'Delivery', id: 'DELIVERY_POOL_LIST' }],
        }),
        getDelivery: builder.query<Delivery, string>({
            query: (id) => `/deliveries/${id}`,
            providesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),
        getDeliveryTracking: builder.query<DeliveryTracking, string>({
            query: (id) => `/deliveries/${id}/tracking`,
            providesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),
        getDeliveryMessages: builder.query<DeliveryMessage[], string>({
            query: (id) => `/deliveries/${id}/messages`,
            providesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),
        sendDeliveryMessage: builder.mutation<Delivery, { id: string; message: string }>({
            query: ({ id, message }) => ({
                url: `/deliveries/${id}/messages`,
                method: 'POST',
                body: { message },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Delivery', id }],
        }),
        acceptDelivery: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/accept`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'Delivery', id },
                { type: 'Delivery', id: 'DELIVERY_POOL_LIST' },
                { type: 'Order', id: 'LIST' },
            ],
        }),
        generatePickupQr: builder.mutation<DeliveryQrPayload, string>({
            query: (id) => ({
                url: `/deliveries/${id}/pickup-qr`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),
        scanPickupQr: builder.mutation<Delivery, { id: string; qrData: string }>({
            query: ({ id, qrData }) => ({
                url: `/deliveries/${id}/scan-pickup-qr`,
                method: 'POST',
                body: { qrData },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        driverArrivePickup: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/arrive-pickup`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        sellerConfirmPickup: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/seller-confirm-pickup`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        driverConfirmPickup: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/driver-confirm-pickup`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        driverArriveDropoff: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/arrive-dropoff`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        generateDropoffQr: builder.mutation<DeliveryQrPayload, string>({
            query: (id) => ({
                url: `/deliveries/${id}/dropoff-qr`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }],
        }),
        scanDropoffQr: builder.mutation<Delivery, { id: string; qrData: string }>({
            query: ({ id, qrData }) => ({
                url: `/deliveries/${id}/scan-dropoff-qr`,
                method: 'POST',
                body: { qrData },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        buyerConfirmDropoff: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/buyer-confirm-dropoff`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        driverConfirmDropoff: builder.mutation<Delivery, string>({
            query: (id) => ({
                url: `/deliveries/${id}/driver-confirm-dropoff`,
                method: 'PATCH',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Delivery', id }, { type: 'Order', id: 'LIST' }],
        }),
        updateDeliveryLocation: builder.mutation<
            Delivery,
            { id: string; latitude: number; longitude: number }
        >({
            query: ({ id, latitude, longitude }) => ({
                url: `/deliveries/${id}/location`,
                method: 'PATCH',
                body: { latitude, longitude },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Delivery', id }],
        }),
    }),
});

export const {
    useGetOngoingDeliveriesQuery,
    useGetDeliveryQuery,
    useGetDeliveryTrackingQuery,
    useGetDeliveryMessagesQuery,
    useSendDeliveryMessageMutation,
    useAcceptDeliveryMutation,
    useGeneratePickupQrMutation,
    useScanPickupQrMutation,
    useDriverArrivePickupMutation,
    useSellerConfirmPickupMutation,
    useDriverConfirmPickupMutation,
    useDriverArriveDropoffMutation,
    useGenerateDropoffQrMutation,
    useScanDropoffQrMutation,
    useBuyerConfirmDropoffMutation,
    useDriverConfirmDropoffMutation,
    useUpdateDeliveryLocationMutation,
} = deliveriesApi;
