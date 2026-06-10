import { KINSHASA_ADDRESS_EXAMPLES, KINSHASA_DEFAULT_CENTER, KINSHASA_FEATURED_COMMUNES, KINSHASA_FEATURED_LANDMARKS } from '@/constants/kinshasa';
import { useGetAppConfigQuery } from '@/store/api/appConfigApi';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { BottomActionBar } from '@/components/ui/BottomActionBar';
import { normalizeTextInputValue } from '@/utils/textInput';
import {
    useLazyGeocodeQuery,
    useLazyPlacesAutocompleteQuery,
    useLazyPlacesSearchQuery,
    useLazyReverseGeocodeQuery,
} from '@/store/api/googleMapsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

type MapPickerLocation = {
    latitude: number;
    longitude: number;
    address?: string;
};

type MapSearchResult = {
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
};

type MapPickerModalProps = {
    visible: boolean;
    initialLocation?: MapPickerLocation;
    onClose: () => void;
    onConfirm: (location: MapPickerLocation) => void;
};

const normalizeString = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const firstNonEmptyString = (...values: unknown[]): string => {
    for (const value of values) {
        const normalized = normalizeString(value);
        if (normalized) return normalized;
    }
    return '';
};

const toNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatCoordinateAddress = (latitude: number, longitude: number) =>
    `Point GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const formatExpoAddress = (address?: Partial<Location.LocationGeocodedAddress> | null): string => {
    if (!address) return '';
    const streetLine = [address.streetNumber, address.street].filter(Boolean).join(' ').trim();
    return Array.from(
        new Set(
            [
                (address as any)?.name,
                streetLine,
                address.district,
                address.city || address.subregion,
                address.region,
                address.country,
            ]
                .map((value) => normalizeString(value))
                .filter(Boolean),
        ),
    ).join(', ');
};

const getResponseAddress = (response: any, fallback?: string): string =>
    firstNonEmptyString(
        response?.formattedAddress,
        response?.formatted_address,
        response?.address,
        response?.name,
        response?.result?.formattedAddress,
        response?.result?.formatted_address,
        response?.data?.formattedAddress,
        response?.data?.formatted_address,
        fallback,
    );

const getResponseLatitude = (response: any): number | null =>
    toNumber(response?.lat) ??
    toNumber(response?.latitude) ??
    toNumber(response?.geometry?.location?.lat) ??
    toNumber(response?.result?.lat) ??
    toNumber(response?.result?.geometry?.location?.lat) ??
    toNumber(response?.data?.lat);

const getResponseLongitude = (response: any): number | null =>
    toNumber(response?.lng) ??
    toNumber(response?.longitude) ??
    toNumber(response?.geometry?.location?.lng) ??
    toNumber(response?.result?.lng) ??
    toNumber(response?.result?.geometry?.location?.lng) ??
    toNumber(response?.data?.lng);

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
    visible,
    initialLocation,
    onClose,
    onConfirm,
}) => {
    const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { data: appConfig } = useGetAppConfigQuery();
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<MapPickerLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [suggestionsVisible, setSuggestionsVisible] = useState(false);
    const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
    const [mapRegion, setMapRegion] = useState<Region | null>(null);
    const [isEditingSearch, setIsEditingSearch] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const mapRef = useRef<MapView | null>(null);
    const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastGeocodedRef = useRef<MapPickerLocation | null>(null);
    const isUpdatingFromMapRef = useRef(false);
    const pinLiftAnim = useRef(new Animated.Value(0)).current;

    const [triggerAutocomplete, { data: autocompleteData, isFetching: isAutocompleteLoading }] =
        useLazyPlacesAutocompleteQuery();
    const [triggerGeocode, { isFetching: isGeocoding }] = useLazyGeocodeQuery();
    const [triggerReverseGeocode, { isFetching: isReverseGeocoding }] =
        useLazyReverseGeocodeQuery();
    const [triggerTextSearch, { isFetching: isTextSearching }] = useLazyPlacesSearchQuery();

    const suggestions = useMemo(() => {
        return Array.isArray(autocompleteData) ? autocompleteData : [];
    }, [autocompleteData]);
    const defaultCenter = useMemo(
        () => ({
            latitude: appConfig?.geography?.defaultCenter?.latitude ?? KINSHASA_DEFAULT_CENTER.latitude,
            longitude: appConfig?.geography?.defaultCenter?.longitude ?? KINSHASA_DEFAULT_CENTER.longitude,
        }),
        [appConfig?.geography?.defaultCenter?.latitude, appConfig?.geography?.defaultCenter?.longitude],
    );
    const featuredHints = useMemo(() => {
        const configHints = [
            ...(appConfig?.geography?.featuredLandmarks || []),
            ...(appConfig?.geography?.featuredCommunes || []),
        ];
        const fallbackHints = [...KINSHASA_FEATURED_LANDMARKS, ...KINSHASA_FEATURED_COMMUNES];
        return Array.from(new Set([...configHints, ...fallbackHints])).slice(0, 10);
    }, [appConfig?.geography?.featuredCommunes, appConfig?.geography?.featuredLandmarks]);
    const addressExample = appConfig?.geography?.addressExamples?.[0] || KINSHASA_ADDRESS_EXAMPLES[0];
    const selectedAddress = normalizeString(selected?.address);
    const selectedDisplayAddress =
        selected && selectedAddress.toLowerCase() !== 'adresse non trouvée'
            ? selectedAddress
            : selected
              ? formatCoordinateAddress(selected.latitude, selected.longitude)
              : '';
    const coordinateLabel = selected
        ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
        : '';
    const footerTitle = isPanning
        ? 'Point en cours de selection'
        : isReverseGeocoding
          ? "Recherche de l'adresse"
          : selectedDisplayAddress
            ? 'Point selectionne'
            : 'Deplacez la carte pour choisir un point';
    const footerSubtitle = isPanning
        ? 'Relachez la carte quand le marqueur est sur le bon endroit.'
        : isReverseGeocoding
          ? 'Nous recuperons le libelle du lieu.'
          : selectedDisplayAddress || 'Touchez un point, cherchez une adresse ou utilisez votre position.';
    const pinAnimatedStyle = {
        transform: [
            {
                translateY: pinLiftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -18],
                }),
            },
            {
                scale: pinLiftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                }),
            },
        ],
    };
    const pinShadowAnimatedStyle = {
        opacity: pinLiftAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.22, 0.1],
        }),
        transform: [
            {
                scale: pinLiftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.55],
                }),
            },
        ],
    };

    const liftPin = () => {
        Animated.spring(pinLiftAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 90,
        }).start();
    };

    const dropPin = () => {
        Animated.spring(pinLiftAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 75,
        }).start();
    };

    useEffect(() => {
        if (!visible) {
            return;
        }

        setSearchResults([]);
        setSuggestionsVisible(false);


        if (initialLocation) {
            setSelected(initialLocation);
            setSearchQuery(initialLocation.address || '');
            return;
        }

        const fetchCurrentLocation = async () => {
            setIsLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                try {
                    const current = await Location.getCurrentPositionAsync({});
                    const location = {
                        latitude: current.coords.latitude,
                        longitude: current.coords.longitude,
                    };
                    scheduleReverseGeocode(location.latitude, location.longitude);
                } catch (error) {
                    setSelected(defaultCenter);
                }
            } else {
                setSelected(defaultCenter);
            }
            setIsLocating(false);
        };

        fetchCurrentLocation();
    }, [visible, initialLocation, defaultCenter]);

    useEffect(() => {
        if (!visible) {
            pinLiftAnim.setValue(0);
        }
    }, [visible, pinLiftAnim]);

    useEffect(() => {
        return () => {
            if (reverseGeocodeTimer.current) {
                clearTimeout(reverseGeocodeTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!selected) return;
        if (isUpdatingFromMapRef.current) {
            isUpdatingFromMapRef.current = false;
            return;
        }
        const nextRegion: Region = {
            latitude: selected.latitude,
            longitude: selected.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setMapRegion(nextRegion);
        if (mapRef.current) {
            mapRef.current.animateToRegion(nextRegion, 500);
        }
    }, [selected]);

    useEffect(() => {
        if (!visible) return;
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestionsVisible(false);
            setSearchResults([]);
            return;
        }

        const timeout = setTimeout(() => {
            triggerAutocomplete({
                input: searchQuery,
                locationLat: defaultCenter.latitude,
                locationLng: defaultCenter.longitude,
                radius: 100000,
                language: 'fr',
                region: 'cd',
            });
        }, 350);

        return () => clearTimeout(timeout);
    }, [defaultCenter, searchQuery, triggerAutocomplete, visible]);

    const reverseGeocodeLocation = async (
        latitude: number,
        longitude: number,
        shouldUpdateSearch = true
    ) => {
        try {
            const response = await triggerReverseGeocode({
                lat: latitude,
                lng: longitude,
                language: "fr",
            }).unwrap();
            let address = getResponseAddress(response);
            if (!address) {
                try {
                    const [expoAddress] = await Location.reverseGeocodeAsync({ latitude, longitude });
                    address = formatExpoAddress(expoAddress);
                } catch {
                    address = '';
                }
            }
            const resolvedAddress = address || formatCoordinateAddress(latitude, longitude);
            setSelected((prev) =>
                prev
                    ? { ...prev, latitude, longitude, address: resolvedAddress }
                    : { latitude, longitude, address: resolvedAddress },
            );
            if (address && shouldUpdateSearch && !isEditingSearch) {
                setSearchQuery(address);
            }
        } catch {
            const fallbackAddress = formatCoordinateAddress(latitude, longitude);
            setSelected((prev) =>
                prev
                    ? { ...prev, latitude, longitude, address: fallbackAddress }
                    : { latitude, longitude, address: fallbackAddress },
            );
        }
    };

    const scheduleReverseGeocode = (
        latitude: number,
        longitude: number,
        fromMap = false
    ) => {
        if (fromMap) {
            isUpdatingFromMapRef.current = true;
        } else {
            isUpdatingFromMapRef.current = false;
        }

        const isSamePoint =
            selected &&
            Math.abs(selected.latitude - latitude) < 0.000001 &&
            Math.abs(selected.longitude - longitude) < 0.000001;
        if (isSamePoint && selected?.address) {
            isUpdatingFromMapRef.current = false;
            return;
        }

        setSelected((prev) =>
            prev
                ? {
                      ...prev,
                      latitude,
                      longitude,
                      address: prev.address || formatCoordinateAddress(latitude, longitude),
                  }
                : { latitude, longitude, address: formatCoordinateAddress(latitude, longitude) },
        );

        const last = lastGeocodedRef.current;
        if (last) {
            const delta =
                Math.abs(last.latitude - latitude) + Math.abs(last.longitude - longitude);
            if (delta < 0.00005) {
                return;
            }
        }

        lastGeocodedRef.current = { latitude, longitude };
        if (reverseGeocodeTimer.current) {
            clearTimeout(reverseGeocodeTimer.current);
        }
        reverseGeocodeTimer.current = setTimeout(() => {
            reverseGeocodeLocation(latitude, longitude, true);
        }, 500);
    };

    const handleRegionChangeComplete = (region: Region) => {
        setSuggestionsVisible(false);
        setIsPanning(false);
        dropPin();
        scheduleReverseGeocode(region.latitude, region.longitude, true);
    };

    const handleRegionChange = (region: Region) => {
        if (!isPanning) {
            setIsPanning(true);
            liftPin();
        }
        setSuggestionsVisible(false);
    };

    const handleMapPress = (event: any) => {
        const coords = event?.nativeEvent?.coordinate;
        if (!coords) return;
        const { latitude, longitude } = coords;
        setSuggestionsVisible(false);
        if (mapRef.current) {
            mapRef.current.animateToRegion(
                {
                    latitude,
                    longitude,
                    latitudeDelta: mapRegion?.latitudeDelta ?? 0.01,
                    longitudeDelta: mapRegion?.longitudeDelta ?? 0.01,
                },
                250
            );
        } else {
            scheduleReverseGeocode(latitude, longitude, true);
        }
    };

    const handleSuggestionSelect = async (description: string) => {
        setSearchQuery(description);
        setSuggestionsVisible(false);
        setSearchResults([]);
        try {
            const response = await triggerGeocode({
                address: description,
                language: "fr",
                region: 'cd',
            }).unwrap();
            const latitude = getResponseLatitude(response);
            const longitude = getResponseLongitude(response);
            if (typeof latitude === "number" && typeof longitude === "number") {
                setSelected({
                    latitude,
                    longitude,
                    address: getResponseAddress(response, description),
                });
            }
        } catch {
            // noop
        }
    };

    const handleSearchResultSelect = (result: MapSearchResult) => {
        setSelected({
            latitude: result.latitude,
            longitude: result.longitude,
            address: result.address || result.title || formatCoordinateAddress(result.latitude, result.longitude),
        });
        setSearchQuery(result.title);
        setSearchResults([]);
        setSuggestionsVisible(false);
    };

    const handleSearchSubmit = async (forcedQuery?: string) => {
        const query = (forcedQuery ?? searchQuery).trim();
        if (!query) {
            setSearchResults([]);
            setSuggestionsVisible(false);
            return;
        }

        setSuggestionsVisible(false);
        try {
            const response = await triggerTextSearch({
                query,
                language: "fr",
                locationLat: defaultCenter.latitude,
                locationLng: defaultCenter.longitude,
                radius: 100000,
            }).unwrap();
            const results = (Array.isArray(response) ? response : [])
                .map((item: any, index: number) => {
                    const latitude = getResponseLatitude(item);
                    const longitude = getResponseLongitude(item);
                    if (typeof latitude !== "number" || typeof longitude !== "number") {
                        return null;
                    }
                    const title = firstNonEmptyString(item?.name, item?.mainText, item?.formattedAddress, query);
                    const address = getResponseAddress(item, title || query);
                    return {
                        id: item?.placeId || `${latitude}-${longitude}-${index}`,
                        title,
                        address: address || formatCoordinateAddress(latitude, longitude),
                        latitude,
                        longitude,
                    } as MapSearchResult;
                })
                .filter(Boolean)
                .slice(0, 6) as MapSearchResult[];

            setSearchResults(results);
            if (results.length > 0) {
                handleSearchResultSelect(results[0]);
                return;
            }

            const geocodeResponse = await triggerGeocode({
                address: `${query}, Kinshasa, République démocratique du Congo`,
                language: "fr",
                region: 'cd',
            }).unwrap();
            const latitude = getResponseLatitude(geocodeResponse);
            const longitude = getResponseLongitude(geocodeResponse);
            if (typeof latitude === 'number' && typeof longitude === 'number') {
                handleSearchResultSelect({
                    id: `geocode-${latitude}-${longitude}`,
                    title: query,
                    address:
                        getResponseAddress(geocodeResponse, query) ||
                        formatCoordinateAddress(latitude, longitude),
                    latitude,
                    longitude,
                });
            }
        } catch {
            setSearchResults([]);
        }
    };

    const handleSearchSubmitEditing = () => {
        void handleSearchSubmit();
    };

    const handleHintPress = (value: string) => {
        setSearchQuery(value);
        setSuggestionsVisible(false);
        void handleSearchSubmit(value);
    };

    const handleUseCurrentLocation = async () => {
        if (isLocating) return null;
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return null;
            }
            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const location = {
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
            };
            scheduleReverseGeocode(location.latitude, location.longitude);
            return location;
        } catch {
            return null;
        } finally {
            setIsLocating(false);
        }
    };

    const handleConfirm = async () => {
        if (isConfirming) return;
        setIsConfirming(true);
        try {
            let finalSelection = selected;
            if (!finalSelection) {
                const currentLocation = await handleUseCurrentLocation();
                if (currentLocation) {
                    finalSelection = {
                        ...currentLocation,
                        address: `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`,
                    };
                }
            }

            if (!finalSelection) {
                return;
            }

            const finalAddress =
                firstNonEmptyString(finalSelection.address).toLowerCase() === 'adresse non trouvée'
                    ? ''
                    : firstNonEmptyString(finalSelection.address);
            onConfirm({
                ...finalSelection,
                address:
                    finalAddress ||
                    `${finalSelection.latitude.toFixed(5)}, ${finalSelection.longitude.toFixed(5)}`,
            });
            onClose();
        } finally {
            setIsConfirming(false);
        }
    };

    const centerCoordinate = selected
        ? [selected.longitude, selected.latitude]
        : [defaultCenter.longitude, defaultCenter.latitude];

    const showGoogleKeyWarning =
        Platform.OS === 'android' &&
        (!googleMapsKey || googleMapsKey === 'your_google_maps_api_key_here');

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                        <Ionicons name="arrow-back" size={23} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerCopy}>
                        <Text style={styles.headerTitle}>Choisir un point</Text>
                        <Text style={styles.headerSubtitle}>Recherche, carte ou position actuelle</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.headerButton, styles.headerConfirmButton]}
                        onPress={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <Ionicons name="checkmark" size={22} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.searchWrapper}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={18} color={Colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={addressExample}
                            placeholderTextColor={Colors.gray400}
                            value={searchQuery}
                            onChangeText={(value) => {
                                setSearchQuery(normalizeTextInputValue(value));
                                setSuggestionsVisible(true);
                                if (searchResults.length > 0) {
                                    setSearchResults([]);
                                }
                            }}
                            returnKeyType="search"
                            onSubmitEditing={handleSearchSubmitEditing}
                            onFocus={() => setIsEditingSearch(true)}
                            onBlur={() => {
                                setIsEditingSearch(false);
                                setSuggestionsVisible(false);
                            }}
                            autoComplete="off"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {(isAutocompleteLoading || isGeocoding || isTextSearching) && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        )}
                        {searchQuery.trim().length > 0 &&
                        !(isAutocompleteLoading || isGeocoding || isTextSearching) ? (
                            <TouchableOpacity
                                style={styles.searchIconButton}
                                onPress={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setSuggestionsVisible(false);
                                }}
                            >
                                <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.searchSubmitButton}
                            onPress={() => handleSearchSubmit()}
                            disabled={isAutocompleteLoading || isGeocoding || isTextSearching}
                        >
                            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    {!searchQuery.trim() ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hintsScrollContent}
                        >
                            {featuredHints.map((hint) => (
                                <TouchableOpacity
                                    key={hint}
                                    style={styles.hintChip}
                                    onPress={() => handleHintPress(hint)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                                    <Text style={styles.hintChipText}>{hint}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : null}
                    <View style={styles.pickerHint}>
                        <Ionicons name="move-outline" size={16} color={Colors.primary} />
                        <Text style={styles.searchHelpText}>
                            Deplacez la carte, touchez un point ou cherchez une adresse. Confirmez quand le marqueur est bien place.
                        </Text>
                    </View>
                    {suggestionsVisible && suggestions.length > 0 && (
                        <View style={styles.suggestions}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item: any) => item.placeId || item.description}
                                renderItem={({ item }: any) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSuggestionSelect(item.description)}
                                    >
                                        <Ionicons name="location-outline" size={18} color={Colors.primary} />
                                        <Text style={styles.suggestionText} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                    {!suggestionsVisible && searchResults.length > 0 && (
                        <View style={styles.suggestions}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSearchResultSelect(item)}
                                    >
                                        <Ionicons name="location-outline" size={18} color={Colors.primary} />
                                        <View style={styles.suggestionContent}>
                                            <Text style={styles.suggestionText} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.suggestionSubtext} numberOfLines={1}>
                                                {item.address}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                        style={styles.map}
                        initialRegion={
                            mapRegion || {
                                latitude: centerCoordinate[1],
                                longitude: centerCoordinate[0],
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }
                        }
                        onRegionChangeComplete={handleRegionChangeComplete}
                        onRegionChange={handleRegionChange}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton
                    />

                    <View style={styles.centerPinContainer} pointerEvents="none">
                        <Animated.View style={[styles.centerPinGraphic, pinAnimatedStyle]}>
                            <View style={styles.centerPinHalo} />
                            <Ionicons name="location" size={40} color={Colors.primary} style={styles.centerPinIcon} />
                        </Animated.View>
                        <Animated.View style={[styles.centerPinShadow, pinShadowAnimatedStyle]} />
                    </View>

                    {showGoogleKeyWarning && (
                        <View style={styles.mapWarning}>
                            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
                            <Text style={styles.mapWarningText}>
                                Ajoutez une clé Google Maps dans <Text style={styles.mono}>.env</Text> pour Android
                            </Text>
                        </View>
                    )}

                    <View style={styles.mapActions}>
                        <TouchableOpacity
                            style={styles.mapActionButton}
                            onPress={handleUseCurrentLocation}
                            disabled={isLocating}
                        >
                            <LinearGradient colors={Gradients.primary} style={styles.mapActionGradient}>
                                {isLocating || isReverseGeocoding ? (
                                    <ActivityIndicator size="small" color={Colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="locate-outline" size={18} color={Colors.white} />
                                        <Text style={styles.mapActionText}>Ma position</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {selected && (
                    <BottomActionBar style={styles.footer}>
                        <View style={styles.footerInfo}>
                            <View style={styles.footerIcon}>
                            {isPanning || isReverseGeocoding ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <Ionicons name="pin" size={18} color={Colors.primary} />
                            )}
                            </View>
                            <View style={styles.footerCopy}>
                                <Text style={styles.footerTitle} numberOfLines={1}>
                                    {footerTitle}
                                </Text>
                            <Text style={styles.footerText} numberOfLines={2}>
                                {footerSubtitle}
                            </Text>
                                {coordinateLabel ? (
                                    <Text style={styles.footerCoords}>{coordinateLabel}</Text>
                                ) : null}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
                            onPress={handleConfirm}
                            disabled={isConfirming}
                        >
                            <LinearGradient colors={Gradients.primary} style={styles.confirmGradient}>
                                {isConfirming ? (
                                    <ActivityIndicator size="small" color={Colors.white} />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={17} color={Colors.white} />
                                        <Text style={styles.confirmText}>Confirmer</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </BottomActionBar>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    headerCopy: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    headerSubtitle: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerConfirmButton: {
        backgroundColor: Colors.primary + '10',
    },
    searchWrapper: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        zIndex: 5,
    },
    hintsScrollContent: {
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
        paddingRight: Spacing.md,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    hintChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
    },
    hintChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
    },
    searchHelpText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
    },
    searchIconButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchSubmitButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },
    pickerHint: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary + '08',
        borderWidth: 1,
        borderColor: Colors.primary + '12',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    suggestions: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.xs,
        maxHeight: 220,
        ...Shadows.md,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    suggestionText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionSubtext: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    mapContainer: {
        flex: 1,
        marginTop: Spacing.md,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    centerPinContainer: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 56,
        height: 72,
        marginLeft: -28,
        marginTop: -52,
        alignItems: "center",
        justifyContent: "center",
    },
    centerPinGraphic: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerPinHalo: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        opacity: 0.15,
    },
    centerPinIcon: {
        textShadowColor: 'rgba(0, 0, 0, 0.18)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
    },
    centerPinShadow: {
        width: 20,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        marginTop: -4,
    },
    mapActions: {
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg,
    },
    mapWarning: {
        position: 'absolute',
        left: Spacing.lg,
        right: Spacing.lg,
        top: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    mapWarningText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    mapActionButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    mapActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    mapActionText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    mapPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    mapPlaceholderTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
        marginTop: Spacing.md,
    },
    mapPlaceholderText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.sm,
        lineHeight: 20,
    },
    mono: {
        fontFamily: 'monospace',
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    footerIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
    },
    footerCopy: {
        flex: 1,
        minWidth: 0,
    },
    footerTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    footerText: {
        flex: 1,
        marginTop: 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        lineHeight: 19,
    },
    footerCoords: {
        marginTop: 4,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    confirmButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    confirmButtonDisabled: {
        opacity: 0.68,
    },
    confirmGradient: {
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
    },
    confirmText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});
