


export type User = {
    id: number;
    email: string;
    password: string | null;
    role: userRoles;
    avatar: string | null;
    githubId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type userRoles = "user" | "admin";

export interface UserData {
    id: number;
    username: string;
    email: string;
    role?: string;
    password?: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    role: string;
}

export interface CreateUserOutput {
    id: number;
    email: string;
    username: string;
    role: string;
}

export interface UpdateUserInput {
    email?: string;
    password?: string;
    role?: string;
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


