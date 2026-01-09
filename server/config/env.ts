import { z } from 'zod';

const envSchema = z.object({
  // REQUIRED - no defaults, must be set
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  APP_URL: z.string().url('APP_URL must be a valid URL'),

  // REQUIRED_WITH_DEFAULT - has sensible defaults
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // OPTIONAL - graceful degradation
  RESEND_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
});

// Parse and validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Feature flags based on optional services
export const features = {
  email: !!env.RESEND_API_KEY,
  encryption: !!env.ENCRYPTION_KEY,
};

// Log feature status on startup
export function logFeatureStatus() {
  console.log('📋 Feature Status:');
  console.log(`  - Email: ${features.email ? '✅ Enabled' : '⚠️ Disabled (set RESEND_API_KEY)'}`);
  console.log(`  - Encryption: ${features.encryption ? '✅ Enabled' : '⚠️ Disabled (set ENCRYPTION_KEY)'}`);
}
