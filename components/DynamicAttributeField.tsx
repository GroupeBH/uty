import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { CategoryAttribute } from '@/types/category';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DynamicAttributeFieldProps {
    attribute: CategoryAttribute;
    value: any;
    onChange: (value: any) => void;
}

export const DynamicAttributeField: React.FC<DynamicAttributeFieldProps> = ({
    attribute,
    value,
    onChange,
}) => {
    const renderField = () => {
        const type = attribute?.type?.toLowerCase() || 'string';
        switch (type) {
            case 'string':
            case 'text':
                return (
                    <TextInput
                        style={styles.input}
                        value={value || ''}
                        onChangeText={onChange}
                        placeholder={`Entrez ${attribute?.name?.toLowerCase()}`}
                    />
                );

            case 'number':
                return (
                    <TextInput
                        style={styles.input}
                        value={value?.toString() || ''}
                        onChangeText={(text) => {
                            const num = parseFloat(text);
                            onChange(isNaN(num) ? undefined : num);
                        }}
                        placeholder={`Entrez ${attribute?.name?.toLowerCase()}`}
                        keyboardType="numeric"
                    />
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
                    <View style={styles.pickerContainer}>
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
                    <TextInput
                        style={styles.input}
                        value={value || ''}
                        onChangeText={onChange}
                        placeholder={`Entrez ${attribute?.name?.toLowerCase()}`}
                    />
                );
        }
    };

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {attribute?.name}
                {attribute?.required && <Text style={styles.required}> *</Text>}
            </Text>
            {renderField()}
        </View>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    required: {
        color: Colors.error,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: Typography.fontSize.md,
        backgroundColor: Colors.white,
    },
    pickerContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        flexWrap: 'wrap',
    },
    pickerOption: {
        flex: 1,
        minWidth: '30%',
        padding: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.gray50,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
    },
    selectedPickerOption: {
        backgroundColor: Colors.primary,
    },
    pickerText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.md,
    },
    selectedPickerText: {
        color: Colors.white,
        fontWeight: Typography.fontWeight.bold,
    },
    errorText: {
        color: Colors.error,
        fontSize: Typography.fontSize.sm,
    },
});
