import { baseApi } from './baseApi';

export interface RequestOtpDto {
    phone: string;
}

export interface VerifyOtpDto {
    phone: string;
    otp: string;
}

export interface RegisterDto {
    phone: string;
    firstName: string;
    lastName: string;
    preferredCategoryIds: string[];
    image?: string;
    pin: string;
}

export interface LoginDto {
    phone: string;
    pin: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
}

export interface User {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
    verified_phone?: string;
    email?: string;
    image?: string;
    roles: string[];
    rating?: number;
    preferredCategories?: string[];
}

export const authApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        requestOtp: builder.mutation<{ message: string; phone: string; status: string }, RequestOtpDto>({
            query: (dto) => ({
                url: '/auth/request-otp',
                method: 'POST',
                body: dto,
            }),
        }),
        verifyOtp: builder.mutation<{ phone: string; status: string }, VerifyOtpDto>({
            query: (dto) => ({
                url: '/auth/verify-otp',
                method: 'POST',
                body: dto,
            }),
        }),
        register: builder.mutation<AuthResponse, RegisterDto>({
            query: (dto) => ({
                url: '/auth/register',
                method: 'POST',
                body: dto,
            }),
        }),
        login: builder.mutation<AuthResponse, LoginDto>({
            query: (dto) => ({
                url: '/auth/login',
                method: 'POST',
                body: dto,
            }),
        }),
        logout: builder.mutation<{ message: string }, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
        }),
        getProfile: builder.query<User, void>({
            query: () => '/users/profile',
            providesTags: ['User'],
        }),
        refreshToken: builder.mutation<AuthResponse, { refresh_token: string }>({
            query: () => ({
                url: '/auth/refresh/accessToken',
                method: 'POST',
            }),
        }),
        updateFcmToken: builder.mutation<User, { fcmToken: string }>({
            query: ({ fcmToken }) => ({
                url: '/auth/fcm-token',
                method: 'PATCH',
                body: { fcmToken },
            }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const {
    useRequestOtpMutation,
    useVerifyOtpMutation,
    useRegisterMutation,
    useLoginMutation,
    useLogoutMutation,
    useGetProfileQuery,
    useRefreshTokenMutation,
    useUpdateFcmTokenMutation,
} = authApi;
