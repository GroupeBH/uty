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

type ScheduleField = 'pickup' | 'delivery';

const pad2 = (value: number) => String(value).padStart(2, '0');

const parseScheduleDate = (value?: string): Date | null => {
    if (!value?.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const roundToNextSlot = (date: Date): Date => {
    const next = new Date(date);
    next.setSeconds(0, 0);
    const remainder = next.getMinutes() % 15;
    next.setMinutes(next.getMinutes() + (remainder === 0 ? 15 : 15 - remainder));
    return next;
};

const toDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const fromDateKey = (dateKey: string, hour: number, minute: number): Date => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const formatScheduleLabel = (value?: string): string => {
    const date = parseScheduleDate(value);
    if (!date) return 'Choisir date et heure';

    return date.toLocaleString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateOptionLabel = (date: Date, index: number): string => {
    if (index === 0) return "Aujourd'hui";
    if (index === 1) return 'Demain';
    return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });
};

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
    const [scheduleField, setScheduleField] = React.useState<ScheduleField | null>(null);
    const [draftDateKey, setDraftDateKey] = React.useState(toDateKey(roundToNextSlot(new Date())));
    const [draftHour, setDraftHour] = React.useState(roundToNextSlot(new Date()).getHours());
    const [draftMinute, setDraftMinute] = React.useState(roundToNextSlot(new Date()).getMinutes());
    const [scheduleError, setScheduleError] = React.useState('');
    const dateOptions = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Array.from({ length: 14 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() + index);
            return date;
        });
    }, []);
    const hourOptions = React.useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
    const minuteOptions = [0, 15, 30, 45];

    const update = (patch: Partial<RequestDeliveryFormValues>) => {
        onChange({ ...values, ...patch });
    };

    React.useEffect(() => {
        if (!visible) {
            setScheduleField(null);
            setScheduleError('');
        }
    }, [visible]);

    const openSchedulePicker = (field: ScheduleField) => {
        const currentValue = field === 'pickup' ? values.scheduledPickupAt : values.scheduledDeliveryAt;
        const selected = parseScheduleDate(currentValue) || roundToNextSlot(new Date());
        setDraftDateKey(toDateKey(selected));
        setDraftHour(selected.getHours());
        setDraftMinute(selected.getMinutes());
        setScheduleError('');
        setScheduleField(field);
    };

    const selectedDraftDate = fromDateKey(draftDateKey, draftHour, draftMinute);
    const isDraftPast = selectedDraftDate.getTime() <= Date.now();

    const confirmSchedule = () => {
        if (!scheduleField) return;
        if (isDraftPast) {
            setScheduleError('Choisissez un horaire futur.');
            return;
        }

        const pickupDate = parseScheduleDate(values.scheduledPickupAt);
        const deliveryDate = parseScheduleDate(values.scheduledDeliveryAt);
        if (scheduleField === 'delivery' && pickupDate && selectedDraftDate < pickupDate) {
            setScheduleError('La livraison doit etre apres le retrait.');
            return;
        }
        if (scheduleField === 'pickup' && deliveryDate && selectedDraftDate > deliveryDate) {
            setScheduleError('Le retrait doit etre avant la livraison.');
            return;
        }

        update(
            scheduleField === 'pickup'
                ? { scheduledPickupAt: selectedDraftDate.toISOString() }
                : { scheduledDeliveryAt: selectedDraftDate.toISOString() },
        );
        setScheduleField(null);
        setScheduleError('');
    };

    const clearSchedule = () => {
        if (!scheduleField) return;
        update(scheduleField === 'pickup' ? { scheduledPickupAt: '' } : { scheduledDeliveryAt: '' });
        setScheduleField(null);
        setScheduleError('');
    };

    return (
        <>
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
                                        <TouchableOpacity
                                            style={styles.datePickerButton}
                                            onPress={() => openSchedulePicker('pickup')}
                                            activeOpacity={0.86}
                                        >
                                            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                                            <View style={styles.datePickerCopy}>
                                                <Text style={styles.datePickerValue}>
                                                    {formatScheduleLabel(values.scheduledPickupAt)}
                                                </Text>
                                                <Text style={styles.datePickerHint}>Date et heure de retrait</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={Colors.gray500} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.timeField}>
                                        <Text style={styles.label}>Livraison souhaitee</Text>
                                        <TouchableOpacity
                                            style={styles.datePickerButton}
                                            onPress={() => openSchedulePicker('delivery')}
                                            activeOpacity={0.86}
                                        >
                                            <Ionicons name="time-outline" size={18} color={Colors.primary} />
                                            <View style={styles.datePickerCopy}>
                                                <Text style={styles.datePickerValue}>
                                                    {formatScheduleLabel(values.scheduledDeliveryAt)}
                                                </Text>
                                                <Text style={styles.datePickerHint}>Date et heure de livraison</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={Colors.gray500} />
                                        </TouchableOpacity>
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

            <Modal
                visible={Boolean(scheduleField)}
                animationType="fade"
                transparent
                onRequestClose={() => setScheduleField(null)}
            >
                <View style={styles.pickerOverlay}>
                    <SafeAreaView style={styles.pickerSheet} edges={['bottom']}>
                        <View style={styles.pickerHeader}>
                            <View style={styles.titleWrap}>
                                <Text style={styles.eyebrow}>Horaire</Text>
                                <Text style={styles.pickerTitle}>
                                    {scheduleField === 'pickup' ? 'Retrait souhaite' : 'Livraison souhaitee'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setScheduleField(null)}>
                                <Ionicons name="close" size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.pickerSectionLabel}>Jour</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.dateOptionsRow}
                            >
                                {dateOptions.map((date, index) => {
                                    const key = toDateKey(date);
                                    const selected = draftDateKey === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[styles.dateOption, selected && styles.dateOptionSelected]}
                                            onPress={() => {
                                                setDraftDateKey(key);
                                                setScheduleError('');
                                            }}
                                            activeOpacity={0.86}
                                        >
                                            <Text style={[styles.dateOptionDay, selected && styles.dateOptionTextSelected]}>
                                                {formatDateOptionLabel(date, index)}
                                            </Text>
                                            <Text style={[styles.dateOptionDate, selected && styles.dateOptionTextSelected]}>
                                                {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Text style={styles.pickerSectionLabel}>Heure</Text>
                            <View style={styles.optionGrid}>
                                {hourOptions.map((hour) => {
                                    const selected = draftHour === hour;
                                    return (
                                        <TouchableOpacity
                                            key={hour}
                                            style={[styles.timeOption, selected && styles.timeOptionSelected]}
                                            onPress={() => {
                                                setDraftHour(hour);
                                                setScheduleError('');
                                            }}
                                            activeOpacity={0.86}
                                        >
                                            <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>
                                                {pad2(hour)}h
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.pickerSectionLabel}>Minutes</Text>
                            <View style={styles.minuteRow}>
                                {minuteOptions.map((minute) => {
                                    const selected = draftMinute === minute;
                                    return (
                                        <TouchableOpacity
                                            key={minute}
                                            style={[styles.minuteOption, selected && styles.timeOptionSelected]}
                                            onPress={() => {
                                                setDraftMinute(minute);
                                                setScheduleError('');
                                            }}
                                            activeOpacity={0.86}
                                        >
                                            <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>
                                                {pad2(minute)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.selectedScheduleBox}>
                                <Ionicons name="calendar-clear-outline" size={18} color={Colors.primary} />
                                <Text style={styles.selectedScheduleText}>
                                    {selectedDraftDate.toLocaleString('fr-FR', {
                                        weekday: 'long',
                                        day: '2-digit',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>

                            {scheduleError ? <Text style={styles.scheduleError}>{scheduleError}</Text> : null}
                        </ScrollView>

                        <View style={styles.pickerFooter}>
                            <TouchableOpacity style={styles.clearButton} onPress={clearSchedule}>
                                <Text style={styles.clearButtonText}>Effacer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmScheduleButton, isDraftPast && styles.disabled]}
                                onPress={confirmSchedule}
                                disabled={isDraftPast}
                            >
                                <Text style={styles.confirmScheduleText}>Valider</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </>
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
    datePickerButton: {
        minHeight: 58,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    datePickerCopy: {
        flex: 1,
        minWidth: 0,
    },
    datePickerValue: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    datePickerHint: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
    },
    pickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(5, 18, 40, 0.58)',
    },
    pickerSheet: {
        maxHeight: '82%',
        backgroundColor: Colors.backgroundSecondary,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingTop: Spacing.lg,
        ...Shadows.xl,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    pickerTitle: {
        marginTop: 2,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    pickerContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    pickerSectionLabel: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    dateOptionsRow: {
        gap: Spacing.sm,
        paddingRight: Spacing.xl,
    },
    dateOption: {
        minWidth: 112,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    dateOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    dateOptionDay: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    dateOptionDate: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    dateOptionTextSelected: {
        color: Colors.white,
    },
    optionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    timeOption: {
        minWidth: 58,
        minHeight: 42,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
    },
    timeOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    timeOptionText: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    timeOptionTextSelected: {
        color: Colors.white,
    },
    minuteRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    minuteOption: {
        flex: 1,
        minHeight: 44,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedScheduleBox: {
        marginTop: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '14',
        backgroundColor: Colors.primary + '08',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    selectedScheduleText: {
        flex: 1,
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
        textTransform: 'capitalize',
    },
    scheduleError: {
        marginTop: Spacing.sm,
        color: Colors.error,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    pickerFooter: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    clearButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    clearButtonText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    confirmScheduleButton: {
        flex: 1.4,
        minHeight: 48,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        ...Shadows.sm,
    },
    confirmScheduleText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
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
