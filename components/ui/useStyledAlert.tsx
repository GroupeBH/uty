import React from 'react';
import { CustomAlert } from './CustomAlert';

export type StyledAlertType = 'success' | 'error' | 'info' | 'warning';

export type StyledAlertButton = {
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

type StyledAlertState = {
    visible: boolean;
    title: string;
    message: string;
    type: StyledAlertType;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
};

const inferTypeFromTitle = (title?: string): StyledAlertType => {
    const lower = (title || '').toLowerCase();
    if (
        lower.includes('erreur') ||
        lower.includes('echec') ||
        lower.includes('impossible') ||
        lower.includes('fail')
    ) {
        return 'error';
    }
    if (
        lower.includes('succes') ||
        lower.includes('success') ||
        lower.includes('valide') ||
        lower.includes('confirme')
    ) {
        return 'success';
    }
    if (lower.includes('attention') || lower.includes('warning') || lower.includes('refuse')) {
        return 'warning';
    }
    return 'info';
};

const defaultState: StyledAlertState = {
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Annuler',
    showCancel: false,
};

export const useStyledAlert = () => {
    const [state, setState] = React.useState<StyledAlertState>(defaultState);

    const closeAlert = React.useCallback(() => {
        setState((prev) => ({
            ...prev,
            visible: false,
            onConfirm: undefined,
            onCancel: undefined,
        }));
    }, []);

    const showAlert = React.useCallback(
        (
            title: string,
            message?: string,
            buttons?: StyledAlertButton[],
            forcedType?: StyledAlertType,
        ) => {
            const normalizedButtons = Array.isArray(buttons) ? buttons.filter(Boolean) : [];
            const cancelButton =
                normalizedButtons.find((button) => button.style === 'cancel') ||
                (normalizedButtons.length > 1 ? normalizedButtons[0] : undefined);
            const confirmButton =
                normalizedButtons.find((button) => button.style === 'destructive') ||
                normalizedButtons
                    .slice()
                    .reverse()
                    .find((button) => button.style !== 'cancel') ||
                normalizedButtons[0];

            setState({
                visible: true,
                title,
                message: message || '',
                type: forcedType || inferTypeFromTitle(title),
                confirmText: confirmButton?.text || 'OK',
                cancelText: cancelButton?.text || 'Annuler',
                showCancel: Boolean(cancelButton && cancelButton !== confirmButton),
                onConfirm: confirmButton?.onPress,
                onCancel: cancelButton?.onPress,
            });
        },
        [],
    );

    const showTypedAlert = React.useCallback(
        (
            payload: {
                title: string;
                message?: string;
                type?: StyledAlertType;
                confirmText?: string;
                cancelText?: string;
                showCancel?: boolean;
                onConfirm?: () => void;
                onCancel?: () => void;
            },
        ) => {
            setState({
                visible: true,
                title: payload.title,
                message: payload.message || '',
                type: payload.type || inferTypeFromTitle(payload.title),
                confirmText: payload.confirmText || 'OK',
                cancelText: payload.cancelText || 'Annuler',
                showCancel: Boolean(payload.showCancel),
                onConfirm: payload.onConfirm,
                onCancel: payload.onCancel,
            });
        },
        [],
    );

    const alertNode = (
        <CustomAlert
            visible={state.visible}
            title={state.title}
            message={state.message}
            type={state.type}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
            showCancel={state.showCancel}
            onConfirm={() => {
                const callback = state.onConfirm;
                closeAlert();
                callback?.();
            }}
            onCancel={() => {
                const callback = state.onCancel;
                closeAlert();
                callback?.();
            }}
        />
    );

    return {
        showAlert,
        showTypedAlert,
        closeAlert,
        alertNode,
    };
};
