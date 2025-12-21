
// import type { userRoles } from "./user.types.ts";

export interface JWTPayload {
    userId: number;
    username: string;
    requires2FA: boolean;
}

export interface PasswordResetToken {
    id: number;
    token: string;
    userId: number;
    expiresAt: Date;
    createdAt: Date;
}

export interface GithubProfile {
    id: string;
    login: string;
    email: string;
    avatar_url: string;
}

export interface PasswordResetInput {
    token: string;
    password: string;
}

export interface PasswordForgetInput {
    email: string;
}

export interface UserAuthData {
    id: number;
    username: string;
    email: string;
    avatar: string;
    githubId: string;
    password?: string;
    twoFactor?: {
        method: string | null;
        totpSecret: string | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

