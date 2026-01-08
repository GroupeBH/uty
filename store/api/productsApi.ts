/**
 * API des produits - CRUD avec mise à jour optimiste
 */

import { ApiResponse, PaginatedResponse, Product, ProductFilters } from '@/types';
import { baseApi } from './baseApi';

export const productsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Liste des produits avec filtres et pagination
         */
        getProducts: builder.query<PaginatedResponse<Product>, ProductFilters & { page?: number; limit?: number }>({
            query: (params) => ({
                url: '/products',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Product' as const, id })),
                        { type: 'Product', id: 'LIST' },
                    ]
                    : [{ type: 'Product', id: 'LIST' }],
        }),

        /**
         * Détails d'un produit
         */
        getProduct: builder.query<ApiResponse<Product>, string>({
            query: (id) => `/products/${id}`,
            providesTags: (result, error, id) => [{ type: 'Product', id }],
        }),

        /**
         * Créer un produit (vendeur uniquement)
         */
        createProduct: builder.mutation<ApiResponse<Product>, Partial<Product>>({
            query: (product) => ({
                url: '/products',
                method: 'POST',
                body: product,
            }),
            invalidatesTags: [{ type: 'Product', id: 'LIST' }],
        }),

        /**
         * Mettre à jour un produit (vendeur uniquement)
         */
        updateProduct: builder.mutation<ApiResponse<Product>, { id: string; data: Partial<Product> }>({
            query: ({ id, data }) => ({
                url: `/products/${id}`,
                method: 'PATCH',
                body: data,
            }),
            // Mise à jour optimiste
            async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    productsApi.util.updateQueryData('getProduct', id, (draft) => {
                        Object.assign(draft.data, data);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }],
        }),

        /**
         * Mettre à jour le stock d'un produit (mise à jour optimiste)
         */
        updateProductStock: builder.mutation<ApiResponse<Product>, { id: string; stock: number }>({
            query: ({ id, stock }) => ({
                url: `/products/${id}/stock`,
                method: 'PATCH',
                body: { stock },
            }),
            // Mise à jour optimiste pour une UX fluide
            async onQueryStarted({ id, stock }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    productsApi.util.updateQueryData('getProduct', id, (draft) => {
                        draft.data.stock = stock;
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }],
        }),

        /**
         * Supprimer un produit (vendeur uniquement)
         */
        deleteProduct: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `/products/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'Product', id },
                { type: 'Product', id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetProductsQuery,
    useGetProductQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useUpdateProductStockMutation,
    useDeleteProductMutation,
} = productsApi;
