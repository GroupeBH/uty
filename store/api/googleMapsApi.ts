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

type DirectionsWaypoint = {
    address?: string;
    lat?: number;
    lng?: number;
    placeId?: string;
};

type DirectionsRequest = {
    origin: DirectionsWaypoint;
    destination: DirectionsWaypoint;
    waypoints?: DirectionsWaypoint[];
    optimizeWaypoints?: boolean;
    avoid?: string[];
    alternatives?: boolean;
    language?: string;
    region?: string;
    departureTime?: number;
    arrivalTime?: number;
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
        getDirections: builder.mutation<any, DirectionsRequest>({
            query: (body) => ({
                url: '/google-maps/directions',
                method: 'POST',
                body,
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
    useGetDirectionsMutation,
} = googleMapsApi;
