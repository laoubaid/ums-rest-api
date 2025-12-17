import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import { createAdminIfNeeded } from './db';
import { testEmailConnection } from './services/email';

const fastifyServer = Fastify({
    logger: true,
});

async function startServer(): Promise<void> {
    try {
        await fastifyServer.register(fastifyCookie, {
            // IMPORTANT: Use a strong, unique secret from environment variables in a real app
            secret: process.env.COOKIE_SECRET || "super-secure-default-secret-key-12345"
        });

        // testing email connection on startup 
        await testEmailConnection();


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
            origin: [process.env.FRONTEND_URL],   // diffrent host is needed for 127.0.0.1
            credentials: true  // for siting cookies to work 
        });

        // registering Routes
        fastifyServer.register(userRoutes, { prefix: '/api/users' });
        fastifyServer.register(authRoutes, { prefix: '/api/auth' });


        // rate limite?
        fastifyServer.get('/health', async (_request, _reply) => {
            return { status: 'ok' }
        });
        // register end;

        await fastifyServer.listen({
            port: Number(process.env.PORT) || 3000,
            host: '127.0.0.1'
        });

        console.log('\x1b[32m%s\x1b[0m', 'Server running on localhost:3000');
        await createAdminIfNeeded();

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to start server:', error);
        process.exit(1);
    }
}

startServer();   // change the calling place of this function





