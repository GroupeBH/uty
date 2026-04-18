import { KINSHASA_FEATURED_COMMUNES } from '@/constants/kinshasa';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { normalizeTextInputValue } from '@/utils/textInput';
import {
    formatKinshasaAddress,
    KinshasaAddressFields,
} from '@/utils/kinshasaAddress';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type KinshasaAddressFormProps = {
    fields: KinshasaAddressFields;
    onChange: (fields: KinshasaAddressFields) => void;
    helperText?: string;
    variant?: 'full' | 'simple';
};

export function KinshasaAddressForm({
    fields,
    onChange,
    helperText,
    variant = 'full',
}: KinshasaAddressFormProps) {
    const previewAddress = formatKinshasaAddress(fields);
    const isSimple = variant === 'simple';

    const updateField = (field: keyof KinshasaAddressFields, value: string) => {
        onChange({
            ...fields,
            [field]: normalizeTextInputValue(value),
        });
    };

    const updateSimpleStreet = (value: string) => {
        onChange({
            ...fields,
            avenue: normalizeTextInputValue(value),
            quartier: '',
            details: '',
        });
    };

    if (isSimple) {
        return (
            <View style={styles.container}>
                <View style={styles.simpleFields}>
                    <View style={styles.simpleField}>
                        <Text style={styles.label}>Commune</Text>
                        <TextInput
                            style={[styles.input, styles.simpleInput]}
                            value={fields.commune}
                            onChangeText={(value) => updateField('commune', value)}
                            placeholder="Ex: Limete"
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>

                    <View style={styles.simpleField}>
                        <Text style={styles.label}>Avenue/rue si connu</Text>
                        <TextInput
                            style={[styles.input, styles.simpleInput]}
                            value={fields.avenue || fields.quartier}
                            onChangeText={updateSimpleStreet}
                            placeholder="Ex: 24 Novembre"
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>

                    <View style={styles.simpleField}>
                        <Text style={styles.label}>Repere pour le livreur</Text>
                        <TextInput
                            style={[styles.input, styles.simpleInput]}
                            value={fields.reference}
                            onChangeText={(value) => updateField('reference', value)}
                            placeholder="Ex: portail bleu, pres du marche"
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>
                </View>

                {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Ionicons name="compass-outline" size={16} color={Colors.primary} />
                <Text style={styles.headerText}>Adresse guidee pour Kinshasa</Text>
            </View>

            <Text style={styles.label}>Commune</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
            >
                {KINSHASA_FEATURED_COMMUNES.map((commune) => {
                    const isActive = commune === fields.commune;
                    return (
                        <TouchableOpacity
                            key={commune}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => updateField('commune', commune)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                {commune}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <TextInput
                style={styles.input}
                value={fields.commune}
                onChangeText={(value) => updateField('commune', value)}
                placeholder="Ex: Limete"
                placeholderTextColor={Colors.gray400}
            />

            <View style={styles.row}>
                <View style={styles.flexItem}>
                    <Text style={styles.label}>Quartier</Text>
                    <TextInput
                        style={styles.input}
                        value={fields.quartier}
                        onChangeText={(value) => updateField('quartier', value)}
                        placeholder="Ex: Industriel"
                        placeholderTextColor={Colors.gray400}
                    />
                </View>
                <View style={styles.flexItem}>
                    <Text style={styles.label}>Avenue</Text>
                    <TextInput
                        style={styles.input}
                        value={fields.avenue}
                        onChangeText={(value) => updateField('avenue', value)}
                        placeholder="Ex: 24 Novembre"
                        placeholderTextColor={Colors.gray400}
                    />
                </View>
            </View>

            <Text style={styles.label}>Repere connu</Text>
            <TextInput
                style={styles.input}
                value={fields.reference}
                onChangeText={(value) => updateField('reference', value)}
                placeholder="Ex: Pres du marche, de l'eglise ou du rond-point"
                placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.label}>Precision utile</Text>
            <TextInput
                style={styles.input}
                value={fields.details}
                onChangeText={(value) => updateField('details', value)}
                placeholder="Ex: Porte bleue, 2e niveau, appelez en arrivant"
                placeholderTextColor={Colors.gray400}
            />

            <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Adresse composee</Text>
                <Text style={styles.previewValue}>
                    {previewAddress || 'Choisissez commune, quartier et repere pour preparer l adresse.'}
                </Text>
            </View>

            {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    headerText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.extrabold,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
        marginBottom: Spacing.xs,
    },
    chipsContainer: {
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    chipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold,
    },
    chipTextActive: {
        color: Colors.white,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    simpleFields: {
        gap: Spacing.sm,
    },
    simpleField: {
        marginBottom: 0,
    },
    simpleInput: {
        marginBottom: 0,
        paddingVertical: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flexItem: {
        flex: 1,
    },
    previewCard: {
        backgroundColor: Colors.primary + '0D',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    previewLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'uppercase',
        marginBottom: Spacing.xs,
    },
    previewValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        lineHeight: 20,
        fontWeight: Typography.fontWeight.medium,
    },
    helperText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        lineHeight: 18,
    },
});
