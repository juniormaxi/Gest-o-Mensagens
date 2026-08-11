import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1), JWT_SECRET: z.string().min(32), PORT: z.coerce.number().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  APP_URL: z.string().url().default('http://localhost:5173'), DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,3}$/).default('55'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config] Variáveis de ambiente inválidas ou ausentes:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`);
  process.exit(1);
}
export const env = parsed.data;
