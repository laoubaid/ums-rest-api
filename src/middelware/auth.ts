
import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

export async function verifyToken(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
        const token = req.cookies?.authToken;
        if (!token) {
            return res.code(401).send({
                error: 'Authentication required',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SEC as string) as JWTPayload;

        req.user = decoded;

    } catch (error: unknown) {  /// what is the best type for error here?
        // Handle specific JWT errors
        if (error instanceof jwt.JsonWebTokenError) {
            return res.code(401).send({
                error: 'Invalid token',
                message: 'Token is malformed or invalid'
            });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.code(401).send({
                error: 'Token expired',
                message: 'Please login again'
            });
        }

        // default error
        return res.code(500).send({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
    }
}

