import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import { createTestUserIfNeeded } from './db';
import { testEmailConnection } from './services/email';
import twoFactorRoutes from './routes/2fa';
import { env } from './env';

const fastifyServer = Fastify({
    logger: true,
});

async function startServer(): Promise<void> {
    try {
        await fastifyServer.register(fastifyCookie, {
            secret: env.COOKIE_SECRET
        });

        await fastifyServer.register(import('@fastify/rate-limit'), {
            max: 100,
            timeWindow: '1 minute',
            keyGenerator: (request) => {
                return request.user?.userId || request.ip; // use userId if available
            }
        })

        // testing email connection on startup 
        await testEmailConnection();

        await fastifyServer.register(jwt, {
            secret: env.JWT_SEC,
            cookie: {
                cookieName: 'authToken', // Tell it where to find the token
                signed: false
            }
        });

        fastifyServer.decorate('authenticate', async (request, reply) => {
            try {
                await request.jwtVerify() // Auto-verifies token from cookie/header

                if (request.user.requires2FA) {
                    return reply.code(403).send({ error: '2FA required' })
                }
            } catch (err) {
                return reply.code(401).send({ error: 'Invalid token' })
            }
        })

        fastifyServer.decorate('authenticate2FA', async (request, reply) => {
            try {
                await request.jwtVerify() // Uses authToken cookie by default

                if (!request.user.requires2FA) {
                    return reply.code(403).send({ error: '2FA not required' })
                }

            } catch (err) {
                return reply.code(401).send({ error: 'Invalid or expired token' })
            }
        })

        await fastifyServer.register(swagger, {
            mode: 'static',
            specification: {
                path: './openapi.yaml',   // change it later
                baseDir: process.cwd(),
            }
        });

        await fastifyServer.register(swaggerUI, {
            routePrefix: '/docs', // URL where Swagger UI will be served
        });

        // the following code is a fix for the options request check for Cross Origin Resource Sharing
        // Register CORS 
        await fastifyServer.register(cors, {
            origin: [env.FRONTEND_URL],   // diffrent host is needed for 127.0.0.1
            credentials: true,  // for siting cookies to work 
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        });

        // registering Routes
        fastifyServer.register(userRoutes, { prefix: '/api/users' });
        fastifyServer.register(authRoutes, { prefix: '/api/auth' });
        fastifyServer.register(twoFactorRoutes, { prefix: '/api/2fa' });


        // health check
        fastifyServer.get('/health', async (_request, _reply) => {
            return { status: 'ok' }
        });
        // register end;

        await fastifyServer.listen({
            port: Number(env.PORT),
            host: '127.0.0.1'
        });

        console.log('\x1b[32m%s\x1b[0m', 'Server running on localhost:3000');
        await createTestUserIfNeeded();

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to start server:', error);
        process.exit(1);
    }
}

startServer();   // change the calling place of this function





