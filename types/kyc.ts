export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export type KycIdType =
    | 'national_id'
    | 'passport'
    | 'driver_license'
    | 'voter_card'
    | 'residence_permit';

export interface KycPayload {
    fullName: string;
    idType: KycIdType | string;
    idNumber: string;
    documentFrontUrl: string;
    documentBackUrl?: string;
    selfieUrl: string;
}

export interface KycData extends KycPayload {
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    reviewNote?: string;
}

export interface KycEligibilityResponse {
    kycStatus: KycStatus;
    isKycApproved: boolean;
}

export interface KycStatusResponse extends KycEligibilityResponse {
    kyc: KycData | null;
}

export interface SubmitKycResponse {
    _id: string;
    image?: string;
    kycStatus?: KycStatus;
    kyc?: KycData;
    [key: string]: unknown;
}
