
export interface JWTPayload {
    // 1. Custom Data (from your signing object)
    userId: number;
    username: string;
    role: string; // Use union types if roles are fixed

    // 2. Standard Claims (added by the { expiresIn: '7d' } option)
    // Issued At (time token was created)
    // iat: number;
    // // Expiration Time (time token expires)
    // exp: number;
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
    role: string;
    avatar: string;
    githubId: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

