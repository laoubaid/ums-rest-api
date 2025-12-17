// verifying role is admin
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    if (!request.user) {
        return reply.code(401).send({
            error: 'Not authenticated'
        });
    }

    if (request.user.role !== 'admin') {
        return reply.code(403).send({
            error: 'Admin access required!'
        });
    }
}