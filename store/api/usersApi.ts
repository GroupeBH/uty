import { User } from '@/types/user';
import { baseApi } from './baseApi';

export const usersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getProfile: builder.query<User, void>({
            query: () => '/users/profile',
            providesTags: ['User'],
        }),
        updateFcmToken: builder.mutation<User, string>({
            query: (fcmToken) => ({
                url: '/auth/fcm-token', // Backend route is on auth controller but logically user update
                method: 'PATCH',
                body: { fcmToken },
            }),
            invalidatesTags: ['User'],
        }),
        getAllUsers: builder.query<User[], void>({
            query: () => '/users',
            providesTags: ['User'],
        }),
    }),
});

export const {
    useGetProfileQuery,
    useUpdateFcmTokenMutation,
    useGetAllUsersQuery
} = usersApi;
