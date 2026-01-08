import { Category, Subcategory } from '@/types/category';
import { baseApi } from './baseApi';

export const categoriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<Category[], void>({
            query: () => '/categories',
            providesTags: ['Category'],
        }),
        getCategoryById: builder.query<Category, string>({
            query: (id) => `/categories/${id}`,
            providesTags: (result, error, id) => [{ type: 'Category', id }],
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
    useGetSubcategoriesQuery,
    useGetSubcategoriesByCategoryQuery
} = categoriesApi;
