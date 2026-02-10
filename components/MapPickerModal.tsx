import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
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
    FlatList,
    Modal,
    Platform,
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

const DEFAULT_CENTER: MapPickerLocation = {
    latitude: 5.3365,
    longitude: -4.0244,
};

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
    visible,
    initialLocation,
    onClose,
    onConfirm,
}) => {
    const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<MapPickerLocation | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [suggestionsVisible, setSuggestionsVisible] = useState(false);
    const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
    const [mapRegion, setMapRegion] = useState<Region | null>(null);
    const [isEditingSearch, setIsEditingSearch] = useState(false);
    const mapRef = useRef<MapView | null>(null);
    const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastGeocodedRef = useRef<MapPickerLocation | null>(null);
    const isUpdatingFromMapRef = useRef(false);

    const [triggerAutocomplete, { data: autocompleteData, isFetching: isAutocompleteLoading }] =
        useLazyPlacesAutocompleteQuery();
    const [triggerGeocode, { isFetching: isGeocoding }] = useLazyGeocodeQuery();
    const [triggerReverseGeocode, { isFetching: isReverseGeocoding }] =
        useLazyReverseGeocodeQuery();
    const [triggerTextSearch, { isFetching: isTextSearching }] = useLazyPlacesSearchQuery();

    const suggestions = useMemo(() => {
        return Array.isArray(autocompleteData) ? autocompleteData : [];
    }, [autocompleteData]);

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
                    setSelected(DEFAULT_CENTER);
                }
            } else {
                setSelected(DEFAULT_CENTER);
            }
            setIsLocating(false);
        };

        fetchCurrentLocation();
    }, [visible, initialLocation]);

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
                language: 'fr',
            });
        }, 350);

        return () => clearTimeout(timeout);
    }, [searchQuery, triggerAutocomplete, visible]);

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
            const address = response?.formattedAddress;
            setSelected((prev) => (prev ? { ...prev, address } : { latitude, longitude, address }));
            if (address && shouldUpdateSearch && !isEditingSearch) {
                setSearchQuery(address);
            }
        } catch (error) {
            setSelected((prev) => (prev ? { ...prev } : { latitude, longitude }));
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
            prev ? { ...prev, latitude, longitude } : { latitude, longitude }
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
        scheduleReverseGeocode(region.latitude, region.longitude, true);
    };

    const handleRegionChange = (region: Region) => {
        if (!isPanning) {
            setIsPanning(true);
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
            const response = await triggerGeocode({ address: description, language: "fr" }).unwrap();
            const latitude = response?.lat;
            const longitude = response?.lng;
            if (typeof latitude === "number" && typeof longitude === "number") {
                setSelected({
                    latitude,
                    longitude,
                    address: response?.formattedAddress || description,
                });
            }
        } catch (error) {
            // noop
        }
    };

    const handleSearchResultSelect = (result: MapSearchResult) => {
        setSelected({
            latitude: result.latitude,
            longitude: result.longitude,
            address: result.address,
        });
        setSearchQuery(result.title);
        setSearchResults([]);
        setSuggestionsVisible(false);
    };

    const handleSearchSubmit = async () => {
        const query = searchQuery.trim();
        if (!query) {
            setSearchResults([]);
            setSuggestionsVisible(false);
            return;
        }

        setSuggestionsVisible(false);
        try {
            const response = await triggerTextSearch({ query, language: "fr" }).unwrap();
            const results = (Array.isArray(response) ? response : [])
                .map((item: any, index: number) => {
                    const latitude = item?.lat;
                    const longitude = item?.lng;
                    if (typeof latitude !== "number" || typeof longitude !== "number") {
                        return null;
                    }
                    return {
                        id: item?.placeId || `${latitude}-${longitude}-${index}`,
                        title: item?.name || item?.formattedAddress || query,
                        address: item?.formattedAddress || item?.name || query,
                        latitude,
                        longitude,
                    } as MapSearchResult;
                })
                .filter(Boolean)
                .slice(0, 6) as MapSearchResult[];

            setSearchResults(results);
            if (results.length === 1) {
                handleSearchResultSelect(results[0]);
            }
        } catch (error) {
            setSearchResults([]);
        }
    };

    const handleConfirm = () => {
        if (selected) {
            onConfirm(selected);
        }
        onClose();
    };

    const centerCoordinate = selected
        ? [selected.longitude, selected.latitude]
        : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

    const showGoogleKeyWarning =
        Platform.OS === 'android' &&
        (!googleMapsKey || googleMapsKey === 'your_google_maps_api_key_here');

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Choisir un point</Text>
                    <TouchableOpacity style={styles.headerButton} onPress={handleConfirm}>
                        <Ionicons name="checkmark" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchWrapper}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={18} color={Colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher une adresse"
                            placeholderTextColor={Colors.gray400}
                            value={searchQuery}
                            onChangeText={(value) => {
                                setSearchQuery(value);
                                setSuggestionsVisible(true);
                                if (searchResults.length > 0) {
                                    setSearchResults([]);
                                }
                            }}
                            returnKeyType="search"
                            onSubmitEditing={handleSearchSubmit}
                            onFocus={() => setIsEditingSearch(true)}
                            onBlur={() => {
                                setIsEditingSearch(false);
                                setSuggestionsVisible(false);
                            }}
                        />
                        {(isAutocompleteLoading || isGeocoding || isTextSearching) && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        )}
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
                        <View style={styles.centerPinHalo} />
                        <Ionicons name="location" size={38} color={Colors.primary} />
                        <View style={styles.centerPinShadow} />
                    </View>

                    {showGoogleKeyWarning && (
                        <View style={styles.mapWarning}>
                            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
                            <Text style={styles.mapWarningText}>
                                Ajoutez une clÃ© Google Maps dans <Text style={styles.mono}>.env</Text> pour Android
                            </Text>
                        </View>
                    )}

                    <View style={styles.mapActions}>
                        <TouchableOpacity
                            style={styles.mapActionButton}
                            onPress={async () => {
                                if (isLocating) return;
                                setIsLocating(true);
                                const { status } = await Location.requestForegroundPermissionsAsync();
                                if (status === 'granted') {
                                    const current = await Location.getCurrentPositionAsync({});
                                    const location = {
                                        latitude: current.coords.latitude,
                                        longitude: current.coords.longitude,
                                    };
                                    scheduleReverseGeocode(location.latitude, location.longitude);
                                }
                                setIsLocating(false);
                            }}
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
                    <View style={styles.footer}>
                        <View style={styles.footerInfo}>
                            {isPanning || isReverseGeocoding ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <Ionicons name="pin" size={18} color={Colors.primary} />
                            )}
                            <Text style={styles.footerText} numberOfLines={2}>
                                {isPanning
                                    ? "Déplacez la carte pour sélectionner le point"
                                    : isReverseGeocoding
                                      ? "Recherche de l’adresse..."
                                      : selected.address || "Adresse non trouvée"}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                            <LinearGradient colors={Gradients.primary} style={styles.confirmGradient}>
                                <Text style={styles.confirmText}>Valider</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
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
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchWrapper: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        zIndex: 5,
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
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
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
        marginLeft: -12,
        marginTop: -32,
        alignItems: "center",
        justifyContent: "center",
    },
    centerPinHalo: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        opacity: 0.15,
    },
    centerPinShadow: {
        width: 12,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        marginTop: -2,
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
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    footerText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    confirmButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    confirmGradient: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    confirmText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.white,
    },
});
