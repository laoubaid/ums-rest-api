
import { PrismaClient, TwoFactorCode, UserTwoFactor } from "@prisma/client";
import bcrypt from "bcrypt";

import { UserData, CreateUserInput, UpdateUserInput, PasswordResetToken } from "./types";
import type { GithubProfile, UserAuthData } from "./types/auth.types.js";
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function createUser(input: CreateUserInput): Promise<UserData> {
    const { username, email, password } = input;

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hash
        },
        select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true,
                    totpSecret: true
                }
            },
            githubId: true,
            password: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return user;
}

export async function updateUser(id: number, updates: UpdateUserInput): Promise<UserData | null> {
    const data: any = {}; // this makes every property optional

    if (updates.email !== undefined) {
        data.email = updates.email;
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
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
            avatar: true,
            twoFactor: {
                select: {
                    method: true
                }
            },
            githubId: true,
            createdAt: true,
            updatedAt: true
        }
    });

    return user;
}

export async function findOrCreateGithubUser(profile: GithubProfile): Promise<UserData> {

    const gitHubUserId = profile.id.toString();

    let user = await prisma.user.findUnique({
        where: { githubId: gitHubUserId }
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
            email: profile.email || `${profile.login}@github.com`,
            avatar: profile.avatar_url,
            githubId: gitHubUserId
        }
    })

    return user;
}

export async function createPasswordResetToken(userId: number): Promise<PasswordResetToken> {
    const token = crypto.randomBytes(12).toString('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

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

export async function findTwoFactorCode(userCode: string): Promise<TwoFactorCode | null> {
    const code = await prisma.twoFactorCode.findFirst({
        where: { code: userCode }
    });

    if (!code) {
        console.error('\x1b[31m%s\x1b[0m', "No 2FA code found for user");
        return null;
    }

    if (code.expiresAt < new Date()) {
        console.error('\x1b[31m%s\x1b[0m', "2FA code expired for user");
        await prisma.twoFactorCode.delete({
            where: { id: code.id }
        });
        return null;
    }

    console.log('2FA code found for user ', "code: ", code.code);
    return code;
}

export async function updateTwoFactor(userId: number): Promise<UserTwoFactor> {
    const twoFactor = await prisma.userTwoFactor.update({
        where: { userId },
        data: { enabled: true }
    });
    return twoFactor;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
    await prisma.passwordReset.delete({
        where: { token }
    })
}

export async function saveRefreshToken(userId: number, refreshToken: string) {
    await prisma.refreshToken.create({
        data: {
            userId,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    })
}

export async function getUserByRefreshToken(token: string): Promise<UserData | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
        where: { token }
    });

    if (!refreshToken) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: refreshToken.userId }
    });

    return user;
}

export async function createTwoFactor(userId: number, secret: string | null) {
    // 2. Save 2FA config (disabled by default)

    if (secret) {
        await prisma.userTwoFactor.create({
            data: {
                userId,
                method: 'totp',
                totpSecret: secret
            }
        });
    } else {
        await prisma.userTwoFactor.create({
            data: {
                userId,
                method: 'email'
            }
        });
    }
}

export async function deleteTwoFactor(userId: number) {
    await prisma.userTwoFactor.delete({
        where: { userId }
    });
}


export async function generateTwoFactorCode(userId: number) {
    // 1. Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 2. Save verification code
    await prisma.twoFactorCode.create({
        data: {
            userId,
            code,
            expiresAt
        }
    });

    return code;
}

export async function deleteTwoFactorCode(userId: number) {
    await prisma.twoFactorCode.deleteMany({
        where: { userId }
    });
}








/////// Temporary ///////
export async function createTestUserIfNeeded() {
    let user = await getUserByUsername('test')

    if (!user) {
        user = await createUser({
            username: 'test',
            email: 'test@test.com',
            password: 'test'
        })
        if (user)
            console.log("\x1b[32m%s\x1b[0m", 'Test user created: username=test, password=test')
    }
}

