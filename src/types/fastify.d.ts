
import 'fastify';
import { JWTPayload } from './auth.types';
import { FastifyJWT } from '@fastify/jwt';

declare module 'fastify' {
    interface FastifyRequest {
        user?: JWTPayload;  // Added by verifyToken middleware (gets it from the cookie)
    }
    // Augment the FastifyInstance interface (optional but good practice)
    interface FastifyInstance {
        // Declares the decorator added by the cookie plugin
        // The utility types here ensure correctness
        register: FastifyPluginAsync<{}> extends FastifyPluginAsync<FastifyCookieOptions> ? FastifyPluginAsync<FastifyCookieOptions> : never;
        cookie: FastifyCookie;
        authenticate: FastifyPluginAsync<{}> extends FastifyPluginAsync<FastifyCookieOptions> ? FastifyPluginAsync<FastifyCookieOptions> : never;
        authenticate2FA: FastifyPluginAsync<{}> extends FastifyPluginAsync<FastifyCookieOptions> ? FastifyPluginAsync<FastifyCookieOptions> : never;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JWTPayload;
        user: JWTPayload;
    }
}
