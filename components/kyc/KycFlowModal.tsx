import { CustomAlert } from '@/components/ui/CustomAlert';
import { BorderRadius, Colors, Gradients, Shadows, Spacing, Typography } from '@/constants/theme';
import { useSubmitKycMutation } from '@/store/api/usersApi';
import { KycIdType } from '@/types/kyc';
import { getImageMimeType } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Camera as VisionCamera,
    runAtTargetFps,
    type Frame,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor,
} from 'react-native-vision-camera';
import { type Face, type FrameFaceDetectionOptions, useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

type AlertType = 'success' | 'error' | 'info' | 'warning';
type KycCaptureTarget = 'selfie' | 'front' | 'back';
type CaptureMode = 'auto' | 'manual';

type CapturedPhoto = {
    uri: string;
    dataUrl: string;
    name: string;
    type: string;
};

const KYC_STEPS = [
    { id: 1, title: 'Identite' },
    { id: 2, title: 'Selfie' },
    { id: 3, title: 'Document' },
    { id: 4, title: 'Confirmation' },
] as const;

const KYC_ID_OPTIONS: { label: string; value: KycIdType }[] = [
    { label: 'Carte nationale', value: 'national_id' },
    { label: 'Passeport', value: 'passport' },
    { label: 'Permis de conduire', value: 'driver_license' },
    { label: 'Carte electeur', value: 'voter_card' },
];

const AUTO_CAPTURE_DELAY_MS = 750;
const SELFIE_STREAK_TARGET = 3;
const DOCUMENT_STREAK_TARGET = 2;

export type KycFlowResult = {
    selfieUrl: string;
    documentFrontUrl: string;
    documentBackUrl?: string;
    kycStatus?: string;
};

interface KycFlowModalProps {
    visible: boolean;
    initialFullName?: string;
    onClose: () => void;
    onSuccess?: (result: KycFlowResult) => void;
}

const toDataUrl = (mimeType: string, base64: string) => `data:${mimeType};base64,${base64}`;
const normalizeUri = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

const getLargestFace = (faces: Face[]) =>
    faces.reduce<Face | null>((largest, face) => {
        const area = face.bounds.width * face.bounds.height;
        const largestArea = largest ? largest.bounds.width * largest.bounds.height : 0;
        return area > largestArea ? face : largest;
    }, null);

const isSelfieAligned = (face: Face | null, frameWidth: number, frameHeight: number) => {
    if (!face || frameWidth <= 0 || frameHeight <= 0) return false;
    const centerX = face.bounds.x + face.bounds.width / 2;
    const centerY = face.bounds.y + face.bounds.height / 2;
    const horizontalOffset = Math.abs(centerX - frameWidth / 2) / frameWidth;
    const verticalOffset = Math.abs(centerY - frameHeight / 2) / frameHeight;
    const sizeRatio = Math.min(face.bounds.width / frameWidth, face.bounds.height / frameHeight);
    const yaw = Math.abs(face.yawAngle || 0);
    const roll = Math.abs(face.rollAngle || 0);

    return (
        horizontalOffset <= 0.16 &&
        verticalOffset <= 0.2 &&
        sizeRatio >= 0.2 &&
        sizeRatio <= 0.65 &&
        yaw <= 22 &&
        roll <= 22
    );
};

const isDocumentFaceVisible = (face: Face | null, frameWidth: number, frameHeight: number) => {
    if (!face || frameWidth <= 0 || frameHeight <= 0) return false;
    const widthRatio = face.bounds.width / frameWidth;
    const heightRatio = face.bounds.height / frameHeight;
    return widthRatio >= 0.04 && widthRatio <= 0.45 && heightRatio >= 0.04 && heightRatio <= 0.45;
};

const detectStructuredObjectWorklet = (
    frame: Pick<Frame, 'width' | 'height' | 'bytesPerRow' | 'toArrayBuffer'>,
) => {
    'worklet';
    try {
        const width = frame.width;
        const height = frame.height;
        const bytesPerRow = frame.bytesPerRow;
        if (width <= 0 || height <= 0 || bytesPerRow <= 0) return false;

        const raw = new Uint8Array(frame.toArrayBuffer());
        const yPlaneLength = bytesPerRow * height;
        if (raw.length < yPlaneLength) return false;

        const startX = Math.floor(width * 0.2);
        const endX = Math.floor(width * 0.8);
        const startY = Math.floor(height * 0.24);
        const endY = Math.floor(height * 0.76);
        const stepX = Math.max(8, Math.floor((endX - startX) / 30));
        const stepY = Math.max(8, Math.floor((endY - startY) / 20));

        let edgeVotes = 0;
        let sampleCount = 0;
        let brightness = 0;

        for (let y = startY; y < endY - stepY; y += stepY) {
            const row = y * bytesPerRow;
            const nextRow = (y + stepY) * bytesPerRow;

            for (let x = startX; x < endX - stepX; x += stepX) {
                const idx = row + x;
                const rightIdx = row + x + stepX;
                const downIdx = nextRow + x;
                const lum = raw[idx] || 0;
                const right = raw[rightIdx] || lum;
                const down = raw[downIdx] || lum;
                brightness += lum;
                if (Math.abs(lum - right) + Math.abs(lum - down) > 34) {
                    edgeVotes += 1;
                }
                sampleCount += 1;
            }
        }

        if (sampleCount === 0) return false;
        const averageBrightness = brightness / sampleCount;
        const edgeRatio = edgeVotes / sampleCount;
        return averageBrightness > 40 && averageBrightness < 220 && edgeRatio > 0.18;
    } catch {
        return false;
    }
};

export function KycFlowModal({ visible, initialFullName = '', onClose, onSuccess }: KycFlowModalProps) {
    const [submitKyc, { isLoading: isSubmitting }] = useSubmitKycMutation();
    const { hasPermission, requestPermission } = useCameraPermission();

    const [step, setStep] = React.useState(1);
    const [fullName, setFullName] = React.useState(initialFullName);
    const [idType, setIdType] = React.useState<KycIdType>('national_id');
    const [idNumber, setIdNumber] = React.useState('');
    const [selfie, setSelfie] = React.useState<CapturedPhoto | null>(null);
    const [documentFront, setDocumentFront] = React.useState<CapturedPhoto | null>(null);
    const [documentBack, setDocumentBack] = React.useState<CapturedPhoto | null>(null);
    const [consentChecked, setConsentChecked] = React.useState(false);
    const [captureInProgress, setCaptureInProgress] = React.useState<KycCaptureTarget | null>(null);
    const [errorMessage, setErrorMessage] = React.useState('');

    const [cameraModalVisible, setCameraModalVisible] = React.useState(false);
    const [cameraTarget, setCameraTarget] = React.useState<KycCaptureTarget | null>(null);
    const [cameraHint, setCameraHint] = React.useState('');
    const [cameraReady, setCameraReady] = React.useState(false);

    const [alertState, setAlertState] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        type: AlertType;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
    });

    const cameraRef = React.useRef<VisionCamera | null>(null);
    const detectionStreakRef = React.useRef(0);
    const autoCaptureTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTakingPhotoRef = React.useRef(false);
    const cameraHintRef = React.useRef('');

    const cameraDevice = useCameraDevice(cameraTarget === 'selfie' ? 'front' : 'back');
    const faceDetectionOptions = React.useMemo<FrameFaceDetectionOptions>(
        () => ({
            performanceMode: 'fast',
            contourMode: 'none',
            landmarkMode: 'none',
            classificationMode: 'none',
            trackingEnabled: true,
            autoMode: false,
            minFaceSize: cameraTarget === 'selfie' ? 0.2 : 0.05,
            cameraFacing: cameraTarget === 'selfie' ? 'front' : 'back',
        }),
        [cameraTarget],
    );
    const { detectFaces, stopListeners } = useFaceDetector(faceDetectionOptions);

    const showAlert = (title: string, message: string, type: AlertType = 'info') => {
        setAlertState({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setAlertState((prev) => ({ ...prev, visible: false }));
    };

    const setCameraHintSafe = React.useCallback((next: string) => {
        if (cameraHintRef.current === next) return;
        cameraHintRef.current = next;
        setCameraHint(next);
    }, []);

    const clearAutoCaptureTimer = React.useCallback(() => {
        if (autoCaptureTimerRef.current) {
            clearTimeout(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
        }
    }, []);

    const resetAutoDetectionState = React.useCallback(() => {
        detectionStreakRef.current = 0;
        clearAutoCaptureTimer();
    }, [clearAutoCaptureTimer]);

    const closeCaptureCamera = React.useCallback(() => {
        resetAutoDetectionState();
        isTakingPhotoRef.current = false;
        setCaptureInProgress(null);
        setCameraReady(false);
        setCameraModalVisible(false);
        setCameraTarget(null);
        setCameraHintSafe('');
    }, [resetAutoDetectionState, setCameraHintSafe]);

    const resetState = React.useCallback(() => {
        setStep(1);
        setFullName(initialFullName);
        setIdType('national_id');
        setIdNumber('');
        setSelfie(null);
        setDocumentFront(null);
        setDocumentBack(null);
        setConsentChecked(false);
        setCaptureInProgress(null);
        setErrorMessage('');
        closeCaptureCamera();
    }, [closeCaptureCamera, initialFullName]);

    React.useEffect(() => {
        if (visible) {
            resetState();
        } else {
            closeCaptureCamera();
        }
    }, [closeCaptureCamera, resetState, visible]);

    React.useEffect(
        () => () => {
            clearAutoCaptureTimer();
        },
        [clearAutoCaptureTimer],
    );

    React.useEffect(
        () => () => {
            stopListeners();
        },
        [stopListeners],
    );

    const parseApiErrorMessage = (error: any, fallback: string) => {
        if (!error) return fallback;
        if (typeof error === 'string') return error;
        const data = error?.data;
        if (typeof data === 'string') return data;
        if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0]);
        if (typeof data?.message === 'string') return data.message;
        if (typeof data?.error === 'string') return data.error;
        if (typeof error?.message === 'string') return error.message;
        return fallback;
    };

    const buildCapturedPhoto = React.useCallback(async (uri: string, target: KycCaptureTarget) => {
        const normalizedUri = normalizeUri(uri);
        const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const mimeType = getImageMimeType(normalizedUri);
        const extension = mimeType.split('/')[1] || 'jpg';

        return {
            uri: normalizedUri,
            dataUrl: toDataUrl(mimeType, base64),
            type: mimeType,
            name: `${target}-${Date.now()}.${extension}`,
        } as CapturedPhoto;
    }, []);

    const applyCapturedPhoto = React.useCallback((target: KycCaptureTarget, photo: CapturedPhoto) => {
        if (target === 'selfie') {
            setSelfie(photo);
            setStep((prev) => Math.max(prev, 3));
            return;
        }

        if (target === 'front') {
            setDocumentFront(photo);
            setStep((prev) => Math.max(prev, 4));
            return;
        }

        setDocumentBack(photo);
    }, []);

    const performPhotoCapture = React.useCallback(
        async (target: KycCaptureTarget, mode: CaptureMode) => {
            if (!cameraRef.current || isTakingPhotoRef.current) {
                return;
            }

            isTakingPhotoRef.current = true;
            setCaptureInProgress(target);
            setErrorMessage('');
            resetAutoDetectionState();
            setCameraHintSafe(
                mode === 'auto' ? 'Capture automatique en cours...' : 'Capture manuelle en cours...',
            );

            try {
                const photo = await cameraRef.current.takePhoto({
                    flash: 'off',
                    enableShutterSound: false,
                });

                const captured = await buildCapturedPhoto(photo.path, target);
                applyCapturedPhoto(target, captured);
                closeCaptureCamera();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Capture impossible.';
                showAlert('Capture impossible', message, 'error');
                isTakingPhotoRef.current = false;
                setCaptureInProgress(null);
                setCameraHintSafe('Repositionnez la camera puis reessayez.');
            }
        },
        [applyCapturedPhoto, buildCapturedPhoto, closeCaptureCamera, resetAutoDetectionState, setCameraHintSafe],
    );

    const openCaptureCamera = React.useCallback(
        async (target: KycCaptureTarget) => {
            setErrorMessage('');

            let granted = hasPermission;
            if (!granted) {
                try {
                    granted = await requestPermission();
                } catch {
                    granted = false;
                }
            }

            if (!granted) {
                showAlert(
                    'Permission requise',
                    'Autorisez la camera pour poursuivre la verification KYC.',
                    'warning',
                );
                return;
            }

            resetAutoDetectionState();
            isTakingPhotoRef.current = false;
            setCaptureInProgress(null);
            setCameraReady(false);
            setCameraTarget(target);
            setCameraModalVisible(true);

            if (target === 'selfie') {
                setCameraHintSafe('Cadrez votre visage dans le cercle. Capture automatique des detection stable.');
                return;
            }

            if (target === 'front') {
                setCameraHintSafe(
                    'Cadrez le recto dans le guide. Capture automatique des detection visage/photo ou objet.',
                );
                return;
            }

            setCameraHintSafe('Cadrez le verso dans le guide. Capture automatique des detection objet.');
        },
        [hasPermission, requestPermission, resetAutoDetectionState, setCameraHintSafe],
    );

    const scheduleAutoCapture = React.useCallback(
        (target: KycCaptureTarget) => {
            if (autoCaptureTimerRef.current || isTakingPhotoRef.current) {
                return;
            }

            setCameraHintSafe(
                target === 'selfie'
                    ? 'Visage valide. Capture automatique imminente...'
                    : 'Document detecte. Capture automatique imminente...',
            );
            autoCaptureTimerRef.current = setTimeout(() => {
                autoCaptureTimerRef.current = null;
                void performPhotoCapture(target, 'auto');
            }, AUTO_CAPTURE_DELAY_MS);
        },
        [performPhotoCapture, setCameraHintSafe],
    );

    const handleFaceDetection = React.useCallback(
        (
            faces: Face[],
            frameWidth: number,
            frameHeight: number,
            structuredObjectDetected: boolean,
        ) => {
            if (!cameraModalVisible || !cameraReady || !cameraTarget || isTakingPhotoRef.current) {
                return;
            }

            const largestFace = getLargestFace(faces);
            let targetDetected = false;

            if (cameraTarget === 'selfie') {
                targetDetected = isSelfieAligned(largestFace, frameWidth, frameHeight);
                if (!targetDetected) {
                    setCameraHintSafe(
                        'Aucun visage stable detecte. Regardez la camera et restez au centre.',
                    );
                }
            } else {
                const faceDetectedOnDocument = isDocumentFaceVisible(
                    largestFace,
                    frameWidth,
                    frameHeight,
                );
                targetDetected = faceDetectedOnDocument || structuredObjectDetected;
                if (!targetDetected) {
                    setCameraHintSafe(
                        'Objet non detecte clairement. Rapprochez le document et evitez les reflets.',
                    );
                }
            }

            if (!targetDetected) {
                detectionStreakRef.current = 0;
                clearAutoCaptureTimer();
                return;
            }

            detectionStreakRef.current += 1;
            const requiredStreak =
                cameraTarget === 'selfie' ? SELFIE_STREAK_TARGET : DOCUMENT_STREAK_TARGET;
            if (detectionStreakRef.current >= requiredStreak) {
                scheduleAutoCapture(cameraTarget);
            } else {
                setCameraHintSafe('Detection en cours... restez immobile.');
            }
        },
        [cameraModalVisible, cameraReady, cameraTarget, clearAutoCaptureTimer, scheduleAutoCapture, setCameraHintSafe],
    );

    const runDetectionOnJS = React.useMemo(
        () =>
            Worklets.createRunOnJS(
                (
                    faces: Face[],
                    frameWidth: number,
                    frameHeight: number,
                    structuredObjectDetected: boolean,
                ) => {
                    handleFaceDetection(
                        faces,
                        frameWidth,
                        frameHeight,
                        structuredObjectDetected,
                    );
                },
            ),
        [handleFaceDetection],
    );

    const frameProcessor = useFrameProcessor(
        (frame) => {
            'worklet';

            runAtTargetFps(4, () => {
                'worklet';
                const faces = detectFaces(frame);
                const structuredObjectDetected =
                    cameraTarget !== 'selfie'
                        ? detectStructuredObjectWorklet(frame)
                        : false;

                runDetectionOnJS(
                    faces,
                    frame.width,
                    frame.height,
                    structuredObjectDetected,
                );
            });
        },
        [cameraTarget, detectFaces, runDetectionOnJS],
    );

    const validateStep = () => {
        if (step === 1) {
            if (!fullName.trim()) {
                setErrorMessage('Le nom complet est requis.');
                return false;
            }
            if (!idNumber.trim()) {
                setErrorMessage('Le numero du document est requis.');
                return false;
            }
        }

        if (step === 2 && !selfie) {
            setErrorMessage('Prenez un selfie pour continuer.');
            return false;
        }

        if (step === 3 && !documentFront) {
            setErrorMessage('Capturez le recto de votre document.');
            return false;
        }

        if (step === 4) {
            if (!selfie || !documentFront) {
                setErrorMessage('Selfie et document recto obligatoires.');
                return false;
            }
            if (!consentChecked) {
                setErrorMessage('Confirmez l envoi du dossier KYC.');
                return false;
            }
        }

        setErrorMessage('');
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        setStep((prev) => Math.min(prev + 1, KYC_STEPS.length));
    };

    const handlePrevious = () => {
        setErrorMessage('');
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep() || !selfie || !documentFront) {
            return;
        }

        try {
            const response = await submitKyc({
                fullName: fullName.trim(),
                idType,
                idNumber: idNumber.trim(),
                selfieUrl: selfie.dataUrl,
                documentFrontUrl: documentFront.dataUrl,
                documentBackUrl: documentBack?.dataUrl,
            }).unwrap();

            const returnedStatus =
                typeof response?.kycStatus === 'string'
                    ? response.kycStatus.toLowerCase()
                    : undefined;

            if (returnedStatus === 'rejected') {
                showAlert(
                    'KYC rejete',
                    'Verification automatique echouee. Reprenez des images plus nettes et reessayez.',
                    'warning',
                );
                return;
            }

            showAlert('KYC envoye', 'Votre dossier KYC a ete soumis avec succes.', 'success');
            onSuccess?.({
                selfieUrl: selfie.dataUrl,
                documentFrontUrl: documentFront.dataUrl,
                documentBackUrl: documentBack?.dataUrl,
                kycStatus: returnedStatus,
            });
        } catch (error: any) {
            const message = parseApiErrorMessage(
                error,
                'Impossible d envoyer le dossier KYC pour le moment.',
            );
            showAlert('Echec KYC', message, 'error');
        }
    };

    const closeModal = () => {
        resetState();
        onClose();
    };

    const renderProgress = () => (
        <View style={styles.stepsRow}>
            {KYC_STEPS.map((item) => {
                const active = item.id === step;
                const done = item.id < step;
                return (
                    <View key={item.id} style={styles.stepItem}>
                        <View
                            style={[
                                styles.stepBullet,
                                active && styles.stepBulletActive,
                                done && styles.stepBulletDone,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.stepBulletText,
                                    (active || done) && styles.stepBulletTextActive,
                                ]}
                            >
                                {done ? 'OK' : item.id}
                            </Text>
                        </View>
                        <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>
                            {item.title}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    const renderStepContent = () => {
        if (step === 1) {
            return (
                <View style={styles.block}>
                    <Text style={styles.blockTitle}>Identite</Text>
                    <Text style={styles.blockHint}>Renseignez les informations comme sur votre piece.</Text>
                    <Text style={styles.label}>Nom complet *</Text>
                    <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Ex: Jean Koffi"
                        placeholderTextColor={Colors.gray400}
                        style={styles.input}
                    />

                    <Text style={styles.label}>Type de document *</Text>
                    <View style={styles.chipsRow}>
                        {KYC_ID_OPTIONS.map((option) => {
                            const selected = option.value === idType;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    onPress={() => setIdType(option.value)}
                                >
                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>Numero du document *</Text>
                    <TextInput
                        value={idNumber}
                        onChangeText={setIdNumber}
                        placeholder="Ex: CI-1234-5678"
                        placeholderTextColor={Colors.gray400}
                        style={styles.input}
                        autoCapitalize="characters"
                    />
                </View>
            );
        }

        if (step === 2) {
            return (
                <View style={styles.block}>
                    <View style={styles.captureStepHeader}>
                        <View style={[styles.captureStepIcon, styles.captureStepIconInfo]}>
                            <Ionicons name="person-outline" size={24} color={Colors.info} />
                        </View>
                        <Text style={styles.captureStepTitle}>Selfie automatique</Text>
                        <Text style={styles.blockHint}>
                            La photo se prend automatiquement quand votre visage est detecte et stable.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.captureCard} onPress={() => openCaptureCamera('selfie')}>
                        {selfie ? (
                            <View style={styles.previewWrapper}>
                                <Image source={{ uri: selfie.uri }} style={styles.previewImage} />
                                {captureInProgress === 'selfie' ? (
                                    <View style={styles.previewProcessingOverlay}>
                                        <ActivityIndicator color={Colors.white} />
                                        <Text style={styles.previewProcessingText}>Traitement...</Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            <View style={styles.capturePlaceholder}>
                                <Ionicons name="scan-circle-outline" size={28} color={Colors.primary} />
                                <Text style={styles.capturePlaceholderText}>Lancer la capture automatique</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureAction} onPress={() => openCaptureCamera('selfie')}>
                        <Ionicons name={selfie ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                        <Text style={styles.captureActionText}>
                            {selfie ? 'Reprendre le selfie' : 'Ouvrir la camera'}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (step === 3) {
            return (
                <View style={styles.block}>
                    <View style={styles.captureStepHeader}>
                        <View style={[styles.captureStepIcon, styles.captureStepIconPrimary]}>
                            <Ionicons name="id-card-outline" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.captureStepTitle}>Document: recto automatique</Text>
                        <Text style={styles.blockHint}>
                            Cadrez le recto. La capture se lance automatiquement sur detection visage/photo ou objet.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.captureCard} onPress={() => openCaptureCamera('front')}>
                        {documentFront ? (
                            <View style={styles.previewWrapper}>
                                <Image source={{ uri: documentFront.uri }} style={styles.previewImage} />
                                {captureInProgress === 'front' ? (
                                    <View style={styles.previewProcessingOverlay}>
                                        <ActivityIndicator color={Colors.white} />
                                        <Text style={styles.previewProcessingText}>Traitement...</Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : (
                            <View style={styles.capturePlaceholder}>
                                <Ionicons name="scan-outline" size={28} color={Colors.primary} />
                                <Text style={styles.capturePlaceholderText}>Scanner automatiquement le recto</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureAction} onPress={() => openCaptureCamera('front')}>
                        <Ionicons name={documentFront ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                        <Text style={styles.captureActionText}>
                            {documentFront ? 'Reprendre le recto' : 'Ouvrir la camera'}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.block}>
                <Text style={styles.blockTitle}>Confirmation finale</Text>
                <Text style={styles.blockHint}>
                    Le verso est optionnel. Activez la capture automatique puis confirmez l envoi.
                </Text>

                <TouchableOpacity style={styles.captureCardSmall} onPress={() => openCaptureCamera('back')}>
                    {documentBack ? (
                        <View style={styles.previewWrapper}>
                            <Image source={{ uri: documentBack.uri }} style={styles.previewImage} />
                            {captureInProgress === 'back' ? (
                                <View style={styles.previewProcessingOverlay}>
                                    <ActivityIndicator color={Colors.white} />
                                    <Text style={styles.previewProcessingText}>Traitement...</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : (
                        <View style={styles.capturePlaceholder}>
                            <Ionicons name="scan-outline" size={22} color={Colors.primary} />
                            <Text style={styles.capturePlaceholderText}>
                                Ajouter le verso (optionnel)
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureAction} onPress={() => openCaptureCamera('back')}>
                    <Ionicons name={documentBack ? 'refresh-outline' : 'camera'} size={16} color={Colors.primary} />
                    <Text style={styles.captureActionText}>
                        {documentBack ? 'Reprendre le verso' : 'Capturer le verso'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.checkboxRow}
                    activeOpacity={0.8}
                    onPress={() => setConsentChecked((prev) => !prev)}
                >
                    <Ionicons
                        name={consentChecked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={consentChecked ? Colors.success : Colors.gray400}
                    />
                    <Text style={[styles.checkboxText, consentChecked && styles.checkboxTextActive]}>
                        Je confirme l exactitude des informations et j autorise la verification KYC.
                    </Text>
                </TouchableOpacity>

                <View style={styles.reviewRow}>
                    <Text style={styles.reviewItem}>Selfie: {selfie ? 'Capturee' : 'Manquante'}</Text>
                    <Text style={styles.reviewItem}>Recto: {documentFront ? 'Capture' : 'Manquant'}</Text>
                    <Text style={styles.reviewItem}>Verso: {documentBack ? 'Capture' : 'Optionnel'}</Text>
                </View>
            </View>
        );
    };

    const renderCameraModal = () => {
        if (!cameraModalVisible || !cameraTarget) {
            return null;
        }

        const isSelfie = cameraTarget === 'selfie';
        const title =
            cameraTarget === 'selfie'
                ? 'Selfie automatique'
                : cameraTarget === 'front'
                ? 'Recto du document'
                : 'Verso du document';
        const subtitle =
            cameraTarget === 'selfie'
                ? 'Detection de visage en temps reel'
                : 'Detection d objet en temps reel';
        const busy = captureInProgress === cameraTarget;
        const manualDisabled = busy || !cameraDevice || !cameraReady;

        return (
            <Modal
                visible={cameraModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={closeCaptureCamera}
            >
                <View style={styles.cameraRoot}>
                    {cameraDevice ? (
                        <VisionCamera
                            ref={cameraRef}
                            style={StyleSheet.absoluteFill}
                            device={cameraDevice}
                            isActive={cameraModalVisible}
                            photo
                            frameProcessor={frameProcessor}
                            pixelFormat="yuv"
                            onInitialized={() => {
                                setCameraReady(true);
                                setCameraHintSafe(
                                    cameraTarget === 'selfie'
                                        ? 'Camera prete. Alignez votre visage.'
                                        : 'Camera prete. Alignez votre document.',
                                );
                            }}
                            onError={(error) => {
                                showAlert('Camera indisponible', error.message, 'error');
                                closeCaptureCamera();
                            }}
                        />
                    ) : (
                        <View style={styles.cameraFallback}>
                            <ActivityIndicator color={Colors.white} />
                            <Text style={styles.cameraFallbackText}>Initialisation de la camera...</Text>
                        </View>
                    )}

                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraTopBar}>
                            <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCaptureCamera}>
                                <Ionicons name="close" size={22} color={Colors.white} />
                            </TouchableOpacity>
                            <View style={styles.cameraTopText}>
                                <Text style={styles.cameraTitle}>{title}</Text>
                                <Text style={styles.cameraSubtitle}>{subtitle}</Text>
                            </View>
                        </View>

                        <View style={styles.cameraGuideArea}>
                            <View
                                style={[
                                    styles.cameraGuide,
                                    isSelfie ? styles.cameraGuideRound : styles.cameraGuideRect,
                                ]}
                            />
                        </View>

                        <View style={styles.cameraBottomPanel}>
                            <View style={styles.cameraStatusPill}>
                                <Ionicons name="scan-outline" size={15} color={Colors.white} />
                                <Text style={styles.cameraStatusText}>Auto capture active</Text>
                            </View>
                            <Text style={styles.cameraHint}>{cameraHint}</Text>

                            <TouchableOpacity
                                style={[
                                    styles.cameraManualButton,
                                    manualDisabled && styles.cameraManualButtonDisabled,
                                ]}
                                onPress={() => void performPhotoCapture(cameraTarget, 'manual')}
                                disabled={manualDisabled}
                            >
                                {busy ? (
                                    <ActivityIndicator color={Colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="camera"
                                            size={16}
                                            color={manualDisabled ? Colors.gray400 : Colors.primary}
                                        />
                                        <Text
                                            style={[
                                                styles.cameraManualButtonText,
                                                manualDisabled && styles.cameraManualButtonTextDisabled,
                                            ]}
                                        >
                                            Capturer maintenant
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal} statusBarTranslucent>
                <View style={styles.overlay}>
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>Verification KYC</Text>
                                <Text style={styles.headerSubtitle}>Etape {step}/{KYC_STEPS.length}</Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                <Ionicons name="close" size={20} color={Colors.gray500} />
                            </TouchableOpacity>
                        </View>

                        {renderProgress()}

                        <ScrollView
                            style={styles.body}
                            contentContainerStyle={styles.bodyContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {renderStepContent()}
                            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.footerGhost, step === 1 && styles.footerGhostDisabled]}
                                onPress={handlePrevious}
                                disabled={step === 1 || isSubmitting}
                            >
                                <Text style={styles.footerGhostText}>Precedent</Text>
                            </TouchableOpacity>

                            {step < KYC_STEPS.length ? (
                                <TouchableOpacity style={styles.footerCta} onPress={handleNext}>
                                    <LinearGradient colors={Gradients.primary} style={styles.footerGradient}>
                                        <Text style={styles.footerCtaText}>Continuer</Text>
                                        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.footerCta, isSubmitting && styles.footerCtaDisabled]}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    <LinearGradient colors={Gradients.accent} style={styles.footerGradient}>
                                        {isSubmitting ? (
                                            <ActivityIndicator color={Colors.primary} />
                                        ) : (
                                            <>
                                                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                                                <Text style={styles.footerCtaTextAccent}>Confirmer et envoyer</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {renderCameraModal()}

            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                confirmText="OK"
                onConfirm={() => {
                    const wasSuccess = alertState.type === 'success';
                    hideAlert();
                    if (wasSuccess) {
                        closeModal();
                    }
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(1, 9, 23, 0.58)',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xl,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        maxHeight: '92%',
        ...Shadows.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        marginTop: 2,
        color: Colors.gray500,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.gray50,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepBullet: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.gray300,
        backgroundColor: Colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBulletActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    stepBulletDone: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    stepBulletText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.bold,
    },
    stepBulletTextActive: {
        color: Colors.white,
    },
    stepLabel: {
        marginTop: 4,
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        fontWeight: Typography.fontWeight.medium,
    },
    stepLabelActive: {
        color: Colors.textPrimary,
        fontWeight: Typography.fontWeight.bold,
    },
    body: {
        maxHeight: 430,
    },
    bodyContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    block: {
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray100,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    blockTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
    },
    blockHint: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    label: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
        marginTop: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    chip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray300,
        backgroundColor: Colors.white,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    chipTextSelected: {
        color: Colors.white,
    },
    captureStepHeader: {
        alignItems: 'center',
        paddingBottom: Spacing.xs,
        gap: Spacing.xs,
    },
    captureStepIcon: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureStepIconInfo: {
        backgroundColor: Colors.info + '1A',
    },
    captureStepIconPrimary: {
        backgroundColor: Colors.primary + '18',
    },
    captureStepTitle: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.extrabold,
        textAlign: 'center',
    },
    captureCard: {
        marginTop: Spacing.xs,
        height: 188,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.gray300,
        backgroundColor: Colors.white,
        overflow: 'hidden',
    },
    captureCardSmall: {
        marginTop: Spacing.xs,
        height: 150,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.gray300,
        backgroundColor: Colors.white,
        overflow: 'hidden',
    },
    previewWrapper: {
        flex: 1,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    previewProcessingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    previewProcessingText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    capturePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
    },
    capturePlaceholderText: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
        textAlign: 'center',
        lineHeight: 20,
    },
    captureAction: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary + '44',
        backgroundColor: Colors.primary + '10',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
    },
    captureActionText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    checkboxRow: {
        marginTop: Spacing.xs,
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'flex-start',
    },
    checkboxText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
    },
    checkboxTextActive: {
        color: Colors.success,
        fontWeight: Typography.fontWeight.semibold,
    },
    reviewRow: {
        marginTop: Spacing.xs,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: 4,
    },
    reviewItem: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    errorText: {
        marginTop: Spacing.sm,
        color: Colors.error,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    footerGhost: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
    },
    footerGhostDisabled: {
        opacity: 0.45,
    },
    footerGhostText: {
        color: Colors.gray600,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold,
    },
    footerCta: {
        flex: 1.5,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    footerCtaDisabled: {
        opacity: 0.8,
    },
    footerGradient: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    footerCtaText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    footerCtaTextAccent: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cameraRoot: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    cameraFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.black,
    },
    cameraFallbackText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.huge,
        paddingBottom: Spacing.xl,
    },
    cameraTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    cameraCloseButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cameraTopText: {
        flex: 1,
    },
    cameraTitle: {
        color: Colors.white,
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.extrabold,
    },
    cameraSubtitle: {
        marginTop: 2,
        color: Colors.white + 'D0',
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium,
    },
    cameraGuideArea: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    cameraGuide: {
        borderWidth: 2,
        borderColor: Colors.white,
        backgroundColor: 'transparent',
    },
    cameraGuideRound: {
        width: 250,
        height: 250,
        borderRadius: 125,
    },
    cameraGuideRect: {
        width: 300,
        height: 190,
        borderRadius: BorderRadius.lg,
    },
    cameraBottomPanel: {
        backgroundColor: 'rgba(1, 9, 23, 0.68)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        gap: Spacing.sm,
    },
    cameraStatusPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + 'CC',
    },
    cameraStatusText: {
        color: Colors.white,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.bold,
    },
    cameraHint: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        lineHeight: 19,
    },
    cameraManualButton: {
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    cameraManualButtonDisabled: {
        backgroundColor: Colors.gray100,
    },
    cameraManualButtonText: {
        color: Colors.primary,
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold,
    },
    cameraManualButtonTextDisabled: {
        color: Colors.gray500,
    },
});
