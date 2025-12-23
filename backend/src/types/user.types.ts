


export type User = {
    id: number;
    email: string;
    password: string | null;
    avatar: string | null;
    githubId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserData {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    twoFactor?: {
        method: string | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
}

export interface CreateUserOutput {
    id: number;
    email: string;
    username: string;
}

export interface UpdateUserInput {
    email?: string;
    password?: string;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}


