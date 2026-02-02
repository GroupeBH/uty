import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { CategoryAttribute } from '@/types/category';
import { Ionicons } from '@expo/vector-icons';
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
                    <View style={styles.inputContainer}>
                        <Ionicons name="text-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value || ''}
                            onChangeText={onChange}
                            placeholder={`Entrez ${(attribute?.label || attribute?.name)?.toLowerCase()}`}
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>
                );

            case 'number':
                return (
                    <View style={styles.inputContainer}>
                        <Ionicons name="calculator-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value?.toString() || ''}
                            onChangeText={(text) => {
                                const num = parseFloat(text);
                                onChange(isNaN(num) ? undefined : num);
                            }}
                            placeholder={`Entrez ${(attribute?.label || attribute?.name)?.toLowerCase()}`}
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
                    <View style={styles.inputContainer}>
                        <Ionicons name="create-outline" size={20} color={Colors.gray400} />
                        <TextInput
                            style={styles.input}
                            value={value || ''}
                            onChangeText={onChange}
                            placeholder={`Entrez ${(attribute?.label || attribute?.name)?.toLowerCase()}`}
                            placeholderTextColor={Colors.gray400}
                        />
                    </View>
                );
        }
    };

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {attribute?.label || attribute?.name}
                {attribute?.required && <Text style={styles.required}> *</Text>}
            </Text>
            {renderField()}
        </View>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    label: {
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    required: {
        color: Colors.error,
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
    input: {
        flex: 1,
        height: 50,
        fontSize: Typography.fontSize.base,
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.medium,
    },
    pickerContainer: {
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        flexWrap: 'wrap',
        backgroundColor: Colors.white,
    },
    pickerOption: {
        flex: 1,
        minWidth: '30%',
        padding: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRightWidth: 1,
        borderRightColor: Colors.gray100,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    selectedPickerOption: {
        backgroundColor: Colors.primary,
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
    },
});
