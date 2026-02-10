import { Currency } from '@/types/currency';
import { baseApi } from './baseApi';

export const currenciesApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getCurrencies: builder.query<Currency[], void>({
            query: () => '/currencies',
            providesTags: ['Currency'],
        }),
        getCurrencyByCode: builder.query<Currency, string>({
            query: (code) => `/currencies/code/${code}`,
            providesTags: ['Currency'],
        }),
    }),
});

export const {
    useGetCurrenciesQuery,
    useGetCurrencyByCodeQuery,
} = currenciesApi;
