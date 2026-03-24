import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { CategoryAttribute } from '@/types/category';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DynamicAttributeFieldProps {
    attribute: CategoryAttribute;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

export const DynamicAttributeField: React.FC<DynamicAttributeFieldProps> = ({
    attribute,
    value,
    onChange,
    error,
}) => {
    const displayLabel =
        (typeof attribute?.label === 'string' && attribute.label.trim()) ||
        (typeof attribute?.name === 'string' && attribute.name.trim()) ||
        'Caracteristique';
    const placeholderLabel = displayLabel.toLowerCase();

    const renderField = () => {
        const type = attribute?.type?.toLowerCase() || 'string';
        switch (type) {
            case 'string':
            case 'text':
                return (
                    <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                        <Ionicons name="text-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value || ''}
                            onChangeText={onChange}
                            placeholder={`Entrez ${placeholderLabel}`}
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>
                );

            case 'number':
                return (
                    <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                        <Ionicons name="calculator-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value?.toString() || ''}
                            onChangeText={(text) => {
                                const num = parseFloat(text);
                                onChange(isNaN(num) ? undefined : num);
                            }}
                            placeholder={`Entrez ${placeholderLabel}`}
                            placeholderTextColor={Colors.gray400}
                            keyboardType="numeric"
                        />
                    </View>
                );

            case 'select':
                if (!attribute?.options || attribute?.options?.length === 0) {
                    return (
                        <Text style={styles.errorText}>
                            Aucune option disponible
                        </Text>
                    );
                }
                return (
                    <View style={[styles.pickerContainer, error && styles.inputContainerError]}>
                        {attribute?.options?.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.pickerOption,
                                    value === option && styles.selectedPickerOption,
                                ]}
                                onPress={() => onChange(option)}
                            >
                                <Text
                                    style={[
                                        styles.pickerText,
                                        value === option && styles.selectedPickerText,
                                    ]}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );

            case 'boolean':
                return (
                    <View style={styles.pickerContainer}>
                        <TouchableOpacity
                            style={[
                                styles.pickerOption,
                                value === true && styles.selectedPickerOption,
                            ]}
                            onPress={() => onChange(true)}
                        >
                            <Text
                                style={[
                                    styles.pickerText,
                                    value === true && styles.selectedPickerText,
                                ]}
                            >
                                Oui
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.pickerOption,
                                value === false && styles.selectedPickerOption,
                            ]}
                            onPress={() => onChange(false)}
                        >
                            <Text
                                style={[
                                    styles.pickerText,
                                    value === false && styles.selectedPickerText,
                                ]}
                            >
                                Non
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return (
                    <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                        <Ionicons name="create-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value || ''}
                            onChangeText={onChange}
                            placeholder={`Entrez ${placeholderLabel}`}
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>
                );
        }
    };

    return (
        <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{displayLabel}</Text>
                <View
                    style={[
                        styles.requirementBadge,
                        attribute?.required ? styles.requirementBadgeRequired : styles.requirementBadgeOptional,
                    ]}
                >
                    <Text
                        style={[
                            styles.requirementBadgeText,
                            attribute?.required
                                ? styles.requirementBadgeTextRequired
                                : styles.requirementBadgeTextOptional,
                        ]}
                    >
                        {attribute?.required ? 'Obligatoire' : 'Optionnel'}
                    </Text>
                </View>
            </View>
            {renderField()}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: Spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        flex: 1,
    },
    requirementBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    requirementBadgeRequired: {
        backgroundColor: Colors.error + '12',
    },
    requirementBadgeOptional: {
        backgroundColor: Colors.gray100,
    },
    requirementBadgeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    requirementBadgeTextRequired: {
        color: Colors.error,
    },
    requirementBadgeTextOptional: {
        color: Colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.gray100,
        ...Shadows.sm,
    },
    inputContainerError: {
        borderColor: Colors.error + '80',
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        padding: Spacing.sm,
        borderWidth: 2,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray50,
    },
    pickerOption: {
        minWidth: '30%',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        borderColor: Colors.gray200,
    },
    selectedPickerOption: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    pickerText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
    },
    selectedPickerText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    errorText: {
        color: Colors.error,
        fontSize: Typography.fontSize.sm,
        marginTop: Spacing.xs,
    },
});
