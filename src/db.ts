
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

import { UserData, CreateUserInput, UpdateUserInput, PasswordResetToken } from "./types";
import type { GithubProfile, UserAuthData } from "./types/auth.types.js";

const prisma = new PrismaClient();

export async function createUser(input: CreateUserInput): Promise<UserData> {
    const { username, email, password, role = 'user' } = input;

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hash,
            role
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return user;
}

export async function getAllUsers(): Promise<UserData[]> {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return users;
}

export async function getUserById(id: number): Promise<UserData | null> {

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return user;
}

export async function getUserByUsername(usernameOrEmail: string): Promise<UserData | null> {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: usernameOrEmail },
                { email: usernameOrEmail }
            ]
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return user;
}

// For authentication (WITH password)
export async function getUserForAuth(username: string): Promise<UserAuthData> {
    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            password: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return user;
}

export async function updateUser(id: number, updates: UpdateUserInput): Promise<UserData | null> {
    const data: Partial<UserData> = {}; // this makes every property optional

    if (updates.email !== undefined) {
        data.email = updates.email;
    }
    if (updates.role !== undefined) {
        data.role = updates.role;
    }
    if (updates.password !== undefined) {
        const hash = await bcrypt.hash(updates.password, 10);
        data.password = hash;
    }

    const user = await prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return user;

}

export async function deleteUser(id: number): Promise<UserData | null> {
    const user = await prisma.user.delete({
        where: { id },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            avatar: true,
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return user;
}

export async function findOrCreateGithubUser(profile: GithubProfile): Promise<UserData> {

    const githubIdString = String(profile.id);

    let user = await prisma.user.findUnique({
        where: { githubId: githubIdString }
    })

    if (user) {
        // user already exists linked with github
        if (user.avatar !== profile.avatar_url) {
            // if users avatar changed in github we change it here as well
            await prisma.user.update({
                where: { id: user.id },
                data: { avatar: profile.avatar_url }
            })
        }
        return user;
    }

    // creating a new user for this github account
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username: profile.login + counter } })) {
        counter++;
    }

    user = await prisma.user.create({
        data: {
            username: profile.login + counter,
            email: profile.email || `${profile.login + counter}@github.noreply.local`,
            avatar: profile.avatar_url,
            githubId: githubIdString
        }
    })

    return user;
}

export async function createPasswordResetToken(userId: number): Promise<PasswordResetToken> {
    const token = (await import('crypto')).randomBytes(12).toString('hex');

    const expiresAt = new Date();


    expiresAt.setHours(expiresAt.getHours() + 24 * 7); // 7 days access token

    const resetToken = await prisma.passwordReset.create({
        data: {
            token,
            userId,
            expiresAt
        }
    });

    return resetToken;
}


export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const resetToken = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetToken) {
        return null;
    }

    if (resetToken.expiresAt < new Date()) {
        await prisma.passwordReset.delete({
            where: { id: resetToken.id }
        });
        return null;
    }

    return resetToken;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
    await prisma.passwordReset.delete({
        where: { token }
    })
}

/////// Temporary ///////
export async function createAdminIfNeeded() {
    let user = await getUserByUsername('admin')

    if (!user) {
        user = await createUser({
            username: 'admin',
            email: 'admin@test.com',
            password: 'admin',
            role: 'admin'
        })
        if (user)
            console.log("\x1b[32m%s\x1b[0m", 'Admin user created: username=admin, password=admin')
    }
}

