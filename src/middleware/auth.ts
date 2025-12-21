
import type { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '../types';

export async function verifyToken(req: FastifyRequest, resp: FastifyReply): Promise<void> {
    try {
        const token = req.cookies?.authToken;
        if (!token) {
            return resp.code(401).send({
                error: 'Authentication required',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SEC as string) as JWTPayload;

        if (decoded.requires2FA) {
            return resp.code(403).send({
                error: '2FA verification required',
                requires2FA: true
            });
        }

        req.user = decoded;

    } catch (error: unknown) {  /// what is the best type for error here?
        // Handle specific JWT errors
        if (error instanceof jwt.JsonWebTokenError) {
            return resp.code(401).send({
                error: 'Invalid token',
                message: 'Token is malformed or invalid'
            });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return resp.code(401).send({
                error: 'Token expired',
                message: 'Please login again'
            });
        }

        // default error
        return resp.code(500).send({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
    }
}

export async function verify2FAToken(req: FastifyRequest, resp: FastifyReply): Promise<void> {
    try {
        const token = req.cookies?.twoFAToken;

        if (!token) {
            return resp.code(401).send({
                error: 'Authentication required',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SEC as string) as JWTPayload;

        req.user = decoded;
    } catch (error) {
        return resp.code(500).send({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
    }
}


