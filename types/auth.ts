import { User } from './user';

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

export interface AuthResponse {
    user: User; // Note: In some flows backend returns tokens separate from user
    tokens?: AuthTokens;
}

export interface VerifyOtpResponse {
    tokens?: AuthTokens;
    status: string;
    phone?: string;
}

export interface RequestOtpResponse {
    message: string;
    phone: string;
    status: string;
}

export interface LoginRequest {
    phone: string;
    password?: string; // Optional if using OTP login flow, but used in LoginScreen
}

export interface RegisterRequest {
    phone: string;
    username?: string; // Kept for compatibility if backend uses it
    password?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
}

export interface VerifyOtpRequest {
    phone: string;
    otp: string;
}

export interface RefreshTokenRequest {
    oldAccessToken: string;
}
