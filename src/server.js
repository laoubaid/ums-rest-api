
import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import { initializeTempData } from './db.js';

// init Fastify instance and database
const server = Fastify({ logger: true })

await server.register(swagger, {
    mode: 'static',
    specification: {
        path: './openapi.yaml',
        baseDir: process.cwd(),
    }
})

await server.register(swaggerUI, {
    routePrefix: '/docs', // URL where Swagger UI will be served
})

// Register CORS 
await server.register(cors, {
    origin: ['http://localhost:5000', 'https://127.0.0.1:5000']
})

// registering Routes
server.register(userRoutes, { prefix: '/api/users' })
server.register(authRoutes, { prefix: '/api/auth' })

server.get('/health', async (request, reply) => {
  return { status: 'ok' }
})
// register end;


// launching server on localhost
server.listen({
    port: 3000, 
    host: '127.0.0.1'
})

console.log("\x1b[32m%s\x1b[0m", "Server running on localhost:3000");

// Create admin and temp users if they don't exist
await initializeTempData();
