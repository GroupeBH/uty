import { AppConfigResponse } from '@/types/appConfig';
import { baseApi } from './baseApi';

export const appConfigApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getAppConfig: builder.query<AppConfigResponse, void>({
            query: () => '/app-config',
        }),
    }),
});

export const { useGetAppConfigQuery } = appConfigApi;
