
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { LoginInput, RegisterInput, JWTPayload, CreateUserInput, PasswordResetInput, GithubProfile } from '../types';
import { createPasswordResetToken, createUser, deletePasswordResetToken, deleteTwoFactorCode, findOrCreateGithubUser, findPasswordResetToken, findTwoFactorCode, generateTwoFactorCode, getUserByUsername, getUserForAuth, updateUser } from '../db';
import { send2faEmailCode, sendPasswordResetEmail } from '../services/email.js';
import speakeasy from 'speakeasy';

const LoginSchema = {
    body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
            username: { type: 'string' },
            password: { type: 'string' }
        }
    }
} as const;

const RegisterSchema = {
    body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
            username: { type: 'string', minLength: 4, maxLength: 16 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 4, maxLength: 16 }  // also change in production
        }
    }
} as const;

export const StrictRateLimit = {
    rateLimit: {
        max: 5,
        timeWindow: '1 minute'
    }
} as const;

const ForgotPasswordSchema = {
    body: {
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email' }
        }
    }
} as const;

const ResetPasswordSchema = {
    body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
            token: { type: 'string' },
            password: { type: 'string' }
        }
    }
} as const;

const GitHubCallbackSchema = {
    querystring: {
        type: 'object',
        required: ['code'],
        properties: {
            code: { type: 'string' }
        }
    }
} as const;

type GitHubCallbackQuery = {
    code?: string;
};

type GitHubTokenResponse = {
    access_token?: string;
    error?: string;
    error_description?: string;
};

export default async function authRoutes(server: FastifyInstance): Promise<void> {

    // login endpoint
    server.post<{
        Body: LoginInput
    }>('/login', {
        config: StrictRateLimit, // more strict rate limit for login 5/min 
        schema: LoginSchema
    }, async (request, reply) => {

        const { username, password } = request.body;

        if (!password || !username) {
            return reply.send({ error: "username and password are requierd!" });
        }

        const user = await getUserForAuth(username);

        if (!user) {
            return reply.code(401).send({
                error: "Invalid username or password!"
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return reply.code(401).send({
                error: "Invalid username or password!"
            });
        }

        const payload: JWTPayload = {
            userId: user.id,
            username: user.username,
            requires2FA: user.twoFactor ? true : false
        }

        const jwToken = server.jwt.sign(payload, { expiresIn: '7d' });

        reply.setCookie('authToken', jwToken, {
            httpOnly: true,
            secure: true,   // MUST BE TRUE
            sameSite: 'none', // MUST BE 'None' for cross-site/port requests
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        if (user.twoFactor) {
            const code = await generateTwoFactorCode(user.id);
            await send2faEmailCode(user.email, code);

            return reply.send({
                message: 'need to verify 2FA, code sent to your email',
                requires2FA: true,
                devCode: code,
                expiresIn: '10 minutes'
            });
        }

        return reply.send({
            message: 'Login successful',
            user: {   // use interface later
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });

    // register endpoint
    server.post<{
        Body: RegisterInput
    }>('/register', {
        config: StrictRateLimit,
        schema: RegisterSchema
    }, async (request, reply) => {
        const { username, email, password } = request.body;

        if (!username || !email || !password) {
            return reply.code(400).send({ error: "username, email and password are required" });
        }

        if (password.length < 4) { // weaker password for development
            return reply.code(400).send({ error: "password must be at least 4 characters long" });
        }

        const newUser: CreateUserInput = {
            username,
            email,
            password
        }


        const existingUser = await getUserByUsername(username);

        if (existingUser) {
            return reply.code(409).send({ error: "User already exists" });
        }

        const user = await createUser(newUser);

        if (user) {
            return reply.code(201).send({
                message: "User created successfully",
                user
            });
        }

        return reply.code(500).send({ error: "Internal server error" });
    });

    // logout endpoint
    server.post('/logout', async (_request, reply) => {
        reply.clearCookie('authToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });

        return reply.send({
            message: 'Logout successful. Token invalidated.'
        });
    });

    // forget password endpoint
    server.post<{
        Body: { email: string }
    }>('/forgot-password', {
        schema: ForgotPasswordSchema
    }, async (request, reply) => {
        const { email } = request.body;

        if (!email) {
            return reply.code(400).send({ error: "email is required" });
        }

        try {
            const user = await getUserByUsername(email);

            if (user) {
                const resetToken = await createPasswordResetToken(user.id);

                await sendPasswordResetEmail(user.email, resetToken.token);

                return reply.send({
                    message: "Password reset email sent successfully",
                    // !!! ONLY FOR DEVELOPMENT Remove in production!
                    devToken: resetToken.token
                })
            }
            return reply.send({
                message: "Password reset email sent successfully"
            })
        } catch (error) {
            return reply.code(500).send({ error: "Internal server error" });
        }
    });

    // reset password endpoint
    server.post<{
        Body: PasswordResetInput
    }>('/reset-password', {
        schema: ResetPasswordSchema
    }, async (request, reply) => {
        const { token, password } = request.body;

        if (!token || !password) {
            return reply.code(400).send({ error: "token and password are required" });
        }

        if (password.length < 4) {   //! change to 8 in production
            return reply.code(400).send({ error: "password must be at least 4 characters long" });
        }

        try {
            //find and validate token
            const resetToken = await findPasswordResetToken(token);

            if (!resetToken) {
                return reply.code(400).send({ error: 'Invalid or expired token' })
            }

            await updateUser(resetToken.userId, { password });
            await deletePasswordResetToken(token);

            return reply.send({
                message: "Password reset successfully"
            })

        } catch (error) {
            return reply.code(500).send({ error: "Internal server error" });
        }
    });

    // github login endpoint
    server.get('/github', async (_request, reply) => {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const redirectUri = 'http://localhost:3000/api/auth/github/callback';  // change this to var
        const scope = 'read:user user:email';

        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

        reply.redirect(githubAuthUrl);
    });

    // GitHub OAuth callback endpoint
    server.get<{
        Querystring: GitHubCallbackQuery  // generic type argument
    }>('/github/callback', {
        schema: GitHubCallbackSchema
    }, async (request, reply) => {
        const { code } = request.query;

        if (!code) {
            return reply.code(400).send({ error: 'Authorization code not provided' });
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code
                })
            });

            const tokenData = await tokenResponse.json() as GitHubTokenResponse;

            if (tokenData.error) {
                return reply.code(400).send({
                    error: tokenData.error_description || 'GitHub authentication failed'
                });
            }

            if (!tokenData.access_token) {
                return reply.code(400).send({ error: 'No access token received' });
            }

            const githubAccessToken = tokenData.access_token;

            // Get user info with token
            const githubUserResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${githubAccessToken}`,
                    'Accept': 'application/json'
                }
            });

            const githubUser = await githubUserResponse.json() as GithubProfile;

            // Create or find user in database
            const user = await findOrCreateGithubUser(githubUser);

            //! should i make a function to generate the token? repeated code!?
            // Generate JWT token   
            const payload: JWTPayload = {
                userId: user.id,
                username: user.username,
                requires2FA: user.twoFactor ? true : false
            };

            const jwToken = server.jwt.sign(payload, { expiresIn: '7d' });

            // Set authentication cookie
            reply.setCookie('authToken', jwToken, {
                httpOnly: true,
                secure: true, // change to -> process.env.NODE_ENV === 'production',
                sameSite: 'none',  // change for more secure approach
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Redirect to frontend
            return reply.redirect(`${process.env.FRONTEND_URL}/profile`, 303);

        } catch (err) {
            console.error('[GitHub OAuth error]:', err);
            return reply.code(500).send({ error: 'Authentication failed' });
        }
    });

    // 2fa verification
    server.post<{
        Body: { code: string }
    }>('/login/verify', {
        config: StrictRateLimit,
        preHandler: [server.authenticate2FA]
    }, async (request, reply) => {

        const { code } = request.body;

        if (!code) {
            return reply.code(400).send({ error: 'Code is required' });
        }

        const userId = request.user.userId;

        if (!userId) {
            return reply.code(400).send({ error: 'User ID is required' });
        }

        const user = await getUserForAuth(request.user.username);

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        if (user.twoFactor.method === 'email') {
            const isValidCode = await findTwoFactorCode(code);

            if (!isValidCode || isValidCode.code !== code) {
                return reply.code(401).send({ error: 'Invalid code' });
            }

            await deleteTwoFactorCode(userId);
        } else if (user.twoFactor.method === 'totp') {
            const isValid = speakeasy.totp.verify({
                secret: user.twoFactor.totpSecret,
                encoding: 'base32',
                token: code,
                window: 2
            });
            if (!isValid) {
                return reply.code(401).send({ error: 'Invalid code' });
            }
        }

        const payload: JWTPayload = {
            userId: user.id,
            username: user.username,
            requires2FA: false
        };

        const jwToken = server.jwt.sign(payload, { expiresIn: '7d' });

        reply.setCookie('authToken', jwToken, {
            httpOnly: true,
            secure: true, // change to -> process.env.NODE_ENV === 'production',
            sameSite: 'none',  // change for more secure approach
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return reply.send({
            message: '2FA verified successfully',
            user: {   // use interface later
                id: user.id,
                username: user.username,
                requires2FA: false
            }
        });

    });

}
