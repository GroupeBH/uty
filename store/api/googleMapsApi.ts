import { baseApi } from './baseApi';

type PlacesAutocompleteParams = {
    input: string;
    locationLat?: number;
    locationLng?: number;
    radius?: number;
    language?: string;
    region?: string;
};

type GeocodeParams = {
    address: string;
    region?: string;
    language?: string;
};

type ReverseGeocodeParams = {
    lat: number;
    lng: number;
    language?: string;
};

type PlaceDetailsParams = {
    placeId: string;
    language?: string;
};

type PlacesSearchParams = {
    query: string;
    locationLat?: number;
    locationLng?: number;
    radius?: number;
    language?: string;
};

export const googleMapsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        placesAutocomplete: builder.query<any, PlacesAutocompleteParams>({
            query: (params) => ({
                url: '/google-maps/places/autocomplete',
                params,
            }),
        }),
        geocode: builder.query<any, GeocodeParams>({
            query: (params) => ({
                url: '/google-maps/geocode',
                params,
            }),
        }),
        reverseGeocode: builder.query<any, ReverseGeocodeParams>({
            query: (params) => ({
                url: '/google-maps/reverse-geocode',
                params,
            }),
        }),
        placesDetails: builder.query<any, PlaceDetailsParams>({
            query: (params) => ({
                url: '/google-maps/places/details',
                params,
            }),
        }),
        placesSearch: builder.query<any, PlacesSearchParams>({
            query: (params) => ({
                url: '/google-maps/places/search',
                params,
            }),
        }),
    }),
});

export const {
    useLazyPlacesAutocompleteQuery,
    useLazyGeocodeQuery,
    useLazyReverseGeocodeQuery,
    useLazyPlacesDetailsQuery,
    useLazyPlacesSearchQuery,
} = googleMapsApi;
