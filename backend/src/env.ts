import { z } from 'zod';

const envSchema = z.object({  // the following schema is to require certain vars in env to make it fail at startup

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000), // Safe to have a default
  DATABASE_URL: z.string(),
  JWT_SEC: z.string().min(32), // Enforce minimum length for security
  COOKIE_SECRET: z.string().min(32),

  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.coerce.number(),
  EMAIL_USER: z.email(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string(),

  // Frontend
  FRONTEND_URL: z.url(),

  // GitHub (Optional), only github auth fails 
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

// Validate process.env
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;