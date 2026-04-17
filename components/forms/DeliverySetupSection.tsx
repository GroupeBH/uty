import { KINSHASA_ADDRESS_HELP_TEXT } from '@/constants/kinshasa';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { WEIGHT_CLASS_OPTIONS } from '@/constants/weightClass';
import { KinshasaAddressFields } from '@/utils/kinshasaAddress';
import { normalizeTextInputValue } from '@/utils/textInput';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { KinshasaAddressForm } from './KinshasaAddressForm';

export type PickupInputMode = 'manual' | 'map';

type DeliverySetupSectionProps = {
    showToggle?: boolean;
    enabled: boolean;
    onToggleEnabled: (value: boolean) => void;
    weightClass: string[];
    onToggleWeightClass: (value: string) => void;
    weightError?: string;
    pickupInputMode?: PickupInputMode;
    onPickupInputModeChange?: (value: PickupInputMode) => void;
    addressFields: KinshasaAddressFields;
    onAddressFieldsChange: (fields: KinshasaAddressFields) => void;
    addressError?: string;
    addressPreview: string;
    summaryMeta?: string;
    hasPickupCoordinates: boolean;
    coordinatesPreview?: string;
    locationError?: string;
    onOpenMap: () => void;
    showAdvancedCoordinates?: boolean;
    onToggleAdvancedCoordinates?: () => void;
    pickupLatitude?: string;
    pickupLongitude?: string;
    onChangeLatitude?: (value: string) => void;
    onChangeLongitude?: (value: string) => void;
};

const INPUT_MODES: {
    value: PickupInputMode;
    title: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
    {
        value: 'manual',
        title: 'Adresse simple',
        description: 'Commune, avenue et repere',
        icon: 'create-outline',
    },
    {
        value: 'map',
        title: 'Choisir sur carte',
        description: 'Point exact et repere',
        icon: 'map-outline',
    },
];

export function DeliverySetupSection({
    showToggle = true,
    enabled,
    onToggleEnabled,
    weightClass,
    onToggleWeightClass,
    weightError,
    pickupInputMode,
    onPickupInputModeChange,
    addressFields,
    onAddressFieldsChange,
    addressError,
    addressPreview,
    hasPickupCoordinates,
    locationError,
    onOpenMap,
}: DeliverySetupSectionProps) {
    const [internalInputMode, setInternalInputMode] = React.useState<PickupInputMode>(
        hasPickupCoordinates ? 'map' : 'manual',
    );
    const activeInputMode = pickupInputMode ?? internalInputMode;

    React.useEffect(() => {
        if (!pickupInputMode && hasPickupCoordinates) {
            setInternalInputMode('map');
        }
    }, [hasPickupCoordinates, pickupInputMode]);

    const updateAddressField = (field: keyof KinshasaAddressFields, value: string) => {
        onAddressFieldsChange({
            ...addressFields,
            [field]: normalizeTextInputValue(value),
        });
    };

    const handleInputModeChange = (mode: PickupInputMode) => {
        setInternalInputMode(mode);
        onPickupInputModeChange?.(mode);
    };

    return (
        <View style={showToggle ? styles.card : styles.contentOnly}>
            {showToggle ? (
                <View style={styles.header}>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.title}>Livraison</Text>
                        <Text style={styles.subtitle}>Activez si un livreur peut recuperer l article.</Text>
                    </View>
                    <Switch
                        value={enabled}
                        onValueChange={onToggleEnabled}
                        trackColor={{ false: Colors.gray300, true: Colors.primary + '80' }}
                        thumbColor={enabled ? Colors.primary : Colors.gray400}
                    />
                </View>
            ) : null}

            {!enabled ? (
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Pas de livraison: l acheteur vous contactera pour s organiser.
                    </Text>
                </View>
            ) : (
                <>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Poids</Text>
                            <Text style={styles.sectionSubtitle}>Choisissez une option.</Text>
                        </View>
                        <View style={styles.weightChips}>
                            {WEIGHT_CLASS_OPTIONS.map((option) => {
                                const isActive = weightClass.includes(option.value);
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.weightChip, isActive && styles.weightChipActive]}
                                        onPress={() => onToggleWeightClass(option.value)}
                                        activeOpacity={0.85}
                                    >
                                        <Text
                                            style={[
                                                styles.weightChipText,
                                                isActive && styles.weightChipTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {weightError ? <Text style={styles.errorText}>{weightError}</Text> : null}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Point de retrait</Text>
                        <Text style={styles.sectionSubtitle}>
                            Choisissez la methode la plus facile pour le livreur.
                        </Text>

                        <View style={styles.inputModeRow}>
                            {INPUT_MODES.map((mode) => {
                                const isActive = activeInputMode === mode.value;
                                return (
                                    <TouchableOpacity
                                        key={mode.value}
                                        style={[styles.inputModeButton, isActive && styles.inputModeButtonActive]}
                                        onPress={() => handleInputModeChange(mode.value)}
                                        activeOpacity={0.88}
                                    >
                                        <View
                                            style={[
                                                styles.inputModeIcon,
                                                isActive && styles.inputModeIconActive,
                                            ]}
                                        >
                                            <Ionicons
                                                name={mode.icon}
                                                size={17}
                                                color={isActive ? Colors.white : Colors.primary}
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                styles.inputModeTitle,
                                                isActive && styles.inputModeTitleActive,
                                            ]}
                                        >
                                            {mode.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.inputModeDescription,
                                                isActive && styles.inputModeDescriptionActive,
                                            ]}
                                        >
                                            {mode.description}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {activeInputMode === 'manual' ? (
                            <KinshasaAddressForm
                                variant="simple"
                                fields={addressFields}
                                onChange={onAddressFieldsChange}
                                helperText={KINSHASA_ADDRESS_HELP_TEXT}
                            />
                        ) : (
                            <View style={styles.mapPanel}>
                                <TouchableOpacity style={styles.mapButton} onPress={onOpenMap} activeOpacity={0.85}>
                                    <LinearGradient colors={Gradients.primary} style={styles.mapButtonGradient}>
                                        <Ionicons name="map-outline" size={18} color={Colors.white} />
                                        <Text style={styles.mapButtonText}>
                                            {hasPickupCoordinates ? 'Modifier le point' : 'Ouvrir la carte'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.mapStatusRow}>
                                    <Ionicons
                                        name={hasPickupCoordinates ? 'checkmark-circle-outline' : 'location-outline'}
                                        size={17}
                                        color={hasPickupCoordinates ? Colors.success : Colors.primary}
                                    />
                                    <Text style={styles.mapStatusText}>
                                        {hasPickupCoordinates
                                            ? 'Point choisi sur la carte.'
                                            : 'Placez le point exact de retrait.'}
                                    </Text>
                                </View>

                                {hasPickupCoordinates ? (
                                    <Text style={styles.mapAddressText} numberOfLines={2}>
                                        {addressPreview}
                                    </Text>
                                ) : null}

                                <Text style={styles.label}>Repere pour le livreur</Text>
                                <TextInput
                                    style={styles.referenceInput}
                                    value={addressFields.reference}
                                    onChangeText={(value) => updateAddressField('reference', value)}
                                    placeholder="Ex: portail bleu, en face de la station"
                                    placeholderTextColor={Colors.gray400}
                                />

                                {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
                            </View>
                        )}

                        {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: Spacing.sm,
        padding: Spacing.lg,
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    contentOnly: {},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    headerTextWrap: {
        flex: 1,
        marginRight: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
        padding: Spacing.md,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
        fontWeight: Typography.fontWeight.medium,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        color: Colors.textPrimary,
    },
    sectionSubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: Spacing.sm,
    },
    weightChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    weightChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    weightChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    weightChipText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
    },
    weightChipTextActive: {
        color: Colors.white,
    },
    inputModeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    inputModeButton: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        padding: Spacing.md,
        minHeight: 104,
    },
    inputModeButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    inputModeIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '12',
        marginBottom: Spacing.sm,
    },
    inputModeIconActive: {
        backgroundColor: Colors.white + '22',
    },
    inputModeTitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.extrabold,
        marginBottom: 2,
    },
    inputModeTitleActive: {
        color: Colors.white,
    },
    inputModeDescription: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 15,
    },
    inputModeDescriptionActive: {
        color: Colors.white + 'DD',
    },
    mapPanel: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        padding: Spacing.md,
    },
    mapButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    mapButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    mapButtonText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.white,
    },
    mapStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    mapStatusText: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    mapAddressText: {
        marginTop: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    label: {
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
    },
    referenceInput: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
    },
    errorText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.error,
        marginTop: Spacing.xs,
    },
});
