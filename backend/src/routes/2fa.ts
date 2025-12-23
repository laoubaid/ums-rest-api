import { FastifyInstance } from "fastify";
import { StrictRateLimit } from "./auth";
import { createTwoFactor, generateTwoFactorCode, deleteTwoFactor, deleteTwoFactorCode, findTwoFactorCode, getUserForAuth, updateTwoFactor } from "../db";
import bcrypt from 'bcrypt';
import { send2faEmailCode } from "../services/email";
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const Setup2FASchema = {
    body: {
        type: 'object',
        required: ['method', 'password'],
        properties: {
            method: { type: 'string', enum: ['email', 'totp'] },
            password: { type: 'string', minLength: 1 }
        }
    }
} as const;

const Confirm2FASchema = {
    body: {
        type: 'object',
        required: ['code'],
        properties: {
            code: { type: 'string' }
        }
    }
} as const;

export default async function twoFactorRoutes(server: FastifyInstance): Promise<void> {

    // POST /2fa/setup
    server.post<{
        Body: {
            method: 'email' | 'totp';
            password: string;
        }
    }>('/setup', {
        config: StrictRateLimit,
        schema: Setup2FASchema,
        preHandler: [server.authenticate]
    }, async (request, reply) => {

        const { method, password } = request.body;
        const userId = request.user.userId; // from JWT payload

        const user = await getUserForAuth(request.user.username);

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        // 2. Check if 2FA already exists
        if (user.twoFactor) {
            return reply.code(400).send({
                error: "2FA is already configured. Please delete existing setup first."
            });
        }

        // 3. Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return reply.code(401).send({ error: "Invalid password" });
        }

        // 4. save settings
        if (method === 'email') {
            await createTwoFactor(userId, null);
        } else {
            const secret = speakeasy.generateSecret({
                name: `trandandan (${user.username})`,
                issuer: 'trandandan'
            });

            await createTwoFactor(userId, secret.base32);

            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            return reply.send({
                method: 'totp',
                secret: secret.base32,        // For manual entry if QR fails
                qrCode: qrCodeUrl,           // Base64 image: data:image/png;base64,...
                message: 'Scan QR code with Google Authenticator'
            });

        }

        // 5. generate code
        const code = await generateTwoFactorCode(userId);

        // 6. Send email
        await send2faEmailCode(user.email, code);

        return reply.send({
            message: 'Verification code sent to your email',
            devCode: code,   // devonly for testing
            expiresIn: '10 minutes'
        });
    });

    // POST /2fa/confirm
    server.post<{
        Body: { code: string }
    }>('/confirm', {
        config: StrictRateLimit,
        schema: Confirm2FASchema,
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { code } = request.body;

        if (!code) {
            return reply.code(400).send({ error: 'Code is required' });
        }

        const user = await getUserForAuth(request.user.username);

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        if (!user.twoFactor) {
            return reply.code(400).send({ error: '2FA is not configured' });
        }

        const totpSecret = user.twoFactor.totpSecret;

        if (user.twoFactor.method === 'totp' && totpSecret) {
            const isValid = speakeasy.totp.verify({
                secret: totpSecret,
                encoding: 'base32',
                token: code,
                window: 2  // Accept codes from ±60 seconds (allows clock drift)
            });

            if (!isValid) {
                return reply.code(401).send({ error: 'Invalid code' });
            }
        } else {
            const isValidCode = await findTwoFactorCode(code);

            if (!isValidCode || isValidCode.code !== code) {
                return reply.code(401).send({ error: 'Invalid code' });
            }

            await deleteTwoFactorCode(request.user.userId);
        }
        await updateTwoFactor(request.user.userId);
        return reply.send({
            message: '2FA enabled successfully'
        });

    })

    // DELETE /2fa/setup
    server.delete<{
        Body: { password: string }
    }>('/setup', {
        config: StrictRateLimit,
        schema: {
            body: {
                type: 'object',
                required: ['password'],
                properties: {
                    password: { type: 'string' }
                }
            }
        },
        preHandler: [server.authenticate]
    }, async (request, reply) => {
        const { password } = request.body;
        const userId = request.user.userId; // from JWT payload

        const user = await getUserForAuth(request.user.username);

        if (!user) {
            return reply.code(404).send({ error: 'User not Found' });
        }

        if (!user.twoFactor) {
            return reply.code(400).send({ error: '2FA is not configured' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return reply.code(401).send({ error: 'Invalid password' });
        }

        await deleteTwoFactor(userId);
        await deleteTwoFactorCode(userId);

        return reply.send({
            message: '2FA disabled successfully'
        });

    })

}

