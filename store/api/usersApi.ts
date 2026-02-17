import { User } from '@/types/user';
import { KycEligibilityResponse, KycPayload, KycStatusResponse, SubmitKycResponse } from '@/types/kyc';
import { baseApi } from './baseApi';

export const usersApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getProfile: builder.query<User, void>({
            query: () => '/users/profile',
            providesTags: ['User'],
        }),
        getAllUsers: builder.query<User[], void>({
            query: () => '/users',
            providesTags: ['User'],
        }),
        getMyKyc: builder.query<KycStatusResponse, void>({
            query: () => '/users/kyc',
            providesTags: ['KYC'],
        }),
        getMyKycEligibility: builder.query<KycEligibilityResponse, void>({
            query: () => '/users/kyc/eligibility',
            providesTags: ['KYC'],
        }),
        submitKyc: builder.mutation<SubmitKycResponse, KycPayload>({
            query: (body) => ({
                url: '/users/kyc',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['KYC', 'User'],
        }),
    }),
});

export const {
    useGetProfileQuery,
    useGetAllUsersQuery,
    useGetMyKycQuery,
    useGetMyKycEligibilityQuery,
    useSubmitKycMutation,
} = usersApi;
