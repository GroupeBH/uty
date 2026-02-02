import { Category, Subcategory } from '@/types/category';
import { baseApi } from './baseApi';

export const categoriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<Category[], void>({
            query: () => '/categories',
            providesTags: ['Categories'],
        }),
        getCategoryById: builder.query<Category, string>({
            query: (id) => `/categories/${id}`,
            providesTags: (result, error, id) => [{ type: 'Category', id }],
        }),
        getCategoryAttributes: builder.query<any[], string>({
            query: (categoryId) => `/categories/${categoryId}/attributes`,
            providesTags: (result, error, id) => [{ type: 'Category', id }],
        }),
        getCategoriesByParent: builder.query<Category[], string | null>({
            query: (parentId) => ({
                url: '/categories',
                params: parentId ? { parentId } : { parentId: null },
            }),
            providesTags: ['Categories'],
            transformResponse: (response: Category[], meta, arg) => {
                // Filter categories by parentId on client side if backend doesn't support it
                if (arg === null) {
                    return response.filter(cat => !cat.parentId);
                }
                return response.filter(cat => cat.parentId === arg);
            },
        }),
        getSubcategories: builder.query<Subcategory[], void>({
            query: () => '/subcategories',
            providesTags: ['Subcategory'],
        }),
        getSubcategoriesByCategory: builder.query<Subcategory[], string>({
            query: (categoryId) => `/subcategories/category/${categoryId}`,
            providesTags: ['Subcategory'],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryByIdQuery,
    useGetCategoryAttributesQuery,
    useGetCategoriesByParentQuery,
    useGetSubcategoriesQuery,
    useGetSubcategoriesByCategoryQuery
} = categoriesApi;
