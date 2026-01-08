import { tokenService } from '@/services/tokenService';
import {
    AuthTokens,
    LoginRequest,
    RegisterRequest,
    RequestOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse
} from '@/types/auth';
import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        requestOtp: builder.mutation<RequestOtpResponse, string>({
            query: (phone) => ({
                url: '/auth/request-otp',
                method: 'POST',
                body: { phone },
            }),
        }),
        verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
            query: (credentials) => ({
                url: '/auth/verify-otp',
                method: 'POST',
                body: credentials,
            }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.tokens) {
                        await tokenService.saveTokens(data.tokens.access_token, data.tokens.refresh_token);
                    }
                } catch (error) {
                    console.error('Verify OTP error:', error);
                }
            },
            invalidatesTags: ['User'],
        }),
        register: builder.mutation<AuthTokens, RegisterRequest>({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    await tokenService.saveTokens(data.access_token, data.refresh_token);
                } catch (error) {
                    console.error('Register error:', error);
                }
            },
            invalidatesTags: ['User'],
        }),
        login: builder.mutation<AuthTokens, LoginRequest>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    await tokenService.saveTokens(data.access_token, data.refresh_token);
                } catch (error) {
                    console.error('Login error:', error);
                }
            },
            invalidatesTags: ['User'],
        }),
        logout: builder.mutation<void, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    await queryFulfilled;
                    await tokenService.clearTokens();
                } catch (error) {
                    await tokenService.clearTokens();
                }
            },
            invalidatesTags: ['User'],
        }),
        refreshToken: builder.mutation<AuthTokens, string>({
            query: (oldAccessToken) => ({
                url: '/auth/refresh/accessToken',
                method: 'POST',
                body: { oldAccessToken },
            }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    await tokenService.saveTokens(data.access_token, data.refresh_token);
                } catch (error) {
                    console.error('Refresh Token error:', error);
                    // If refresh fails, we might want to logout, but baseApi logic handles 401s usually
                }
            },
        }),
    }),
});

export const {
    useRequestOtpMutation,
    useVerifyOtpMutation,
    useRegisterMutation,
    useLoginMutation,
    useLogoutMutation,
    useRefreshTokenMutation,
} = authApi;
