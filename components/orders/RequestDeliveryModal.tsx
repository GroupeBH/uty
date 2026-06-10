import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type DeliveryModeValue = 'auto' | 'moto' | 'voiture' | 'van';

export type RequestDeliveryFormValues = {
    pickupLocation: string;
    deliveryLocation: string;
    scheduledPickupAt: string;
    scheduledDeliveryAt: string;
    comment: string;
    deliveryMode: DeliveryModeValue;
};

type RequestDeliveryModalProps = {
    visible: boolean;
    values: RequestDeliveryFormValues;
    loading?: boolean;
    onChange: (values: RequestDeliveryFormValues) => void;
    onClose: () => void;
    onSubmit: () => void;
    onPickPickupOnMap: () => void;
    onPickDeliveryOnMap: () => void;
};

const DELIVERY_MODES: {
    value: DeliveryModeValue;
    label: string;
    helper: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    {
        value: 'auto',
        label: 'Auto',
        helper: 'Mode adapte automatiquement',
        icon: 'sparkles-outline',
    },
    {
        value: 'moto',
        label: 'Moto',
        helper: 'Petits colis rapides',
        icon: 'bicycle-outline',
    },
    {
        value: 'voiture',
        label: 'Voiture',
        helper: 'Colis moyens ou fragiles',
        icon: 'car-outline',
    },
    {
        value: 'van',
        label: 'Fourgon',
        helper: 'Volume important',
        icon: 'cube-outline',
    },
];

export function RequestDeliveryModal({
    visible,
    values,
    loading = false,
    onChange,
    onClose,
    onSubmit,
    onPickPickupOnMap,
    onPickDeliveryOnMap,
}: RequestDeliveryModalProps) {
    const update = (patch: Partial<RequestDeliveryFormValues>) => {
        onChange({ ...values, ...patch });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <SafeAreaView style={styles.sheet} edges={['bottom']}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <View style={styles.titleWrap}>
                            <Text style={styles.eyebrow}>Livraison</Text>
                            <Text style={styles.title}>Commander une livraison</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={20} color={Colors.gray600} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.routeCard}>
                            <View style={styles.routeRow}>
                                <View style={styles.routeIcon}>
                                    <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                                </View>
                                <View style={styles.routeBody}>
                                    <Text style={styles.label}>Retrait vendeur</Text>
                                    <TextInput
                                        value={values.pickupLocation}
                                        onChangeText={(text) => update({ pickupLocation: text })}
                                        placeholder="Adresse ou point GPS de retrait"
                                        placeholderTextColor={Colors.gray400}
                                        style={styles.input}
                                    />
                                </View>
                                <TouchableOpacity style={styles.mapButton} onPress={onPickPickupOnMap}>
                                    <Ionicons name="map-outline" size={16} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.routeDivider} />

                            <View style={styles.routeRow}>
                                <View style={styles.routeIcon}>
                                    <Ionicons name="location-outline" size={18} color={Colors.primary} />
                                </View>
                                <View style={styles.routeBody}>
                                    <Text style={styles.label}>Destination client</Text>
                                    <TextInput
                                        value={values.deliveryLocation}
                                        onChangeText={(text) => update({ deliveryLocation: text })}
                                        placeholder="Adresse de livraison"
                                        placeholderTextColor={Colors.gray400}
                                        style={styles.input}
                                    />
                                </View>
                                <TouchableOpacity style={styles.mapButton} onPress={onPickDeliveryOnMap}>
                                    <Ionicons name="map-outline" size={16} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Horaires</Text>
                            <View style={styles.timeGrid}>
                                <View style={styles.timeField}>
                                    <Text style={styles.label}>Retrait souhaite</Text>
                                    <TextInput
                                        value={values.scheduledPickupAt}
                                        onChangeText={(text) => update({ scheduledPickupAt: text })}
                                        placeholder="Ex: aujourd'hui 15:30"
                                        placeholderTextColor={Colors.gray400}
                                        style={styles.input}
                                    />
                                </View>
                                <View style={styles.timeField}>
                                    <Text style={styles.label}>Livraison souhaitee</Text>
                                    <TextInput
                                        value={values.scheduledDeliveryAt}
                                        onChangeText={(text) => update({ scheduledDeliveryAt: text })}
                                        placeholder="Ex: avant 18:00"
                                        placeholderTextColor={Colors.gray400}
                                        style={styles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Moyen de livraison</Text>
                            <View style={styles.modeGrid}>
                                {DELIVERY_MODES.map((mode) => {
                                    const selected = values.deliveryMode === mode.value;
                                    return (
                                        <TouchableOpacity
                                            key={mode.value}
                                            style={[styles.modeOption, selected && styles.modeOptionSelected]}
                                            onPress={() => update({ deliveryMode: mode.value })}
                                            activeOpacity={0.86}
                                        >
                                            <View style={[styles.modeIcon, selected && styles.modeIconSelected]}>
                                                <Ionicons
                                                    name={mode.icon}
                                                    size={17}
                                                    color={selected ? Colors.white : Colors.primary}
                                                />
                                            </View>
                                            <View style={styles.modeCopy}>
                                                <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>
                                                    {mode.label}
                                                </Text>
                                                <Text style={styles.modeHelper}>{mode.helper}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Commentaire livreur</Text>
                            <TextInput
                                value={values.comment}
                                onChangeText={(text) => update({ comment: text })}
                                placeholder="Ex: appeler avant d'arriver, colis fragile, portail bleu..."
                                placeholderTextColor={Colors.gray400}
                                style={[styles.input, styles.commentInput]}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={onClose} disabled={loading}>
                            <Text style={styles.secondaryButtonText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.disabled]}
                            onPress={onSubmit}
                            disabled={loading}
                        >
                            <Ionicons name="paper-plane-outline" size={17} color={Colors.white} />
                            <Text style={styles.primaryButtonText}>
                                {loading ? 'Demande...' : 'Envoyer'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(5, 18, 40, 0.52)',
    },
    sheet: {
        maxHeight: '92%',
        backgroundColor: Colors.backgroundSecondary,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingTop: Spacing.sm,
        ...Shadows.xl,
    },
    handle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray300,
        marginBottom: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
    },
    eyebrow: {
        color: Colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.extrabold,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    title: {
        marginTop: 2,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.extrabold,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    content: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        gap: Spacing.md,
    },
    routeCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    routeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    routeBody: {
        flex: 1,
        minWidth: 0,
    },
    routeDivider: {
        width: 2,
        height: 18,
        marginLeft: 17,
        marginVertical: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '20',
    },
    section: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
        ...Shadows.sm,
    },
    sectionTitle: {
        color: Colors.primary,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.extrabold,
        marginBottom: Spacing.sm,
    },
    label: {
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
        marginBottom: Spacing.xs,
    },
    input: {
        minHeight: 44,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    mapButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '22',
        backgroundColor: Colors.primary + '08',
        marginTop: 22,
    },
    timeGrid: {
        gap: Spacing.sm,
    },
    timeField: {
        minWidth: 0,
    },
    modeGrid: {
        gap: Spacing.sm,
    },
    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        minHeight: 58,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    modeOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '0D',
    },
    modeIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.primary + '18',
    },
    modeIconSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    modeCopy: {
        flex: 1,
        minWidth: 0,
    },
    modeLabel: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    modeLabelSelected: {
        color: Colors.primary,
    },
    modeHelper: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    commentInput: {
        minHeight: 96,
        lineHeight: 19,
    },
    footer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        backgroundColor: Colors.white,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray300,
        backgroundColor: Colors.white,
    },
    secondaryButtonText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    primaryButton: {
        flex: 1.4,
        minHeight: 50,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
        backgroundColor: Colors.primary,
        ...Shadows.sm,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    disabled: {
        opacity: 0.65,
    },
});
