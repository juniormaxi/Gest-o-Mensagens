import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1), JWT_SECRET: z.string().min(32), PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:5173'), DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,3}$/).default('55'),
});
export const env = envSchema.parse(process.env);
