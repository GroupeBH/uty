import React from 'react';

export type Face = {
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    yawAngle?: number;
    rollAngle?: number;
};

export type FrameFaceDetectionOptions = {
    performanceMode?: 'fast' | 'accurate';
    contourMode?: 'none' | 'all';
    landmarkMode?: 'none' | 'all';
    classificationMode?: 'none' | 'all';
    trackingEnabled?: boolean;
    autoMode?: boolean;
    minFaceSize?: number;
    cameraFacing?: 'front' | 'back';
};

export const useFaceDetector = (_options: FrameFaceDetectionOptions) => {
    const detectFaces = React.useCallback((_frame: unknown): Face[] => {
        'worklet';
        return [];
    }, []);

    const stopListeners = React.useCallback(() => {}, []);

    return { detectFaces, stopListeners };
};
