
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT: string;
            JWT_SEC: string;
            COOKIE_SECRET: string;
            FRONTEND_URL: string;
            DATABASE_URL: string;
            // Email config
            EMAIL_FROM?: string;
            SENDGRID_API_KEY?: string;
            // Add other env vars
        }
    }
}

export { };
